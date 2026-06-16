// ─────────────────────────────────────────────────────────────────────────────
// Travel Dashboard Service – Travel Coördinator (TravelAdmin-rol)
//
// FA v4 §4.1, §7.1, §11 (rollenmatrix)
// Volledige toegang tot TripPin-data (read-only) en eigen PrimePath-velden.
//
// KPI-functies voor het dashboard (FV-01 t/m FV-06):
//   - getActiveTripsCount    → FV-01: totaal actieve reizen vandaag
//   - getOnTravelCount       → FV-03: medewerkers momenteel op reis
//   - getTopAirline          → FV-02: meest gebruikte airline
//   - getAirlineStats        → FV-06: airlinegebruik voor grafiek
// ─────────────────────────────────────────────────────────────────────────────

using { primepath as p } from '../db/schema';
using { primepath.shared as shared } from './shared';

@path: '/travel'
@requires: 'TravelAdmin'
service TravelService {

  // ── TripPin entiteiten (read-only) ────────────────────────────────────────
  // FV-07: OnTravel als virtueel veld voor statusbadge
  // FV-08: expliciete Trips navigatieproperty zodat People → Trips werkt
  @readonly entity People as projection on shared.People {
    *,
    virtual null as OnTravel : Boolean,
    virtual null as Email    : String,   // FV-07: eerste e-mailadres als scalair veld
    Trips: redirected to Trips
  };
  @readonly entity Trips    as projection on shared.Trips;
  @readonly entity Airlines as projection on shared.Airlines;
  @readonly entity Airports as projection on shared.Airports;

  // ── Eigen PrimePath-velden (volledig CRUD voor TravelAdmin) ───────────────
  // FA v4 §7.4: ProjectCode, ApprovalStatus, InternalNote
  // FV-05: StartsAt als virtueel veld voor sortering (ingevuld vanuit TripPin)
  // FV-15: TripName, TripBudget, TripDescription als virtuele TripPin-velden
  entity TravelExtensions as projection on p.TravelExtensions {
    *,
    virtual null as StartsAt        : DateTime,
    virtual null as TripName        : String,
    virtual null as TripBudget      : Decimal,
    virtual null as TripDescription : String
  };

  // FA v4 §10.3: beheer van team-koppelingen
  entity UserMapping as projection on p.UserMapping;

  // ── KPI-functies voor het dashboard ───────────────────────────────────────
  // FA v4 §7.1 dashboard-vereisten FV-01 t/m FV-06

  // FV-01: totaal aantal actieve reizen op dit moment
  function getActiveTripsCount() returns Integer;

  // FV-03: aantal medewerkers momenteel op reis (actieve reis vandaag)
  function getOnTravelCount() returns Integer;

  // V7: aantal komende reizen binnen 2 weken (StartsAt in de nabije toekomst)
  function getUpcomingTripsCount() returns Integer;

  // FV-02: meest gebruikte airline (op basis van aantal boekingen)
  function getTopAirline() returns {
    AirlineCode : String;
    Name        : String;
    TripCount   : Integer;
  };

  // FV-06 + V8: airlinegebruik voor grafiek (aantal boekingen + totaal budget)
  function getAirlineStats() returns array of {
    AirlineCode : String;
    Name        : String;
    TripCount   : Integer;
    TotalBudget : Decimal;
  };
}
