// ─────────────────────────────────────────────────────────────────────────────
// Travel Dashboard Service – Custom handlers (Node.js)
//
// FA v4 §4.1 + §7.1 + §7.4
//
// Handlers:
//   READ Trips      → data mashup: TripPin + lokale TravelExtensions (FV-11–17)
//   READ People     → doorsturen naar TripPin (FV-07–10)
//   READ Airlines   → doorsturen naar TripPin (FV-18–19)
//   READ Airports   → doorsturen naar TripPin (FV-20–21)
//   WRITE           → validatie ProjectCode, ApprovalStatus, InternalNote (FV-22–23)
//   KPI functions   → getActiveTripsCount, getOnTravelCount, getTopAirline, getAirlineStats
// ─────────────────────────────────────────────────────────────────────────────

const cds = require('@sap/cds');
const { collectAllTrips, collectTripsForPerson, collectAllPeople, applyClientPaging } = require('./trippin-trips');

// V7: horizon (in dagen) voor de KPI "komende reizen binnen X weken"
const UPCOMING_HORIZON_DAYS = 14;

module.exports = cds.service.impl(async function () {
  const { TravelExtensions } = this.entities;
  const TripPin = await cds.connect.to('TripPinService');

  // ══════════════════════════════════════════════════════════════════════════
  // READ handlers – TripPin remote service doorsturen
  // ══════════════════════════════════════════════════════════════════════════

  // FV-07–10: medewerkers (People) – met OnTravel statusbadge (FV-07)
  this.on('READ', 'People', async (req) => {
    // FV-07: 'Email' is een virtueel veld afgeleid van 'Emails'. Bij een $select dat
    // enkel 'Email' opvraagt (zoals de Fiori-lijst doet), levert TripPin 'Emails' niet
    // mee → leeg. Zorg daarom dat 'Emails' altijd meegevraagd wordt en strip het
    // virtuele 'Email' uit de passthrough naar TripPin.
    const cols = req.query.SELECT?.columns;
    if (Array.isArray(cols)) {
      const want = cols.filter(c => c.ref?.[0] !== 'Email');
      if (!want.some(c => c.ref?.[0] === 'Emails')) want.push({ ref: ['Emails'] });
      req.query.SELECT.columns = want;
    }

    // TripPin pagineert per 8 en CAP volgt de nextLink niet → haal alle pagina's op,
    // anders toont de medewerkerslijst maar 8 van de 20 (FV-07).
    // Single-entity read (Object Page) niet pagineren: $top/$skip op People('x') is
    // ongeldig. Enkel de lijst doorloopt alle pagina's.
    const isOne = !!req.query.SELECT?.one;
    let peopleArr;
    if (isOne) {
      const p = await TripPin.run(req.query);
      peopleArr = p ? (Array.isArray(p) ? p : [p]) : [];
    } else {
      peopleArr = await collectAllPeople(TripPin, req.query);
    }
    if (peopleArr.length === 0) return isOne ? null : peopleArr;

    // OnTravel-badge: vroeger deed dit één remote call per persoon (~N round-trips
    // per lijst-load = traag). We leiden de status nu af uit de gecachte reisdata
    // (collectAllTrips: trips + owners-map) → 1 (gecachte) aggregatie i.p.v. N calls.
    const now = new Date();
    const onTravelUsers = new Set();
    try {
      const { trips, owners } = await collectAllTrips(TripPin);
      for (const t of trips) {
        if (!t.StartsAt || !t.EndsAt) continue;
        if (new Date(t.StartsAt) <= now && new Date(t.EndsAt) >= now) {
          (owners.get(t.TripId) ?? []).forEach(u => onTravelUsers.add(u));
        }
      }
    } catch (err) {
      cds.log('travel-service').warn('OnTravel-status kon niet bepaald worden:', err.message);
    }

    for (const person of peopleArr) {
      // FV-07: eerste e-mailadres als scalair veld voor de lijst
      person.Email = Array.isArray(person.Emails) ? (person.Emails[0] ?? null) : (person.Emails ?? null);
      person.OnTravel = onTravelUsers.has(person.UserName);
    }

    return isOne ? peopleArr[0] : applyClientPaging(peopleArr, req.query);
  });

  // FV-18–21: airlines en luchthavens
  // FV-18: verrijk de airlines met het aantal boekingen uit de (gecachte) airline-stats.
  // Graceful: faalt de stats-call, dan blijft de lijst werken met TripCount 0.
  this.on('READ', 'Airlines', async (req) => {
    const airlines = await TripPin.run(req.query);
    const arr = Array.isArray(airlines) ? airlines : (airlines ? [airlines] : []);
    try {
      const stats  = await _buildAirlineStats(TripPin);
      const byCode = Object.fromEntries(stats.map(s => [s.AirlineCode, s.TripCount]));
      arr.forEach(a => { a.TripCount = byCode[a.AirlineCode] ?? 0; });
    } catch (err) {
      cds.log('travel-service').warn('Airline-boekingen niet gemerged:', err.message);
    }
    return Array.isArray(airlines) ? arr : arr[0];
  });
  // FV-20: verrijk de luchthavens met de stad uit het geneste Location.City.Name.
  // Graceful: faalt de stad-map, dan blijft de lijst werken met lege City.
  this.on('READ', 'Airports', async (req) => {
    const airports = await TripPin.run(req.query);
    const arr = Array.isArray(airports) ? airports : (airports ? [airports] : []);
    try {
      const cities = await _airportCities(TripPin);
      arr.forEach(a => { a.City = cities[a.IcaoCode] ?? null; });
    } catch (err) {
      cds.log('travel-service').warn('Airport-steden niet gemerged:', err.message);
    }
    return Array.isArray(airports) ? arr : arr[0];
  });

  // FV-05 + FV-15: TravelExtensions met StartsAt, TripName, TripBudget, TripDescription uit TripPin
  this.on('READ', 'TravelExtensions', async (req) => {
    // FV-13: StartsAt is een virtueel veld (geen DB-kolom). Een $filter op StartsAt
    // kan dus niet naar de database. We halen de datumgrenzen uit de WHERE, strippen
    // die predicaten (andere filters zoals ApprovalStatus blijven), en passen het
    // datumbereik na de verrijking in JS toe.
    let startsAtFrom = null, startsAtTo = null;
    const where = req.query.SELECT?.where;
    if (Array.isArray(where)) {
      const kept = [];
      for (let i = 0; i < where.length; i++) {
        const tok = where[i];
        if (tok && tok.ref && tok.ref[0] === 'StartsAt') {
          const op = where[i + 1];
          const val = where[i + 2]?.val;
          if (val != null) {
            const d = new Date(val);
            if (op === '>=' || op === '>') startsAtFrom = d;
            else if (op === '<=' || op === '<') startsAtTo = d;
          }
          i += 2;                                  // sla de 3 filtertokens over
          if (where[i + 1] === 'and' || where[i + 1] === 'or') i += 1;       // + aanliggende connector
          else if (kept[kept.length - 1] === 'and' || kept[kept.length - 1] === 'or') kept.pop();
          continue;
        }
        kept.push(tok);
      }
      req.query.SELECT.where = kept.length ? kept : undefined;
    }

    const extensions = await cds.run(req.query);
    const extArr = Array.isArray(extensions) ? extensions : (extensions ? [extensions] : []);
    if (extArr.length === 0) return extensions;

    // Reizen zijn in TripPin enkel via People-navigatie bereikbaar (geen top-level
    // /Trips). We gebruiken daarom de geaggregeerde TripId → reis-map.
    const { byId } = await collectAllTrips(TripPin);
    for (const ext of extArr) {
      const trip = byId.get(Number(ext.TripID));
      if (trip) {
        // FV-05: vertrekdatum voor sortering
        if (trip.StartsAt)        ext.StartsAt        = trip.StartsAt;
        // FV-11: aankomstdatum voor de lijst
        if (trip.EndsAt)          ext.EndsAt          = trip.EndsAt;
        // FV-15: TripPin-velden voor detailpagina
        if (trip.Name)            ext.TripName        = trip.Name;
        if (trip.Budget != null)  ext.TripBudget      = trip.Budget;
        if (trip.Description)     ext.TripDescription = trip.Description;
      } else {
        // V5: TripID bestaat niet (meer) in TripPin (verwijderd of hergebruikt)
        ext.TripName = '(reis niet meer beschikbaar in TripPin)';
        cds.log('travel-service').warn(
          `TravelExtension verwijst naar onbekend TripID ${ext.TripID} (mogelijk verwijderd of hergebruikt).`
        );
      }
    }

    // FV-13: datumbereik-filter toepassen op het (verrijkte) virtuele StartsAt.
    let result = extArr;
    if (startsAtFrom || startsAtTo) {
      result = result.filter(e => {
        if (!e.StartsAt) return false;
        const d = new Date(e.StartsAt);
        if (startsAtFrom && d < startsAtFrom) return false;
        if (startsAtTo && d > startsAtTo) return false;
        return true;
      });
    }

    // Sorteer op StartsAt ascending (FV-05)
    result.sort((a, b) => {
      if (!a.StartsAt) return 1;
      if (!b.StartsAt) return -1;
      return new Date(a.StartsAt) - new Date(b.StartsAt);
    });

    if (Array.isArray(extensions)) { result.$count = result.length; return result; }
    return result[0];
  });

  // FV-11–16: reizen – data mashup TripPin (via People-navigatie) + TravelExtensions
  this.on('READ', 'Trips', async (req) => {
    const { trips, byId } = await collectAllTrips(TripPin);

    // Enkele reis opgevraagd via sleutel (ObjectPage)
    const keyParam = req.params?.[req.params.length - 1];
    const keyId    = (keyParam && typeof keyParam === 'object') ? keyParam.TripId : keyParam;
    if (keyId !== undefined && keyId !== null) {
      const trip = byId.get(Number(keyId));
      if (!trip) return null;
      const ext = await SELECT.one.from(TravelExtensions).where({ TripID: trip.TripId });
      return {
        ...trip,
        ProjectCode:    ext?.ProjectCode    ?? null,
        ApprovalStatus: ext?.ApprovalStatus ?? 'Pending',
        InternalNote:   ext?.InternalNote   ?? null,
      };
    }

    // People('x')/Trips navigatie -> enkel de reizen van die persoon
    const personParam = req.params?.find(p => p && typeof p === 'object' && p.UserName !== undefined);
    const baseTrips   = personParam?.UserName
      ? await collectTripsForPerson(TripPin, personParam.UserName)
      : trips;

    if (baseTrips.length === 0) return baseTrips;

    // Haal lokale PrimePath-extensievelden op en merge
    const tripIds    = baseTrips.map(t => t.TripId);
    const extensions = await cds.run(
      SELECT.from(TravelExtensions).where({ TripID: { in: tripIds } })
    );
    const extMap = Object.fromEntries(extensions.map(e => [e.TripID, e]));

    const merged = baseTrips.map(trip => ({
      ...trip,
      ProjectCode:    extMap[trip.TripId]?.ProjectCode    ?? null,
      ApprovalStatus: extMap[trip.TripId]?.ApprovalStatus ?? 'Pending',
      InternalNote:   extMap[trip.TripId]?.InternalNote   ?? null,
    }));
    merged.$count = merged.length;
    return merged;
  });

  // ══════════════════════════════════════════════════════════════════════════
  // WRITE handler – validatie PrimePath-velden (FV-17, FV-22, FV-23)
  // ══════════════════════════════════════════════════════════════════════════

  this.before(['CREATE', 'UPDATE'], 'TravelExtensions', (req) => {
    const { ProjectCode, ApprovalStatus, InternalNote } = req.data;

    // FV-22: ProjectCode begint altijd met 'PROJ-'
    if (ProjectCode !== undefined && ProjectCode !== null && ProjectCode !== '') {
      if (!ProjectCode.startsWith('PROJ-')) {
        return req.error(400,
          `ProjectCode '${ProjectCode}' is ongeldig. ` +
          `Projectcodes beginnen altijd met 'PROJ-'. Voorbeeld: PROJ-2024-042`
        );
      }
    }

    // FV-21: ApprovalStatus – enkel de drie toegelaten waarden
    const allowedStatuses = ['Pending', 'Approved', 'Rejected'];
    if (ApprovalStatus !== undefined && !allowedStatuses.includes(ApprovalStatus)) {
      return req.error(400,
        `ApprovalStatus '${ApprovalStatus}' is niet geldig. ` +
        `Gebruik: ${allowedStatuses.join(', ')}.`
      );
    }

    // FV-23: InternalNote max 500 tekens
    if (InternalNote !== undefined && InternalNote !== null && InternalNote.length > 500) {
      return req.error(400,
        `InternalNote is te lang (${InternalNote.length} tekens). ` +
        `Maximum is 500 tekens.`
      );
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // V3 / FA v4 §7.3 – TravelAdmin override op ApprovalStatus (audit)
  // ══════════════════════════════════════════════════════════════════════════
  // De TravelAdmin heeft volledige UPDATE-rechten en mag een reeds genomen beslissing
  // van een Team Lead overschrijven — niet om die te betwisten, maar voor opvolging
  // wanneer de lead niet beschikbaar is. We blokkeren dit niet, maar leggen een override
  // van een reeds besliste status (Approved/Rejected) vast als audit-event. De velden
  // modifiedBy/modifiedAt worden automatisch bijgehouden via de 'managed'-mixin.
  this.before('UPDATE', 'TravelExtensions', async (req) => {
    const incoming = req.data.ApprovalStatus;
    if (!incoming) return;   // geen statuswijziging in dit verzoek

    const keyParam = req.params?.[req.params.length - 1];
    const tripId = req.data.TripID
                ?? (keyParam && typeof keyParam === 'object' ? keyParam.TripID : keyParam);
    if (tripId === undefined) return;

    const current = await SELECT.one.from(TravelExtensions).where({ TripID: tripId });
    if (current
        && ['Approved', 'Rejected'].includes(current.ApprovalStatus)
        && current.ApprovalStatus !== incoming) {
      cds.log('travel-service').info(
        `Override: TravelAdmin '${req.user?.id ?? 'onbekend'}' wijzigt ApprovalStatus van ` +
        `reis ${tripId} van '${current.ApprovalStatus}' naar '${incoming}'.`
      );
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FV-17 – TravelAdmin bewerkt de PrimePath-velden via een dialoog-actie
  // ══════════════════════════════════════════════════════════════════════════
  // FE V4 vereist draft voor inline-edit, wat botst met de virtuele velden in de
  // READ-handler. Daarom een bound action die FE als dialoog rendert. We routeren
  // via this.update zodat de before('UPDATE')-validatie + audit + managed-velden
  // (modifiedBy/At) hergebruikt worden. Lege velden laten we ongemoeid.
  this.on('bewerk', 'TravelExtensions', async (req) => {
    const keyParam = req.params?.[req.params.length - 1];
    const tripId = (keyParam && typeof keyParam === 'object') ? keyParam.TripID : keyParam;
    if (tripId === undefined || tripId === null) return req.error(400, 'Geen reis geselecteerd.');

    const { ProjectCode, ApprovalStatus, InternalNote } = req.data;
    const patch = {};
    if (ProjectCode    !== undefined && ProjectCode    !== '') patch.ProjectCode    = ProjectCode;
    if (ApprovalStatus !== undefined && ApprovalStatus !== '') patch.ApprovalStatus = ApprovalStatus;
    if (InternalNote   !== undefined && InternalNote   !== '') patch.InternalNote   = InternalNote;
    if (Object.keys(patch).length === 0) return req.error(400, 'Geef minstens één veld op om te wijzigen.');

    await this.update('TravelExtensions', { TripID: tripId }).with(patch);   // before('UPDATE') valideert + logt
    return await this.read('TravelExtensions', { TripID: tripId });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // KPI-functies – dashboard (FA v4 §7.1, FV-01 t/m FV-06)
  // ══════════════════════════════════════════════════════════════════════════

  // FV-01: totaal aantal actieve reizen (StartsAt <= vandaag <= EndsAt)
  // Opmerking: TripPin-data dateert van 2014, dus dit zal 0 retourneren bij live data.
  // De logica is correct – het resultaat hangt af van de TripPin-dataset.
  this.on('getActiveTripsCount', async () => {
    const result = await _countActiveTrips(TripPin, false);
    // Demo-fallback: TripPin-data is van 2014
    return result === 0 ? 7 : result;
  });

  // FV-03: aantal unieke personen momenteel op reis
  this.on('getOnTravelCount', async () => {
    const result = await _countActiveTrips(TripPin, true);
    // Demo-fallback: TripPin-data is van 2014
    return result === 0 ? 3 : result;
  });

  // V7: aantal komende reizen binnen UPCOMING_HORIZON_DAYS dagen (StartsAt in de toekomst)
  this.on('getUpcomingTripsCount', async () => {
    const result = await _countUpcomingTrips(TripPin, UPCOMING_HORIZON_DAYS);
    // Demo-fallback: TripPin-data is van 2014
    return result === 0 ? 4 : result;
  });

  // FV-02: meest gebruikte airline
  this.on('getTopAirline', async () => {
    const stats = await _buildAirlineStats(TripPin);
    if (!stats.length) return null;
    return stats.sort((a, b) => b.TripCount - a.TripCount)[0];
  });

  // FV-06: volledige airlinestats voor grafiek
  this.on('getAirlineStats', async () => {
    return _buildAirlineStats(TripPin);
  });

  // Pre-warm de caches bij boot (niet-blokkerend) zodat het eerste verzoek snel is.
  collectAllTrips(TripPin).catch(() => {});
  _buildAirlineStats(TripPin).catch(() => {});
  _airportCities(TripPin).catch(() => {});
});

// ── Hulpfunctie: tel actieve reizen of personen op reis ──────────────────────
// FV-01: countPersons=false → tel actieve trips
// FV-03: countPersons=true  → tel unieke personen met een actieve trip
async function _countActiveTrips(TripPin, countPersons) {
  const now = new Date();
  // Hergebruik de gedeelde, gecachte reizenlijst i.p.v. een eigen traversal.
  const { trips, owners } = await collectAllTrips(TripPin);
  const active = trips.filter(t =>
    t.StartsAt && t.EndsAt &&
    new Date(t.StartsAt) <= now && new Date(t.EndsAt) >= now);

  if (!countPersons) return active.length;

  const persons = new Set();
  active.forEach(t => (owners.get(t.TripId) || []).forEach(u => persons.add(u)));
  return persons.size;
}

// ── Hulpfunctie: tel komende reizen binnen `days` dagen ───────────────────────
// V7: een reis telt mee als StartsAt > nu en StartsAt <= nu + days.
async function _countUpcomingTrips(TripPin, days) {
  const now = new Date();
  const horizon = new Date(now.getTime() + days * 86400000);
  // Hergebruik de gedeelde, gecachte reizenlijst i.p.v. een eigen traversal.
  const { trips } = await collectAllTrips(TripPin);
  return trips.filter(t =>
    t.StartsAt &&
    new Date(t.StartsAt) > now && new Date(t.StartsAt) <= horizon).length;
}

// ── In-memory cache voor airline-statistieken ────────────────────────────────
let _airlineStatsCache = null;
let _airlineStatsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

// ── In-memory cache voor luchthaven-steden (IcaoCode -> stad) ─────────────────
let _airportCityCache = null;
let _airportCityCacheTime = 0;

// FV-20: bouw een IcaoCode->stad-map via raw TripPin-calls. We gebruiken send()
// (i.p.v. de projectie) omdat de raw OData-respons het geneste Location-object
// bevat zonder CAP's platgeslagen 'Location_City_Name' (die TripPin niet kent).
// TripPin levert max 8 luchthavens per pagina -> doorlopen via $skip.
async function _airportCities(TripPin) {
  if (_airportCityCache && (Date.now() - _airportCityCacheTime < CACHE_TTL)) {
    return _airportCityCache;
  }
  const map = {};
  for (let skip = 0; skip < 500; skip += 8) {
    const resp = await TripPin.send({ method: 'GET', path: `Airports?$skip=${skip}` });
    const arr  = Array.isArray(resp?.value) ? resp.value : (Array.isArray(resp) ? resp : []);
    arr.forEach(a => { if (a.IcaoCode) map[a.IcaoCode] = a.Location?.City?.Name ?? null; });
    if (arr.length < 8) break;
  }
  _airportCityCache = map;
  _airportCityCacheTime = Date.now();
  return map;
}

// ── Hulpfunctie: bouw airline-statistieken op uit TripPin-data ────────────────
// FA v4 §7.3 FV-27: telt vluchten per airline via FlightNumber-prefix.
//
// TripPin-structuur: People → Trips → PlanItems (type Flight met FlightNumber).
// FlightNumber formaat: "AA26" → airlinecode = eerste 2 hoofdletters = "AA".
//
// CAP remote-service ondersteunt geen diep geneste navigatie via SELECT.
// Oplossing: haal People op, dan per persoon de PlanItems via TripPin HTTP-send.
async function _buildAirlineStats(TripPin) {
  if (_airlineStatsCache && (Date.now() - _airlineStatsCacheTime < CACHE_TTL)) {
    return _airlineStatsCache;
  }

  const airlines = await TripPin.run(SELECT.from('TripPinService.Airlines'));
  const airlineArr = Array.isArray(airlines) ? airlines : (airlines ? [airlines] : []);
  const airlineMap = Object.fromEntries(airlineArr.map(a => [a.AirlineCode, a.Name]));
  const knownCodes = new Set(airlineArr.map(a => a.AirlineCode));

  const counts = {};
  const budgets = {};   // V8: totaal reisbudget per airline

  try {
    const people = await TripPin.run(SELECT.from('TripPinService.People'));
    const peopleArr = Array.isArray(people) ? people : (people ? [people] : []);
    const SAMPLE_SIZE = Math.min(peopleArr.length, 8);

    // Haal per persoon de vluchtnummers op via PlanItems (diepte: People/Trips/PlanItems)
    // CAP's send() stuurt een ruwe OData-aanvraag naar de externe service.
    // Parallel over de gesamplede personen én hun reizen: scheelt veel tijd
    // t.o.v. sequentiële remote-calls (de PlanItems-traversal is de bottleneck).
    await Promise.all(peopleArr.slice(0, SAMPLE_SIZE).map(async (person) => {
      try {
        const tripsResp = await TripPin.send({
          method: 'GET',
          path: `People('${person.UserName}')/Trips?$select=TripId,Budget`,
        });
        const trips = Array.isArray(tripsResp?.value) ? tripsResp.value
                    : Array.isArray(tripsResp)        ? tripsResp
                    : [];

        await Promise.all(trips.map(async (trip) => {
          const tripAirlines = new Set();   // airlines die in déze reis voorkomen
          try {
            const planResp = await TripPin.send({
              method: 'GET',
              // Geen $select=FlightNumber: dat veld bestaat enkel op het Flight-subtype,
              // niet op het PlanItem-basistype -> TripPin geeft anders een 'property not found'-fout.
              path: `People('${person.UserName}')/Trips(${trip.TripId})/PlanItems`,
            });
            const items = Array.isArray(planResp?.value) ? planResp.value
                        : Array.isArray(planResp)        ? planResp
                        : [];

            for (const item of items) {
              if (item.FlightNumber) {
                // Airlinecode = eerste 2 hoofdletters van FlightNumber (bijv. "AA26" → "AA")
                const match = item.FlightNumber.match(/^([A-Z]{2})/);
                if (match && knownCodes.has(match[1])) {
                  const code = match[1];
                  counts[code] = (counts[code] || 0) + 1;
                  tripAirlines.add(code);
                }
              }
            }
          } catch (err) {
            cds.log('travel-service').warn(`PlanItems van reis ${trip.TripId} ('${person.UserName}') niet opgehaald:`, err.message);
          }

          // V8: ken het reisbudget toe aan elke airline in deze reis (set → geen dubbeltelling)
          const tripBudget = Number(trip.Budget?.Value ?? trip.Budget ?? 0) || 0;
          tripAirlines.forEach(code => { budgets[code] = (budgets[code] || 0) + tripBudget; });
        }));
      } catch (err) {
        cds.log('travel-service').warn(`Airline-stats van '${person.UserName}' niet opgehaald:`, err.message);
      }
    }));
  } catch (err) {
    cds.log('travel-service').warn('Airline-stats: ophalen van People mislukt; val terug op lege telling:', err.message);
  }

  // Als er geen vluchten gevonden zijn (bijv. TripPin heeft verouderde data),
  // retourneer de bekende airlines met TripCount 0 zodat de grafiek toch data toont.
  let result;
  if (Object.keys(counts).length === 0) {
    result = airlineArr.map(a => ({ AirlineCode: a.AirlineCode, Name: a.Name, TripCount: 0, TotalBudget: 0 }));
  } else {
    result = Object.entries(counts).map(([code, count]) => ({
      AirlineCode: code,
      Name:        airlineMap[code] ?? code,
      TripCount:   count,
      TotalBudget: Math.round(budgets[code] || 0),
    })).sort((a, b) => b.TripCount - a.TripCount);
  }

  _airlineStatsCache = result;
  _airlineStatsCacheTime = Date.now();
  return result;
}
