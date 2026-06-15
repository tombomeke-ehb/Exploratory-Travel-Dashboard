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

// ── Centrale Nederlandse labels (@title = @Common.Label) ──────────────────────
// Eén bron van waarheid: alle drie services (TravelAdmin/TeamLead/TravelViewer)
// erven deze labels. Officieel CAP-advies i.p.v. herhaalde Label-strings.
annotate People with {
  UserName  @title: 'Gebruikersnaam';
  FirstName @title: 'Voornaam';
  LastName  @title: 'Familienaam';
  Gender    @title: 'Geslacht';
  Emails    @title: 'E-mailadressen';
}
annotate Trips with {
  TripId      @title: 'Reis-ID';
  Name        @title: 'Naam';
  Budget      @title: 'Budget';
  Description @title: 'Beschrijving';
  StartsAt    @title: 'Vertrekdatum';
  EndsAt      @title: 'Aankomstdatum';
}
annotate Airlines with {
  AirlineCode @title: 'IATA-code';
  Name        @title: 'Naam';
}
annotate Airports with {
  IcaoCode @title: 'ICAO-code';
  IataCode @title: 'IATA-code';
  Name     @title: 'Naam';
}
