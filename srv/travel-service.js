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
// FA v4 §7.3 FV-27: telt vluchten per airline via FlightNumber-prefix.
//
// TripPin-structuur: People → Trips → PlanItems (type Flight met FlightNumber).
// FlightNumber formaat: "AA26" → airlinecode = eerste 2 hoofdletters = "AA".
//
// CAP remote-service ondersteunt geen diep geneste navigatie via SELECT.
// Oplossing: haal People op, dan per persoon de PlanItems via TripPin HTTP-send.
async function _buildAirlineStats(TripPin) {
  const airlines = await TripPin.run(SELECT.from('TripPinService.Airlines'));
  const airlineArr = Array.isArray(airlines) ? airlines : (airlines ? [airlines] : []);
  const airlineMap = Object.fromEntries(airlineArr.map(a => [a.AirlineCode, a.Name]));
  const knownCodes = new Set(airlineArr.map(a => a.AirlineCode));

  const counts = {};

  try {
    const people = await TripPin.run(SELECT.from('TripPinService.People'));
    const peopleArr = Array.isArray(people) ? people : (people ? [people] : []);
    const SAMPLE_SIZE = Math.min(peopleArr.length, 8);

    // Haal per persoon de vluchtnummers op via PlanItems (diepte: People/Trips/PlanItems)
    // CAP's send() stuurt een ruwe OData-aanvraag naar de externe service.
    for (const person of peopleArr.slice(0, SAMPLE_SIZE)) {
      try {
        const tripsResp = await TripPin.send({
          method: 'GET',
          path: `People('${person.UserName}')/Trips?$select=TripId`,
        });
        const trips = Array.isArray(tripsResp?.value) ? tripsResp.value
                    : Array.isArray(tripsResp)        ? tripsResp
                    : [];

        for (const trip of trips) {
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
                // Airlinecode = eerste 2 hoofdletters van FlightNumber (bijv. "AA26" → "AA")
                const match = item.FlightNumber.match(/^([A-Z]{2})/);
                if (match && knownCodes.has(match[1])) {
                  const code = match[1];
                  counts[code] = (counts[code] || 0) + 1;
                }
              }
            }
          } catch {
            // Negeer PlanItems-fouten per trip
          }
        }
      } catch {
        // Negeer fouten per persoon
      }
    }
  } catch {
    // Fallback als People-ophalen mislukt
  }

  // Als er geen vluchten gevonden zijn (bijv. TripPin heeft verouderde data),
  // retourneer de bekende airlines met TripCount 0 zodat de grafiek toch data toont.
  if (Object.keys(counts).length === 0) {
    return airlineArr.map(a => ({ AirlineCode: a.AirlineCode, Name: a.Name, TripCount: 0 }));
  }

  return Object.entries(counts).map(([code, count]) => ({
    AirlineCode: code,
    Name:        airlineMap[code] ?? code,
    TripCount:   count,
  })).sort((a, b) => b.TripCount - a.TripCount);
}
