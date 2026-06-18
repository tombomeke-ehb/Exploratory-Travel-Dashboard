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
const { collectAllTrips, collectTripsForPerson, collectAllPeople, applyClientPaging, applyClientQuery } = require('./trippin-trips');

module.exports = cds.service.impl(async function () {
  const TripPin = await cds.connect.to('TripPinService');

  // ── READ: TripPin doorsturen ───────────────────────────────────────────────
  // FV-22: People met OnTravel statusbadge
  const PEOPLE_VIRTUAL_FIELDS = new Set(['OnTravel', 'NextTripName', 'NextTripDate']);

  this.on('READ', 'People', async (req) => {
    // TripPin pagineert per 8 → haal alle pagina's op, anders mist het teamfilter
    // teamleden die voorbij de eerste pagina staan (FV-22).
    const isOne = !!req.query.SELECT?.one;

    // Strip virtual fields uit de query voordat we die naar TripPin sturen;
    // TripPin kent OnTravel/NextTripName/NextTripDate niet.
    const sel = req.query.SELECT;
    const savedWhere   = sel?.where;
    const savedOrderBy = sel?.orderBy;
    const savedSearch  = sel?.search;
    const savedColumns = sel?.columns;
    if (sel) {
      if (Array.isArray(sel.where))   sel.where   = sel.where.filter(t => !t?.ref || !PEOPLE_VIRTUAL_FIELDS.has(t.ref[0]));
      if (Array.isArray(sel.orderBy)) sel.orderBy  = sel.orderBy.filter(o => !o?.ref || !PEOPLE_VIRTUAL_FIELDS.has(o.ref[0]));
      if (Array.isArray(sel.columns)) sel.columns  = sel.columns.filter(c => !c?.ref || !PEOPLE_VIRTUAL_FIELDS.has(c.ref[0]));
      sel.search = undefined;
    }

    let peopleArr;
    if (isOne) {
      const p = await TripPin.run(req.query);
      peopleArr = p ? (Array.isArray(p) ? p : [p]) : [];
    } else {
      peopleArr = await collectAllPeople(TripPin, req.query);
    }

    // Herstel de originele query voor client-side filtering na verrijking
    if (sel) {
      sel.where   = savedWhere;
      sel.orderBy = savedOrderBy;
      sel.search  = savedSearch;
      sel.columns = savedColumns;
    }
    if (peopleArr.length === 0) return isOne ? null : peopleArr;

    // Teamfiltering (TA §7.2 / FA §4.2): een Team Lead ziet enkel de eigen teamleden.
    // In development (dummy-auth) is `team` null → geen filter, alles zichtbaar.
    const team = await _resolveTeamUserNames(req);
    if (team) peopleArr = peopleArr.filter(p => team.has(p.UserName));
    if (peopleArr.length === 0) return isOne ? null : peopleArr;

    const now = new Date();
    const DEMO_ON_TRAVEL = new Set(['russellwhyte', 'scottketchum', 'ronaldmundy']);
    let anyOnTravel = false;

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
        if (person.OnTravel) anyOnTravel = true;

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

    // Demo-fallback: TripPin-data is van 2014 → geen actieve reizen gevonden.
    if (!anyOnTravel) {
      peopleArr.forEach(p => { p.OnTravel = DEMO_ON_TRAVEL.has(p.UserName); });
    }

    if (isOne) return peopleArr[0];
    const queried = applyClientQuery(peopleArr, req.query);
    return applyClientPaging(queried, req.query);
  });
  this.on('READ', 'Airlines', req => TripPin.run(req.query));

  // Trips: TripPin heeft geen top-level /Trips → aggregeer via People-navigatie
  this.on('READ', 'Trips', async (req) => {
    const { trips, byId, owners } = await collectAllTrips(TripPin);
    const keyParam = req.params?.[req.params.length - 1];
    const keyId    = (keyParam && typeof keyParam === 'object') ? keyParam.TripId : keyParam;
    if (keyId !== undefined && keyId !== null) {
      return byId.get(Number(keyId)) ?? null;
    }
    // People('x')/Trips navigatie -> enkel de reizen van die persoon
    const personParam = req.params?.find(p => p && typeof p === 'object' && p.UserName !== undefined);
    if (personParam?.UserName) {
      const personTrips = await collectTripsForPerson(TripPin, personParam.UserName);
      const filtered = applyClientQuery(personTrips, req.query);
      return applyClientPaging(filtered, req.query);
    }

    // Teamfiltering (TA §7.2 / FA §4.2): enkel reizen van eigen teamleden.
    // `owners` (TripId → Set<UserName>) uit de cache, dus geen extra remote calls.
    const team = await _resolveTeamUserNames(req);
    let list = trips;
    if (team) {
      list = trips.filter(t => {
        const ow = owners.get(t.TripId);
        return ow && [...ow].some(u => team.has(u));
      });
    }
    list = applyClientQuery(list, req.query);
    list = applyClientPaging(list, req.query);
    return list;
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

  // ── CREATE / DELETE TravelExtensions: verboden voor TeamLead ──────────────
  // FA v4 §11 rollenmatrix: TeamLead mag enkel ApprovalStatus aanpassen, niet aanmaken/verwijderen.
  this.before(['CREATE', 'DELETE'], 'TravelExtensions', (req) => {
    return req.error(403,
      'Een Team Lead mag reisextensies niet aanmaken of verwijderen. ' +
      'Gebruik de Goedkeuren- of Afkeuren-knop om de status te wijzigen.'
    );
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

  // ── READ TravelExtensions: teamfiltering + StatusLabel vullen ───────────────
  this.on('READ', 'TravelExtensions', async (req) => {
    // Strip $search uit de DB-query: StatusLabel is virtueel en wordt pas na
    // de query ingevuld, dus $search moet client-side draaien zodat zoeken
    // op zowel "Pending" als "In behandeling" werkt.
    const savedSearch = req.query.SELECT?.search;
    if (req.query.SELECT) req.query.SELECT.search = undefined;

    const result = await cds.run(req.query);
    const statusMap = { Pending: 'In behandeling', Approved: 'Goedgekeurd', Rejected: 'Afgekeurd' };
    const fill = e => { e.StatusLabel = statusMap[e.ApprovalStatus] ?? e.ApprovalStatus; return e; };
    if (!Array.isArray(result)) {
      if (result) fill(result);
      return result;
    }

    let list = result;

    const team = await _resolveTeamUserNames(req);
    if (team) {
      const teamTripIds = await _collectTeamTripIds(TripPin,
        [...team].map(u => ({ TripPinUserName: u }))
      );
      list = list.filter(e => teamTripIds.has(Number(e.TripID)));
    }

    list.forEach(fill);

    // Client-side $search na verrijking (zoekt ook door StatusLabel)
    if (savedSearch) {
      if (req.query.SELECT) req.query.SELECT.search = savedSearch;
      list = applyClientQuery(list, req.query);
    }

    list.$count = list.length;
    return list;
  });

  // ── FV-24: Goedkeuren / Afkeuren als bound actions (één klik) ──────────────
  // Zelfde teamcheck als de UPDATE; zet de status direct op Approved/Rejected.
  this.on('goedkeuren',    'TravelExtensions', req => _setApprovalStatus(req, 'Approved', TripPin));
  this.on('afkeuren',      'TravelExtensions', req => _setApprovalStatus(req, 'Rejected', TripPin));
  this.on('inBehandeling', 'TravelExtensions', req => _setApprovalStatus(req, 'Pending',  TripPin));

  // Pre-warm de gedeelde reizen-cache bij boot (niet-blokkerend).
  collectAllTrips(TripPin).catch(() => {});
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
  const rec = await cds.run(
    SELECT.one.from('primepath.TravelExtensions').where({ TripID: tripId })
  );
  if (rec) {
    const statusMap = { Pending: 'In behandeling', Approved: 'Goedgekeurd', Rejected: 'Afgekeurd' };
    rec.StatusLabel = statusMap[rec.ApprovalStatus] ?? rec.ApprovalStatus;
  }
  return rec;
}

// Resolve de TripPin-UserNames van het team van de ingelogde TeamLead.
// Retourneert een Set<UserName> om READ People/Trips op te filteren (TA §7.2, FA §4.2),
// of `null` in development (dummy-auth / anonymous) zodat lokaal alles zichtbaar blijft.
async function _resolveTeamUserNames(req) {
  const localUserId = req.user?.id;
  if (!localUserId || localUserId === 'anonymous') return null;   // dev: geen filter

  const localUser = await cds.run(
    SELECT.one.from('primepath.Users').where({ username: localUserId })
  );
  const teamLeadTripPin = localUser?.tripPinUserName;
  if (!teamLeadTripPin) return new Set();   // account zonder TripPin-koppeling → leeg team

  const teamMembers = await cds.run(
    SELECT.from('primepath.UserMapping').where({ TeamLeadUserName: teamLeadTripPin })
  );
  return new Set((teamMembers || []).map(m => m.TripPinUserName));
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
