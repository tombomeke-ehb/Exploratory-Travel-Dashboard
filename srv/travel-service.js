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

module.exports = cds.service.impl(async function () {
  const { TravelExtensions } = this.entities;
  const TripPin = await cds.connect.to('TripPinService');

  // ══════════════════════════════════════════════════════════════════════════
  // READ handlers – TripPin remote service doorsturen
  // ══════════════════════════════════════════════════════════════════════════

  // FV-07–10: medewerkers (People)
  this.on('READ', 'People',   req => TripPin.run(req.query));

  // FV-18–21: airlines en luchthavens
  this.on('READ', 'Airlines', req => TripPin.run(req.query));
  this.on('READ', 'Airports', req => TripPin.run(req.query));

  // FV-11–16: reizen – data mashup TripPin + TravelExtensions
  this.on('READ', 'Trips', async (req) => {
    const trips = await TripPin.run(req.query);
    if (!trips || trips.length === 0) return trips;

    // Normaliseer: TripPin geeft soms een object terug (bij single-record GET)
    const tripArray = Array.isArray(trips) ? trips : [trips];
    const tripIds   = tripArray.map(t => t.TripId).filter(id => id !== undefined);

    if (tripIds.length === 0) return trips;

    // Haal lokale PrimePath-extensievelden op
    const extensions = await cds.run(
      SELECT.from(TravelExtensions).where({ TripID: { in: tripIds } })
    );
    const extMap = Object.fromEntries(extensions.map(e => [e.TripID, e]));

    // Merge TripPin-data met PrimePath-velden
    const merged = tripArray.map(trip => ({
      ...trip,
      ProjectCode:    extMap[trip.TripId]?.ProjectCode    ?? null,
      ApprovalStatus: extMap[trip.TripId]?.ApprovalStatus ?? 'Pending',
      InternalNote:   extMap[trip.TripId]?.InternalNote   ?? null,
    }));

    // Geef terug in zelfde vorm als input (object of array)
    return Array.isArray(trips) ? merged : merged[0];
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
  // KPI-functies – dashboard (FA v4 §7.1, FV-01 t/m FV-06)
  // ══════════════════════════════════════════════════════════════════════════

  // FV-01: totaal aantal actieve reizen (StartsAt <= nu <= EndsAt)
  this.on('getActiveTripsCount', async () => {
    const now   = new Date().toISOString();
    const trips = await TripPin.run(SELECT.from('TripPinService.Trips'));
    if (!trips) return 0;
    const arr   = Array.isArray(trips) ? trips : [trips];
    return arr.filter(t =>
      t.StartsAt && t.EndsAt &&
      new Date(t.StartsAt) <= new Date(now) &&
      new Date(t.EndsAt)   >= new Date(now)
    ).length;
  });

  // FV-03: aantal unieke personen momenteel op reis
  this.on('getOnTravelCount', async () => {
    const now   = new Date().toISOString();
    const trips = await TripPin.run(SELECT.from('TripPinService.Trips'));
    if (!trips) return 0;
    const arr   = Array.isArray(trips) ? trips : [trips];
    const active = arr.filter(t =>
      t.StartsAt && t.EndsAt &&
      new Date(t.StartsAt) <= new Date(now) &&
      new Date(t.EndsAt)   >= new Date(now)
    );
    // TripPin-stub heeft geen PersonID op Trips → gebruik aantal actieve trips als proxy
    return active.length;
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
});

// ── Hulpfunctie: bouw airline-statistieken op uit TripPin-data ────────────────
// FA v4 §7.3 FV-27: telt aantal reizen per airline op basis van Tags-veld
// (TripPin-trips bevatten airline-codes in het Tags-array)
async function _buildAirlineStats(TripPin) {
  const [trips, airlines] = await Promise.all([
    TripPin.run(SELECT.from('TripPinService.Trips')),
    TripPin.run(SELECT.from('TripPinService.Airlines')),
  ]);

  const tripArr    = Array.isArray(trips)    ? trips    : (trips    ? [trips]    : []);
  const airlineArr = Array.isArray(airlines) ? airlines : (airlines ? [airlines] : []);

  // Bouw een lookup: AirlineCode → Name
  const airlineMap = Object.fromEntries(airlineArr.map(a => [a.AirlineCode, a.Name]));

  // Tel trips per airlinecode via Tags (TripPin encodeert airlines in Tags)
  const counts = {};
  for (const trip of tripArr) {
    const tags = Array.isArray(trip.Tags) ? trip.Tags : [];
    for (const tag of tags) {
      // Airlinecodes zijn 2-letter hoofdletters (bijv. 'AA', 'UA', 'BA')
      if (/^[A-Z]{2}$/.test(tag)) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
  }

  return Object.entries(counts).map(([code, count]) => ({
    AirlineCode: code,
    Name:        airlineMap[code] ?? code,
    TripCount:   count,
  })).sort((a, b) => b.TripCount - a.TripCount);
}
