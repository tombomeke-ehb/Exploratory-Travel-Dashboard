// ─────────────────────────────────────────────────────────────────────────────
// Team Dashboard Service – Custom handlers (Node.js)
//
// FA v4 §4.2 + §7.2 + §11 (rollenmatrix)
//
// Kritieke autorisatielogica (FV-24):
//   Een Team Lead mag ALLEEN de ApprovalStatus aanpassen van reizen
//   die behoren aan medewerkers van zijn/haar eigen team (via UserMapping).
//   Teamkoppeling gebeurt puur via TripPin-gebruikersnamen (geen BTP-afhankelijkheid).
//
// Handlers:
//   READ People/Trips/Airlines → doorsturen naar TripPin
//   UPDATE TravelExtensions    → teamcheck + veldbeperking
// ─────────────────────────────────────────────────────────────────────────────

const cds = require('@sap/cds');
const { collectAllTrips, collectTripsForPerson } = require('./trippin-trips');

module.exports = cds.service.impl(async function () {
  const TripPin = await cds.connect.to('TripPinService');

  // ── READ: TripPin doorsturen ───────────────────────────────────────────────
  // FV-22: People met OnTravel statusbadge
  this.on('READ', 'People', async (req) => {
    const people = await TripPin.run(req.query);
    const peopleArr = Array.isArray(people) ? people : (people ? [people] : []);
    if (peopleArr.length === 0) return people;

    const now = new Date();
    await Promise.all(peopleArr.map(async (person) => {
      try {
        const tripsResp = await TripPin.send({
          method: 'GET',
          path: `People('${person.UserName}')/Trips?$select=TripId,Name,StartsAt,EndsAt`,
        });
        const trips = Array.isArray(tripsResp?.value) ? tripsResp.value
                    : Array.isArray(tripsResp)        ? tripsResp
                    : [];
        person.OnTravel = trips.some(t => {
          if (!t.StartsAt || !t.EndsAt) return false;
          return new Date(t.StartsAt) <= now && new Date(t.EndsAt) >= now;
        });

        // FV-22: eerstvolgende reis = vroegste reis met StartsAt in de toekomst
        const upcoming = trips
          .filter(t => t.StartsAt && new Date(t.StartsAt) > now)
          .sort((a, b) => new Date(a.StartsAt) - new Date(b.StartsAt));
        if (upcoming.length > 0) {
          person.NextTripName = upcoming[0].Name ?? null;
          person.NextTripDate = upcoming[0].StartsAt;
        }
      } catch {
        person.OnTravel = false;
      }
    }));

    return Array.isArray(people) ? peopleArr : peopleArr[0];
  });
  this.on('READ', 'Airlines', req => TripPin.run(req.query));

  // Trips: TripPin heeft geen top-level /Trips → aggregeer via People-navigatie
  this.on('READ', 'Trips', async (req) => {
    const { trips, byId } = await collectAllTrips(TripPin);
    const keyParam = req.params?.[req.params.length - 1];
    const keyId    = (keyParam && typeof keyParam === 'object') ? keyParam.TripId : keyParam;
    if (keyId !== undefined && keyId !== null) {
      return byId.get(Number(keyId)) ?? null;
    }
    // People('x')/Trips navigatie -> enkel de reizen van die persoon
    const personParam = req.params?.find(p => p && typeof p === 'object' && p.UserName !== undefined);
    if (personParam?.UserName) {
      return await collectTripsForPerson(TripPin, personParam.UserName);
    }
    trips.$count = trips.length;
    return trips;
  });

  // ── FV-26: aantal openstaande goedkeuringen voor dit team ────────────────
  // Telt enkel Pending-reizen van teamleden die aan deze TeamLead gekoppeld zijn.
  this.on('getPendingCount', async (req) => {
    const localUserId = req.user?.id;

    // In development (dummy auth) of als geen localUserId: toon alle pending
    if (!localUserId || localUserId === 'anonymous') {
      const pending = await cds.run(
        SELECT.from('primepath.TravelExtensions').where({ ApprovalStatus: 'Pending' })
      );
      return Array.isArray(pending) ? pending.length : 0;
    }

    // Zoek TripPin-username op voor de ingelogde TeamLead
    const localUser = await cds.run(
      SELECT.one.from('primepath.Users').where({ username: localUserId })
    );
    const teamLeadTripPin = localUser?.tripPinUserName;
    if (!teamLeadTripPin) return 0;

    // Haal teamleden op via UserMapping (puur TripPin-gebruikersnamen)
    const teamMembers = await cds.run(
      SELECT.from('primepath.UserMapping').where({ TeamLeadUserName: teamLeadTripPin })
    );
    if (!teamMembers || teamMembers.length === 0) return 0;

    // FV-26: haal TripIDs op voor elk teamlid via TripPin-navigatie
    const teamTripIds = await _collectTeamTripIds(TripPin, teamMembers);

    if (teamTripIds.size === 0) return 0;

    // Tel enkel Pending-extensies van de TripIDs van dit team
    const pending = await cds.run(
      SELECT.from('primepath.TravelExtensions')
        .where({ ApprovalStatus: 'Pending', TripID: { in: [...teamTripIds] } })
    );
    return Array.isArray(pending) ? pending.length : 0;
  });

  // ── UPDATE TravelExtensions: alleen ApprovalStatus, alleen eigen team ──────
  // FA v4 §7.2 FV-24 + §11 rollenmatrix
  this.before('UPDATE', 'TravelExtensions', async (req) => {
    const localUserId = req.user?.id;

    // FV-25: Team Lead mag ALLEEN ApprovalStatus aanpassen
    const incomingFields = Object.keys(req.data).filter(f => f !== 'TripID');
    const forbidden = incomingFields.filter(f => f !== 'ApprovalStatus');
    if (forbidden.length > 0) {
      return req.error(403,
        `Een Team Lead mag enkel 'ApprovalStatus' aanpassen. ` +
        `Niet toegestane velden: ${forbidden.join(', ')}.`
      );
    }

    // Valideer ApprovalStatus waarde
    const { ApprovalStatus } = req.data;
    const allowed = ['Pending', 'Approved', 'Rejected'];
    if (ApprovalStatus && !allowed.includes(ApprovalStatus)) {
      return req.error(400,
        `ApprovalStatus '${ApprovalStatus}' is niet geldig. ` +
        `Gebruik: ${allowed.join(', ')}.`
      );
    }

    // FV-24: volledige teamcheck — hergebruikt door de Goedkeuren/Afkeuren-acties.
    const tripId = req.data?.TripID ?? _tripIdFromParams(req);
    await _assertTeamOwnership(req, tripId, TripPin);
  });

  // ── FV-24: Goedkeuren / Afkeuren als bound actions (één klik) ──────────────
  // Zelfde teamcheck als de UPDATE; zet de status direct op Approved/Rejected.
  this.on('goedkeuren', 'TravelExtensions', req => _setApprovalStatus(req, 'Approved', TripPin));
  this.on('afkeuren',  'TravelExtensions', req => _setApprovalStatus(req, 'Rejected', TripPin));
});

