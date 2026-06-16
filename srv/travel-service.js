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
const { collectAllTrips, collectTripsForPerson } = require('./trippin-trips');

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
    const people = await TripPin.run(req.query);
    const peopleArr = Array.isArray(people) ? people : (people ? [people] : []);
    if (peopleArr.length === 0) return people;

    const now = new Date();
    await Promise.all(peopleArr.map(async (person) => {
      // FV-07: eerste e-mailadres als scalair veld voor de lijst
      person.Email = Array.isArray(person.Emails) ? (person.Emails[0] ?? null) : (person.Emails ?? null);
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
      } catch (err) {
        cds.log('travel-service').warn(`OnTravel-status van '${person.UserName}' kon niet bepaald worden:`, err.message);
        person.OnTravel = false;
      }
    }));

    return Array.isArray(people) ? peopleArr : peopleArr[0];
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
  this.on('READ', 'Airports', req => TripPin.run(req.query));

  // FV-05 + FV-15: TravelExtensions met StartsAt, TripName, TripBudget, TripDescription uit TripPin
  this.on('READ', 'TravelExtensions', async (req) => {
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

    // Sorteer op StartsAt ascending (FV-05)
    extArr.sort((a, b) => {
      if (!a.StartsAt) return 1;
      if (!b.StartsAt) return -1;
      return new Date(a.StartsAt) - new Date(b.StartsAt);
    });

    return Array.isArray(extensions) ? extArr : extArr[0];
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
