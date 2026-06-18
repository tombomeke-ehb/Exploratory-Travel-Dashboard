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
using { primepath.shared as shared } from './shared';

@path: '/team'
@requires: 'TeamLead'
service TeamService {

  // ── TripPin data (read-only) ───────────────────────────────────────────────
  // FV-22: OnTravel als statusbadge + eerstvolgende reis (naam + datum)
  // FV-23: expliciete Trips navigatieproperty zodat People → Trips werkt
  @readonly entity People as projection on shared.People {
    *,
    virtual null as OnTravel     : Boolean,
    virtual null as NextTripName : String,
    virtual null as NextTripDate : DateTime,
    Trips: redirected to Trips
  };
  @readonly entity Trips    as projection on shared.Trips;
  @readonly entity Airlines as projection on shared.Airlines;

  // ── TravelExtensions: lezen voor iedereen ─────────────────────────────────
  // Schrijven enkel ApprovalStatus – afgedwongen in team-service.js
  // FV-24: Goedkeuren/Afkeuren als bound actions (één klik op de Object Page).
  // De teamcheck (eigen teamlid?) zit in srv/team-service.js (_assertTeamOwnership).
  entity TravelExtensions as projection on p.TravelExtensions {
    *,
    virtual null as StatusLabel : String   // Nederlandse vertaling van ApprovalStatus
  } actions {
    action goedkeuren()    returns TravelExtensions;
    action afkeuren()      returns TravelExtensions;
    action inBehandeling() returns TravelExtensions;
  };

  // ── UserMapping: read-only (teamleden opzoeken) ───────────────────────────
  @readonly entity UserMapping as projection on p.UserMapping;

  // ── FV-26: aantal openstaande goedkeuringen voor dit team ─────────────────
  function getPendingCount() returns Integer;
}