// ── Hulpfuncties ─────────────────────────────────────────────────────────────

// Haal de TripID-sleutel uit het UPDATE-verzoek (req.data of req.params).
function _tripIdFromParams(req) {
  const p = req.params?.[req.params.length - 1];
  if (p === undefined || p === null) return undefined;
  return (typeof p === 'object') ? p.TripID : p;
}

// Controleer of de ingelogde Team Lead de goedkeuringsstatus van deze TripID mag aanpassen.
// In development (dummy auth / anonymous) wordt de check overgeslagen.
// Registreert een 403 via req.error bij een schending.
async function _assertTeamOwnership(req, tripId, TripPin) {
  const localUserId = req.user?.id;
  if (!localUserId || localUserId === 'anonymous') return;

  const localUser = await cds.run(
    SELECT.one.from('primepath.Users').where({ username: localUserId })
  );
  const teamLeadTripPin = localUser?.tripPinUserName;
  if (!teamLeadTripPin) {
    return req.error(403,
      `Geen TripPin-gebruikersnaam geconfigureerd voor '${localUserId}'. ` +
      `Vraag de Travel Coördinator om jouw TripPin-gebruikersnaam in te stellen.`
    );
  }
  const teamMembers = await cds.run(
    SELECT.from('primepath.UserMapping').where({ TeamLeadUserName: teamLeadTripPin })
  );
  if (!teamMembers || teamMembers.length === 0) {
    return req.error(403,
      `Geen teamleden gevonden voor Team Lead '${teamLeadTripPin}'. ` +
      `Vraag de Travel Coördinator om jouw team in te stellen via UserMapping.`
    );
  }
  // Volledige eigenaarschapscheck (FV-24): hoort dit specifieke TripID bij een teamlid?
  const teamTripIds = await _collectTeamTripIds(TripPin, teamMembers);
  if (tripId === undefined || !teamTripIds.has(Number(tripId))) {
    return req.error(403,
      `Je mag de goedkeuringsstatus van reis ${tripId} niet aanpassen: ` +
      `deze reis hoort niet bij een lid van jouw team.`
    );
  }
}

// FV-24: zet de ApprovalStatus via een bound action, ná de teamcheck.
async function _setApprovalStatus(req, status, TripPin) {
  const tripId = _tripIdFromParams(req);
  await _assertTeamOwnership(req, tripId, TripPin);
  if (req.errors && req.errors.length) return;   // teamcheck registreerde een 403
  await cds.run(
    UPDATE('primepath.TravelExtensions').set({ ApprovalStatus: status }).where({ TripID: tripId })
  );
  return await cds.run(
    SELECT.one.from('primepath.TravelExtensions').where({ TripID: tripId })
  );
}

// Verzamel alle TripIDs die toebehoren aan de opgegeven teamleden, via TripPin-navigatie.
async function _collectTeamTripIds(TripPin, teamMembers) {
  const teamTripIds = new Set();
  await Promise.all(teamMembers.map(async (member) => {
    try {
      const tripsResp = await TripPin.send({
        method: 'GET',
        path: `People('${member.TripPinUserName}')/Trips?$select=TripId`,
      });
      const trips = Array.isArray(tripsResp?.value) ? tripsResp.value
                  : Array.isArray(tripsResp)        ? tripsResp
                  : [];
      trips.forEach(t => { if (t.TripId !== undefined) teamTripIds.add(Number(t.TripId)); });
    } catch (err) {
      cds.log('team-service').warn(
        `Kon trips van teamlid '${member.TripPinUserName}' niet ophalen:`, err.message
      );
    }
  }));
  return teamTripIds;
}
