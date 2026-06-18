// ─────────────────────────────────────────────────────────────────────────────
// HR Dashboard Service – Custom handlers (Node.js)
//
// FA v4 §4.3 + §7.3
//
// Handlers:
//   READ People/Trips/Airlines/Airports → doorsturen naar TripPin remote service
//   getAirlineStats                     → FV-27: airline-gebruik voor grafiek
//   getTripCountByPeriod                → FV-28: aantal reizen in periode
// ─────────────────────────────────────────────────────────────────────────────

const cds = require('@sap/cds');
const { collectAllTrips, collectTripsForPerson, collectAllPeople, applyClientPaging, applyClientQuery } = require('./trippin-trips');

// ── In-memory cache voor airline-statistieken ────────────────────────────────
let _airlineStatsCache = null;
let _airlineStatsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

module.exports = cds.service.impl(async function () {
  const TripPin = await cds.connect.to('TripPinService');

  // ── READ: TripPin doorsturen ───────────────────────────────────────────────
  // FV-29: alle medewerkers (TripPin pagineert per 8; haal alle pagina's op).
  this.on('READ', 'People', async (req) => {
    if (req.query?.SELECT?.one) return TripPin.run(req.query);   // detail (1 record)
    const all = await collectAllPeople(TripPin, req.query);
    return applyClientPaging(all, req.query);
  });
  this.on('READ', 'Airports', async (req) => {
    const airports = await TripPin.run(req.query);
    const arr = Array.isArray(airports) ? airports : (airports ? [airports] : []);
    try {
      const cities = await _airportCities(TripPin);
      arr.forEach(a => { a.City = cities[a.IcaoCode] ?? null; });
    } catch (err) {
      cds.log('hr-service').warn('Airport-steden niet gemerged:', err.message);
    }
    return Array.isArray(airports) ? arr : arr[0];
  });
  // FV-18: verrijk de airlines met het aantal boekingen uit de (gecachte) airline-stats.
  // Graceful: faalt de stats-call, dan blijft de lijst werken met TripCount 0.
  this.on('READ', 'Airlines', async (req) => {
    const airlines = await TripPin.run(req.query);
    const arr = Array.isArray(airlines) ? airlines : (airlines ? [airlines] : []);
    try {
      const stats  = await this.send('getAirlineStats');
      const byCode = Object.fromEntries((stats || []).map(s => [s.AirlineCode, s.TripCount]));
      arr.forEach(a => { a.TripCount = byCode[a.AirlineCode] ?? 0; });
    } catch (err) {
      cds.log('hr-service').warn('Airline-boekingen niet gemerged:', err.message);
    }
    return Array.isArray(airlines) ? arr : arr[0];
  });

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
      const personTrips = await collectTripsForPerson(TripPin, personParam.UserName);
      const filtered = applyClientQuery(personTrips, req.query);
      return applyClientPaging(filtered, req.query);
    }
    let list = applyClientQuery(trips, req.query);
    list = applyClientPaging(list, req.query);
    return list;
  });

  // ── READ TravelExtensions: StatusLabel vullen ────────────────────────────
  this.on('READ', 'TravelExtensions', async (req) => {
    const result = await cds.run(req.query);
    const statusMap = { Pending: 'In behandeling', Approved: 'Goedgekeurd', Rejected: 'Afgekeurd' };
    const fill = e => { e.StatusLabel = statusMap[e.ApprovalStatus] ?? e.ApprovalStatus; return e; };
    if (Array.isArray(result)) { result.forEach(fill); return result; }
    if (result) fill(result);
    return result;
  });

  // ── FV-27: airline-statistieken voor grafiek ──────────────────────────────
  // Telt vluchten per airline via FlightNumber-prefix in PlanItems.
  // FlightNumber formaat: "AA26" → airlinecode = "AA".
  this.on('getAirlineStats', async () => {
    if (_airlineStatsCache && (Date.now() - _airlineStatsCacheTime < CACHE_TTL)) {
      return _airlineStatsCache;
    }

    const airlines   = await TripPin.run(SELECT.from('TripPinService.Airlines'));
    const airlineArr = Array.isArray(airlines) ? airlines : (airlines ? [airlines] : []);
    const airlineMap = Object.fromEntries(airlineArr.map(a => [a.AirlineCode, a.Name]));
    const knownCodes = new Set(airlineArr.map(a => a.AirlineCode));

    const counts = {};
    const budgets = {};   // V8: totaal reisbudget per airline

    try {
      const people    = await TripPin.run(SELECT.from('TripPinService.People'));
      const peopleArr = Array.isArray(people) ? people : (people ? [people] : []);
      const SAMPLE_SIZE = Math.min(peopleArr.length, 8);

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
            const tripAirlines = new Set();
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
                  const match = item.FlightNumber.match(/^([A-Z]{2})/);
                  if (match && knownCodes.has(match[1])) {
                    counts[match[1]] = (counts[match[1]] || 0) + 1;
                    tripAirlines.add(match[1]);
                  }
                }
              }
            } catch (err) {
              cds.log('hr-service').warn(`PlanItems van reis ${trip.TripId} ('${person.UserName}') niet opgehaald:`, err.message);
            }

            // V8: reisbudget toekennen aan elke airline in deze reis (set → geen dubbeltelling)
            const tripBudget = Number(trip.Budget?.Value ?? trip.Budget ?? 0) || 0;
            tripAirlines.forEach(code => { budgets[code] = (budgets[code] || 0) + tripBudget; });
          }));
        } catch (err) {
          cds.log('hr-service').warn(`Airline-stats van '${person.UserName}' niet opgehaald:`, err.message);
        }
      }));
    } catch (err) {
      cds.log('hr-service').warn('Airline-stats: ophalen van People mislukt; val terug op lege telling:', err.message);
    }

    let result;
    if (Object.keys(counts).length === 0) {
      result = airlineArr.map(a => ({ AirlineCode: a.AirlineCode, Name: a.Name, TripCount: 0, TotalBudget: 0 }));
    } else {
      result = Object.entries(counts)
        .map(([code, count]) => ({
          AirlineCode: code,
          Name:        airlineMap[code] ?? code,
          TripCount:   count,
          TotalBudget: Math.round(budgets[code] || 0),
        }))
        .sort((a, b) => b.TripCount - a.TripCount);
    }

    _airlineStatsCache = result;
    _airlineStatsCacheTime = Date.now();
    return result;
  });

  // ── FV-28: aantal reizen in een periode ───────────────────────────────────
  this.on('getTripCountByPeriod', async (req) => {
    const { from, to } = req.data;

    // Valideer de (optionele) datumparameters: een opgegeven waarde moet een geldige datum zijn.
    if ((from != null && isNaN(new Date(from))) || (to != null && isNaN(new Date(to)))) {
      return req.error(400, 'Ongeldige datumparameters: gebruik een geldige datum (ISO 8601).');
    }

    // TripPin heeft geen top-level Trips-entiteitset: gebruik de gedeelde
    // aggregatie (reizen via People-navigatie), net als de Trips-READ-handler.
    const { trips: arr } = await collectAllTrips(TripPin);

    const fromDate = from ? new Date(from) : null;
    const toDate   = to   ? new Date(to)   : null;

    return arr.filter(t => {
      if (!t.StartsAt) return false;
      const start = new Date(t.StartsAt);
      if (fromDate && start < fromDate) return false;
      if (toDate   && start > toDate)   return false;
      return true;
    }).length;
  });

  // Pre-warm de caches bij boot (niet-blokkerend) zodat het eerste verzoek snel is.
  collectAllTrips(TripPin).catch(() => {});
  this.send('getAirlineStats').catch(() => {});
  _airportCities(TripPin).catch(() => {});
});

let _airportCityCache = null;
let _airportCityCacheTime = 0;

async function _airportCities(TripPin) {
  if (_airportCityCache && (Date.now() - _airportCityCacheTime < CACHE_TTL)) {
    return _airportCityCache;
  }
  const map = {};
  let skip = 0;
  while (true) {
    const resp = await TripPin.send({ method: 'GET', path: `Airports?$skip=${skip}` });
    const items = Array.isArray(resp?.value) ? resp.value : Array.isArray(resp) ? resp : [];
    if (items.length === 0) break;
    items.forEach(a => { if (a.IcaoCode) map[a.IcaoCode] = a.Location?.City?.Name ?? null; });
    skip += items.length;
    if (!resp?.value || items.length < 20) break;
  }
  _airportCityCache = map;
  _airportCityCacheTime = Date.now();
  return map;
}
