// ─────────────────────────────────────────────────────────────────────────────
// Travel Dashboard Service – voor de Travel Coördinator (TravelAdmin-rol)
//
// Volledige toegang tot alle TripPin-data (read-only) en alle eigen velden.
// Volgt SAP CAP best practice: aparte service per rol/doel.
// ─────────────────────────────────────────────────────────────────────────────

using { primepath as p } from '../db/schema';

// Externe TripPin-entiteiten (worden aangevuld na: cds import TripPin.xml)
using { TripPinService } from './external/TripPin';

@path: '/travel'
@requires: 'TravelAdmin'
service TravelService {

  // ── TripPin data (read-only) ─────────────────────────────────────────────
  @readonly entity People     as projection on TripPinService.People;
  @readonly entity Trips      as projection on TripPinService.Trips;
  @readonly entity Airlines   as projection on TripPinService.Airlines;
  @readonly entity Airports   as projection on TripPinService.Airports;

  // ── Eigen velden (volledig CRUD voor TravelAdmin) ────────────────────────
  entity TravelExtensions as projection on p.TravelExtensions;
  entity UserMapping      as projection on p.UserMapping;
}
