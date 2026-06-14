// ─────────────────────────────────────────────────────────────────────────────
// PrimePath – Gedeelde TripPin-reisaggregatie
//
// TripPin heeft GEEN top-level 'Trips'-entiteitset: reizen zijn enkel bereikbaar
// via de navigatie People('username')/Trips. Een rechtstreekse query op /Trips
// faalt daarom met "Resource not found for the segment 'Trips'".
//
// Deze helper bouwt één keer een vlakke reizenlijst op door alle People te
// doorlopen en hun Trips via navigatie op te halen. Resultaat wordt 5 minuten
// in-memory gecachet (TripPin-data is statisch). Gebruikt door:
//   - srv/travel-service.js  (READ Trips + verrijking van TravelExtensions)
//   - srv/team-service.js    (READ Trips)
//   - srv/hr-service.js      (READ Trips)
// ─────────────────────────────────────────────────────────────────────────────

const cds = require('@sap/cds');

let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;   // 5 minuten

// Verzamel alle reizen via People-navigatie. Retourneert { trips, byId }:
//   trips : Array van reisobjecten (gededupliceerd op TripId)
//   byId  : Map<Number TripId, reisobject> voor snelle opzoeking
async function collectAllTrips(TripPin) {
  if (_cache && (Date.now() - _cacheTime < CACHE_TTL)) return _cache;

  const trips = [];
  const byId  = new Map();

  try {
    const people    = await TripPin.run(SELECT.from('TripPinService.People'));
    const peopleArr = Array.isArray(people) ? people : (people ? [people] : []);

    await Promise.all(peopleArr.map(async (person) => {
      try {
        const resp = await TripPin.send({
          method: 'GET',
          path: `People('${person.UserName}')/Trips?$select=TripId,Name,Budget,Description,StartsAt,EndsAt`,
        });
        const arr = Array.isArray(resp?.value) ? resp.value
                  : Array.isArray(resp)        ? resp
                  : [];
        for (const t of arr) {
          if (t.TripId === undefined || byId.has(t.TripId)) continue;
          const trip = {
            TripId:      t.TripId,
            Name:        t.Name ?? null,
            Budget:      t.Budget?.Value ?? t.Budget ?? null,
            Description: t.Description ?? null,
            StartsAt:    t.StartsAt ?? null,
            EndsAt:      t.EndsAt ?? null,
          };
          byId.set(t.TripId, trip);
          trips.push(trip);
        }
      } catch (err) {
        cds.log('trippin-trips').warn(
          `Kon trips van '${person.UserName}' niet ophalen: ${err.message}`
        );
      }
    }));
  } catch (err) {
    cds.log('trippin-trips').warn(
      `Kon People niet ophalen voor reisaggregatie: ${err.message}`
    );
  }

  _cache = { trips, byId };
  _cacheTime = Date.now();
  return _cache;
}

module.exports = { collectAllTrips };
