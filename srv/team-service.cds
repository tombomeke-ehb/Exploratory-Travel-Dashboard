// ─────────────────────────────────────────────────────────────────────────────
// Team Dashboard Service – voor de Team Lead (TeamLead-rol)
//
// Read-only toegang tot TripPin-data en TravelExtensions.
// Schrijven is enkel toegelaten op ApprovalStatus van eigen teamleden
// (gecontroleerd via UserMapping in de custom handler).
// ─────────────────────────────────────────────────────────────────────────────

using { primepath as p } from '../db/schema';
using { TripPinService } from './external/TripPin';

@path: '/team'
@requires: 'TeamLead'
service TeamService {

  // ── TripPin data (read-only) ─────────────────────────────────────────────
  @readonly entity People     as projection on TripPinService.People;
  @readonly entity Trips      as projection on TripPinService.Trips;
  @readonly entity Airlines   as projection on TripPinService.Airlines;

  // ── TravelExtensions: volledige projection, schrijven enkel ApprovalStatus
  //    via eigen team – afgedwongen in team-service.js handler.
  entity TravelExtensions as projection on p.TravelExtensions;

  // ── UserMapping: read-only (nodig om teamleden op te zoeken) ────────────
  @readonly entity UserMapping as projection on p.UserMapping;
}
