// ─────────────────────────────────────────────────────────────────────────────
// PrimePath Travel – Lokaal datamodel
// Bevat enkel de eigen uitbreidingen op TripPin (read-only externe bron).
// ─────────────────────────────────────────────────────────────────────────────

namespace primepath;

using { managed } from '@sap/cds/common';

// ── ApprovalStatus type ───────────────────────────────────────────────────────
type ApprovalStatus : String(20) enum {
  Pending  = 'Pending';
  Approved = 'Approved';
  Rejected = 'Rejected';
}

// ── TravelExtensions ──────────────────────────────────────────────────────────
// Koppelt PrimePath-specifieke velden aan een TripPin-reis via TripID.

entity TravelExtensions : managed {
  key TripID         : Integer;           // Verwijzing naar TripPin Trip.TripId
  ProjectCode        : String(20);        // Bijv. 'PROJ-2024-042'
  ApprovalStatus     : primepath.ApprovalStatus default 'Pending';
  InternalNote       : String(500);       // Max 500 tekens
}

// ── UserMapping ───────────────────────────────────────────────────────────────
// Koppelt BTP-loginID aan TripPin-UserName zodat de Team Lead
// enkel de reizen van zijn/haar teamleden kan goedkeuren.

entity UserMapping {
  key BtpLoginId      : String(256);      // BTP-loginID (e-mailadres)
  TripPinUserName     : String(256);      // Bijbehorende UserName in TripPin
  TeamLeadLoginId     : String(256);      // BTP-loginID van de verantwoordelijke Team Lead
  DisplayName         : String(256);      // Weergavenaam (optioneel)
}
