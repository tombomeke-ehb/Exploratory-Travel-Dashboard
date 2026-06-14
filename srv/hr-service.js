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

// ── In-memory cache voor airline-statistieken ────────────────────────────────
let _airlineStatsCache = null;
let _airlineStatsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

module.exports = cds.service.impl(async function () {
  const TripPin = await cds.connect.to('TripPinService');

  // ── READ: TripPin doorsturen ───────────────────────────────────────────────
  this.on('READ', 'People',   req => TripPin.run(req.query));
  this.on('READ', 'Trips',    req => TripPin.run(req.query));
  this.on('READ', 'Airlines', req => TripPin.run(req.query));
  this.on('READ', 'Airports', req => TripPin.run(req.query));

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

      for (const person of peopleArr.slice(0, SAMPLE_SIZE)) {
        try {
          const tripsResp = await TripPin.send({
            method: 'GET',
            path: `People('${person.UserName}')/Trips?$select=TripId,Budget`,
          });
          const trips = Array.isArray(tripsResp?.value) ? tripsResp.value
                      : Array.isArray(tripsResp)        ? tripsResp
                      : [];

          for (const trip of trips) {
            const tripAirlines = new Set();
            try {
              const planResp = await TripPin.send({
                method: 'GET',
                path: `People('${person.UserName}')/Trips(${trip.TripId})/PlanItems?$select=FlightNumber`,
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
            } catch { /* negeer PlanItems-fouten per trip */ }

            // V8: reisbudget toekennen aan elke airline in deze reis (set → geen dubbeltelling)
            const tripBudget = Number(trip.Budget?.Value ?? trip.Budget ?? 0) || 0;
            tripAirlines.forEach(code => { budgets[code] = (budgets[code] || 0) + tripBudget; });
          }
        } catch { /* negeer fouten per persoon */ }
      }
    } catch { /* fallback */ }

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
    const trips = await TripPin.run(SELECT.from('TripPinService.Trips'));
    const arr   = Array.isArray(trips) ? trips : (trips ? [trips] : []);

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
});
