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
using { TripPinService } from './external/TripPin';

@path: '/hr'
@requires: 'TravelViewer'
service HRService {

  // ── TripPin data (read-only) ───────────────────────────────────────────────
  @readonly entity People   as projection on TripPinService.People;
  @readonly entity Trips    as projection on TripPinService.Trips;
  @readonly entity Airlines as projection on TripPinService.Airlines;
  @readonly entity Airports as projection on TripPinService.Airports;

  // ── PrimePath velden (read-only voor HR) ──────────────────────────────────
  @readonly entity TravelExtensions as projection on p.TravelExtensions;

  // ── FV-27: airline-statistieken voor grafiek ──────────────────────────────
  function getAirlineStats() returns array of {
    AirlineCode : String;
    Name        : String;
    TripCount   : Integer;
  };

  // ── FV-28: totaal reizen in periode ───────────────────────────────────────
  function getTripCountByPeriod(
    from : DateTime,
    to   : DateTime
  ) returns Integer;
}
