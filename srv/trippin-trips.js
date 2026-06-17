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

  const trips  = [];
  const byId   = new Map();
  const owners = new Map();   // TripId -> Set<UserName> (voor persoonsgebaseerde KPI's)

  try {
    // TripPin levert max 8 People per pagina en CAP volgt de @odata.nextLink niet,
    // dus doorlopen we alle pagina's via $skip. Anders missen we de reizen van
    // alle medewerkers voorbij de eerste pagina.
    const peopleArr = [];
    for (let skip = 0; skip < 500; skip += 8) {
      const page = await TripPin.run(SELECT.from('TripPinService.People').limit(8, skip));
      const arr  = Array.isArray(page) ? page : (page ? [page] : []);
      peopleArr.push(...arr);
      if (arr.length < 8) break;   // onvolledige pagina = laatste pagina
    }

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
          if (t.TripId === undefined) continue;
          // Eigenaar bijhouden (ook voor gedeelde reizen die al in byId staan)
          if (!owners.has(t.TripId)) owners.set(t.TripId, new Set());
          owners.get(t.TripId).add(person.UserName);
          if (byId.has(t.TripId)) continue;
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

  const result = { trips, byId, owners };

  // Cache-poisoning vermijden: een leeg resultaat komt zo goed als altijd door een
  // trage/onbereikbare TripPin (geen reizen opgehaald). Dat NIET cachen, anders
  // toont de hele app 5 minuten lang de fallback. Bij leeg: niet cachen → de
  // volgende call probeert opnieuw. Enkel een niet-leeg resultaat wordt gecachet.
  if (trips.length > 0) {
    _cache = result;
    _cacheTime = Date.now();
  } else {
    cds.log('trippin-trips').warn(
      'Geen reizen opgehaald (TripPin leeg of traag?) — resultaat niet gecachet; volgende aanvraag probeert opnieuw.'
    );
  }
  return result;
}

// Haal de reizen van ÉÉN persoon op (voor de People('x')/Trips-navigatie op de
// medewerker-detailpagina). Zelfde vorm als collectAllTrips' reisobjecten.
async function collectTripsForPerson(TripPin, userName) {
  try {
    const resp = await TripPin.send({
      method: 'GET',
      path: `People('${userName}')/Trips?$select=TripId,Name,Budget,Description,StartsAt,EndsAt`,
    });
    const arr = Array.isArray(resp?.value) ? resp.value
              : Array.isArray(resp)        ? resp
              : [];
    return arr.map(t => ({
      TripId:      t.TripId,
      Name:        t.Name ?? null,
      Budget:      t.Budget?.Value ?? t.Budget ?? null,
      Description: t.Description ?? null,
      StartsAt:    t.StartsAt ?? null,
      EndsAt:      t.EndsAt ?? null,
    }));
  } catch (err) {
    cds.log('trippin-trips').warn(
      `Kon trips van '${userName}' niet ophalen (navigatie): ${err.message}`
    );
    return [];
  }
}

module.exports = { collectAllTrips, collectTripsForPerson };
