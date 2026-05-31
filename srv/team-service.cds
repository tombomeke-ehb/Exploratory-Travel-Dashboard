// ─────────────────────────────────────────────────────────────────────────────
// Team Dashboard Service – Team Lead (TeamLead-rol)
//
// FA v4 §4.2 + §7.2
// Read-only toegang tot TripPin-data.
// Schrijven enkel op ApprovalStatus van eigen teamleden (FA v4 §11 rollenmatrix).
//
// FV-22: teamoverzicht met statusbadge
// FV-23: reistijdlijn per medewerker
// FV-24: ApprovalStatus aanpassen voor eigen team
// FV-25: alle andere velden read-only
// FV-26: filter op 'Pending' voor openstaande goedkeuringen
// ─────────────────────────────────────────────────────────────────────────────

using { primepath as p } from '../db/schema';
using { TripPinService } from './external/TripPin';

@path: '/team'
@requires: 'TeamLead'
service TeamService {

  // ── TripPin data (read-only) ───────────────────────────────────────────────
  @readonly entity People   as projection on TripPinService.People;
  @readonly entity Trips    as projection on TripPinService.Trips;
  @readonly entity Airlines as projection on TripPinService.Airlines;

  // ── TravelExtensions: lezen voor iedereen ─────────────────────────────────
  // Schrijven enkel ApprovalStatus – afgedwongen in team-service.js
  entity TravelExtensions as projection on p.TravelExtensions;

  // ── UserMapping: read-only (teamleden opzoeken) ───────────────────────────
  @readonly entity UserMapping as projection on p.UserMapping;

  // ── FV-26: aantal openstaande goedkeuringen voor dit team ─────────────────
  function getPendingCount() returns Integer;
}
