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
          path: `People('${person.UserName}')/Trips?$select=TripId,StartsAt,EndsAt`,
        });
        const trips = Array.isArray(tripsResp?.value) ? tripsResp.value
                    : Array.isArray(tripsResp)        ? tripsResp
                    : [];
        person.OnTravel = trips.some(t => {
          if (!t.StartsAt || !t.EndsAt) return false;
          return new Date(t.StartsAt) <= now && new Date(t.EndsAt) >= now;
        });
      } catch {
        person.OnTravel = false;
      }
    }));

    return Array.isArray(people) ? peopleArr : peopleArr[0];
  });
  this.on('READ', 'Trips',    req => TripPin.run(req.query));
  this.on('READ', 'Airlines', req => TripPin.run(req.query));

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

    // FA v4 §10.3: controleer of de Team Lead teamleden heeft in UserMapping
    // In development (dummy auth) slaan we deze check over
    if (localUserId && localUserId !== 'anonymous') {
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
        SELECT.from('primepath.UserMapping')
          .where({ TeamLeadUserName: teamLeadTripPin })
      );
      if (!teamMembers || teamMembers.length === 0) {
        return req.error(403,
          `Geen teamleden gevonden voor Team Lead '${teamLeadTripPin}'. ` +
          `Vraag de Travel Coördinator om jouw team in te stellen via UserMapping.`
        );
      }

      // Volledige eigenaarschapscheck (FV-24): hoort dit specifieke TripID bij een teamlid?
      // De vorige check bevestigde enkel dát er teamleden zijn, niet dat deze reis van hen is.
      const tripId = req.data?.TripID ?? _tripIdFromParams(req);
      const teamTripIds = await _collectTeamTripIds(TripPin, teamMembers);
      if (tripId === undefined || !teamTripIds.has(Number(tripId))) {
        return req.error(403,
          `Je mag de goedkeuringsstatus van reis ${tripId} niet aanpassen: ` +
          `deze reis hoort niet bij een lid van jouw team.`
        );
      }
    }
  });
});

// ── Hulpfuncties ─────────────────────────────────────────────────────────────

// Haal de TripID-sleutel uit het UPDATE-verzoek (req.data of req.params).
function _tripIdFromParams(req) {
  const p = req.params?.[req.params.length - 1];
  if (p === undefined || p === null) return undefined;
  return (typeof p === 'object') ? p.TripID : p;
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
