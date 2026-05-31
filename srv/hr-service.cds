// ─────────────────────────────────────────────────────────────────────────────
// HR Dashboard Service – voor HR / Administratie (TravelViewer-rol)
//
// Volledig read-only. Geen schrijfacties beschikbaar.
// Focus op statistieken: airlinegebruik, reizen per periode.
// ─────────────────────────────────────────────────────────────────────────────

using { primepath as p } from '../db/schema';
using { TripPinService } from './external/TripPin';

@path: '/hr'
@requires: 'TravelViewer'
service HRService {

  // ── TripPin data (read-only) ─────────────────────────────────────────────
  @readonly entity People     as projection on TripPinService.People;
  @readonly entity Trips      as projection on TripPinService.Trips;
  @readonly entity Airlines   as projection on TripPinService.Airlines;
  @readonly entity Airports   as projection on TripPinService.Airports;

  // ── TravelExtensions (read-only voor HR) ────────────────────────────────
  @readonly entity TravelExtensions as projection on p.TravelExtensions;
}
