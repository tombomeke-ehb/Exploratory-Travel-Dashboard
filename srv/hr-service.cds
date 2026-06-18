// ─────────────────────────────────────────────────────────────────────────────
// HR Dashboard Service – HR / Administratie (TravelViewer-rol)
//
// FA v4 §4.3 + §7.3
// Volledig read-only. Focus op statistieken voor kwartaalrapportage.
//
// FV-27: airline-statistieken (grafiek airlinegebruik)
// FV-28: trips per periode (datumfilter)
// FV-29: medewerkeroverzicht (read-only)
// FV-30: geen schrijfacties
// ─────────────────────────────────────────────────────────────────────────────

using { primepath as p } from '../db/schema';
using { primepath.shared as shared } from './shared';

@path: '/hr'
@requires: 'TravelViewer'
service HRService {

  // ── TripPin data (read-only) ───────────────────────────────────────────────
  @readonly entity People   as projection on shared.People;
  @readonly entity Trips    as projection on shared.Trips;
  @readonly entity Airlines as projection on shared.Airlines {
    *,
    virtual null as TripCount : Integer   // FV-18: aantal boekingen (uit airline-stats)
  };
  @readonly entity Airports as projection on shared.Airports {
    IcaoCode,
    IataCode,
    Name,
    virtual null as City : String
  };

  // ── PrimePath velden (read-only voor HR) ──────────────────────────────────
  @readonly entity TravelExtensions as projection on p.TravelExtensions;

  // ── FV-27 + V8: airline-statistieken (aantal boekingen + totaal budget) ───
  function getAirlineStats() returns array of {
    AirlineCode : String;
    Name        : String;
    TripCount   : Integer;
    TotalBudget : Decimal;
  };

  // ── FV-28: totaal reizen in periode ───────────────────────────────────────
  function getTripCountByPeriod(
    from : DateTime,
    to   : DateTime
  ) returns Integer;
}
