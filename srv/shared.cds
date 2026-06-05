// ─────────────────────────────────────────────────────────────────────────────
// Gedeelde TripPin-basisprojecties
//
// Alle drie rollen (TravelAdmin, TeamLead, TravelViewer) hebben leestoegang
// nodig tot People, Trips, Airlines en Airports. Die worden hier één keer
// gedefinieerd en hergebruikt via 'using' in elke rol-specifieke service.
//
// Rol-specifieke zaken (OnTravel-badge, ApprovalStatus-rechten, teamfiltering,
// HR-statistieken) blijven in de bijbehorende service staan.
// ─────────────────────────────────────────────────────────────────────────────

namespace primepath.shared;
using { TripPinService } from './external/TripPin';

entity People   as projection on TripPinService.People;
entity Trips    as projection on TripPinService.Trips;
entity Airlines as projection on TripPinService.Airlines;
entity Airports as projection on TripPinService.Airports;
