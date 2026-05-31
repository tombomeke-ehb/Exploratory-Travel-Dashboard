// ─────────────────────────────────────────────────────────────────────────────
// PrimePath Travel – Lokaal datamodel
// Bevat enkel de eigen uitbreidingen op TripPin (read-only externe bron).
// ─────────────────────────────────────────────────────────────────────────────

namespace primepath;

using { cuid, managed } from '@sap/cds/common';

// ── TravelExtensions ──────────────────────────────────────────────────────────
// Koppelt PrimePath-specifieke velden aan een TripPin-reis via TripID.
// TripID is de primary key (overeenkomst met TripPin Trip.TripId).

entity TravelExtensions {
  key TripID         : Integer;           // Verwijzing naar TripPin Trip.TripId
  ProjectCode        : String(20);        // Bijv. 'PROJ-2024-042'
  ApprovalStatus     : String(20)
    default 'Pending'
    @assert.range enum {
      Pending    = 'Pending';
      Approved   = 'Approved';
      Rejected   = 'Rejected';
    };
  InternalNote       : String(500);       // Max 500 tekens
  CreatedAt          : Timestamp @cds.on.insert: $now;
  ModifiedAt         : Timestamp @cds.on.update: $now;
  CreatedBy          : String    @cds.on.insert: $user;
  ModifiedBy         : String    @cds.on.update: $user;
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
