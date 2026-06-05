// ─────────────────────────────────────────────────────────────────────────────
// PrimePath Travel – Lokaal datamodel
//
// Bevat:
//   - ApprovalStatus type (enum)
//   - TravelExtensions: PrimePath-velden per TripPin-reis (via TripID)
//   - UserMapping: koppeling TripPin-UserName medewerker ↔ TripPin-UserName Team Lead
// ─────────────────────────────────────────────────────────────────────────────

namespace primepath;

using { managed } from '@sap/cds/common';

// ── ApprovalStatus enum ───────────────────────────────────────────────────────
// FA v4 §7.4: drie mogelijke waarden
type ApprovalStatus : String(20) enum {
  Pending  = 'Pending';   // In behandeling
  Approved = 'Approved';  // Goedgekeurd
  Rejected = 'Rejected';  // Afgekeurd
}

// ── TravelExtensions ──────────────────────────────────────────────────────────
// FA v4 §7.4 + §10.2
// Koppelt PrimePath-velden aan een TripPin-reis via TripID (integer).
// managed voegt automatisch createdAt/createdBy/modifiedAt/modifiedBy toe.

entity TravelExtensions : managed {
  key TripID         : Integer;

  @title: 'Projectcode'
  @description: 'Interne projectreferentie. Begint altijd met PROJ-. Bijv. PROJ-2024-042.'
  ProjectCode        : String(30);

  @title: 'Goedkeuringsstatus'
  @description: 'In behandeling / Goedgekeurd / Afgekeurd'
  ApprovalStatus     : primepath.ApprovalStatus default 'Pending';

  @title: 'Interne notitie'
  @description: 'Vrij tekstveld voor opmerkingen. Max. 500 tekens.'
  InternalNote       : String(500);
}

// ── UserMapping ───────────────────────────────────────────────────────────────
// FA v4 §10.3
// Koppelt TripPin-UserName van een medewerker aan de TripPin-UserName van zijn/haar TeamLead.
// Puur TripPin-gebaseerd: geen BTP-afhankelijkheid.
// Beheerd door de Travel Coördinator (TravelAdmin-rol).

entity UserMapping {
  @title: 'TripPin Gebruikersnaam (medewerker)'
  @description: 'UserName van de medewerker in de TripPin-databron.'
  key TripPinUserName    : String(256);

  @title: 'TripPin Gebruikersnaam (Team Lead)'
  @description: 'UserName van de verantwoordelijke Team Lead in de TripPin-databron.'
  TeamLeadUserName       : String(256);

  @title: 'Weergavenaam'
  DisplayName            : String(256);
}

// ── Users ─────────────────────────────────────────────────────────────────────
// Lokale gebruikerstabel voor dashboard-authenticatie (vervangt SAP XSUAA).
// Wachtwoorden worden opgeslagen als bcrypt-hash (saltfactor 10).
entity Users {
  @title: 'Gebruikersnaam'
  key username          : String(128);

  @title: 'Wachtwoord (bcrypt hash)'
  passwordHash          : String(256);

  @title: 'Rol'
  @description: 'TravelAdmin | TeamLead | TravelViewer'
  role                  : String(50);

  @title: 'Weergavenaam'
  displayName           : String(256);

  @title: 'TripPin Gebruikersnaam'
  @description: 'Bijbehorende UserName in de TripPin-databron. Vereist voor TeamLead-rol.'
  tripPinUserName       : String(256);
}
