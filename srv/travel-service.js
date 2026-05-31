// ─────────────────────────────────────────────────────────────────────────────
// Travel Dashboard Service – Custom handlers (Node.js)
//
// Verantwoordelijk voor:
//   1. READ  – TripPin-data + eigen TravelExtensions samenvoegen (data mashup)
//   2. WRITE – Validatie van eigen velden (ProjectCode, ApprovalStatus, InternalNote)
// ─────────────────────────────────────────────────────────────────────────────

const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
  const { TravelExtensions } = this.entities;
  const TripPin = await cds.connect.to('TripPinService');

  // ── READ Trips: haal TripPin-data op en merge met lokale TravelExtensions ──
  this.on('READ', 'Trips', async (req) => {
    // Haal reizen op uit TripPin (externe remote service)
    const trips = await TripPin.run(req.query);

    if (!trips || trips.length === 0) return trips;

    // Haal bijbehorende TravelExtensions op uit lokale DB
    const tripIds = trips.map(t => t.TripId).filter(Boolean);
    const extensions = await cds.run(
      SELECT.from(TravelExtensions).where({ TripID: { in: tripIds } })
    );

    // Merge: voeg extensievelden toe aan elk TripPin-object
    const extMap = Object.fromEntries(extensions.map(e => [e.TripID, e]));
    return trips.map(trip => ({
      ...trip,
      ProjectCode:    extMap[trip.TripId]?.ProjectCode    ?? null,
      ApprovalStatus: extMap[trip.TripId]?.ApprovalStatus ?? 'Pending',
      InternalNote:   extMap[trip.TripId]?.InternalNote   ?? null,
    }));
  });

  // ── READ People: doorsturen naar TripPin ──────────────────────────────────
  this.on('READ', 'People',   req => TripPin.run(req.query));
  this.on('READ', 'Airlines', req => TripPin.run(req.query));
  this.on('READ', 'Airports', req => TripPin.run(req.query));

  // ── WRITE TravelExtensions: validatie (FV-17, FV-22, FV-23) ──────────────
  this.before(['CREATE', 'UPDATE'], 'TravelExtensions', (req) => {
    const { ProjectCode, ApprovalStatus, InternalNote } = req.data;

    // FV-22: ProjectCode moet beginnen met 'PROJ-'
    if (ProjectCode !== undefined && ProjectCode !== null && ProjectCode !== '') {
      if (!ProjectCode.startsWith('PROJ-')) {
        return req.error(400, `ProjectCode '${ProjectCode}' moet beginnen met 'PROJ-'. Voorbeeld: PROJ-2024-042`);
      }
    }

    // FV-21: ApprovalStatus enkel toegelaten waarden
    const allowedStatuses = ['Pending', 'Approved', 'Rejected'];
    if (ApprovalStatus !== undefined && !allowedStatuses.includes(ApprovalStatus)) {
      return req.error(400, `ApprovalStatus '${ApprovalStatus}' is niet geldig. Gebruik: ${allowedStatuses.join(', ')}.`);
    }

    // FV-23: InternalNote max 500 tekens
    if (InternalNote && InternalNote.length > 500) {
      return req.error(400, `InternalNote mag maximaal 500 tekens bevatten (huidig: ${InternalNote.length}).`);
    }
  });
});
