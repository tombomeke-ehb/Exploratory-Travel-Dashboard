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

module.exports = cds.service.impl(async function () {
  const TripPin = await cds.connect.to('TripPinService');

  // ── READ: TripPin doorsturen ───────────────────────────────────────────────
  this.on('READ', 'People',   req => TripPin.run(req.query));
  this.on('READ', 'Trips',    req => TripPin.run(req.query));
  this.on('READ', 'Airlines', req => TripPin.run(req.query));
  this.on('READ', 'Airports', req => TripPin.run(req.query));

  // ── FV-27: airline-statistieken voor grafiek ──────────────────────────────
  this.on('getAirlineStats', async () => {
    const [trips, airlines] = await Promise.all([
      TripPin.run(SELECT.from('TripPinService.Trips')),
      TripPin.run(SELECT.from('TripPinService.Airlines')),
    ]);

    const tripArr    = Array.isArray(trips)    ? trips    : (trips    ? [trips]    : []);
    const airlineArr = Array.isArray(airlines) ? airlines : (airlines ? [airlines] : []);

    const airlineMap = Object.fromEntries(airlineArr.map(a => [a.AirlineCode, a.Name]));

    // Tel reizen per airline via Tags-veld (2-letter IATA-codes)
    const counts = {};
    for (const trip of tripArr) {
      const tags = Array.isArray(trip.Tags) ? trip.Tags : [];
      for (const tag of tags) {
        if (/^[A-Z]{2}$/.test(tag)) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      }
    }

    return Object.entries(counts)
      .map(([code, count]) => ({
        AirlineCode: code,
        Name:        airlineMap[code] ?? code,
        TripCount:   count,
      }))
      .sort((a, b) => b.TripCount - a.TripCount);
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
