// ─────────────────────────────────────────────────────────────────────────────
// HR Dashboard Service – Custom handlers (Node.js)
//
// Stuurt alle TripPin-reads door naar de remote TripPinService.
// Zonder deze handler probeert CAP de entiteiten lokaal in SQLite te zoeken,
// wat mislukt omdat het externe entiteiten zijn.
// ─────────────────────────────────────────────────────────────────────────────

const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
  const TripPin = await cds.connect.to('TripPinService');

  this.on('READ', 'People',           req => TripPin.run(req.query));
  this.on('READ', 'Trips',            req => TripPin.run(req.query));
  this.on('READ', 'Airlines',         req => TripPin.run(req.query));
  this.on('READ', 'Airports',         req => TripPin.run(req.query));
});
