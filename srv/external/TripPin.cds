// ─────────────────────────────────────────────────────────────────────────────
// TripPin External Service – CDS model
//
// Vervangt dit bestand door het geïmporteerde model via:
//   cds import TripPin.xml
// EDMX: https://services.odata.org/V4/TripPinServiceRW/$metadata
//
// Bevat alle entiteiten die gebruikt worden in de 3 Fiori-apps.
// ─────────────────────────────────────────────────────────────────────────────

@cds.external
service TripPinService {

  // ── Mensen / Medewerkers ───────────────────────────────────────────────────
  entity People {
    key UserName    : String;
    FirstName       : String;
    LastName        : String;
    Emails          : many String;
    AddressInfo     : many {
      Address       : String;
      City          : {
        Name          : String;
        CountryRegion : String;
        Region        : String;
      };
    };
    Gender          : String; // Male, Female, Unknown
    Concurrency     : Integer;
    // Trips: navigatie-property (People → Trips)
  }

  // ── Reizen ─────────────────────────────────────────────────────────────────
  entity Trips {
    key TripId      : Integer;
    Name            : String;
    Budget          : Decimal(10,2);
    Description     : String;
    Tags            : many String;
    StartsAt        : DateTime;
    EndsAt          : DateTime;
    // PlanItems: navigatie (Trips → Flights/Events)
  }

  // ── Airlines ───────────────────────────────────────────────────────────────
  entity Airlines {
    key AirlineCode : String;
    Name            : String;
  }

  // ── Luchthavens ────────────────────────────────────────────────────────────
  entity Airports {
    key IcaoCode    : String;
    Name            : String;
    IataCode        : String;
    Location        : {
      Address       : String;
      City          : {
        Name          : String;
        CountryRegion : String;
        Region        : String;
      };
      Loc            : {
        type          : String;
        coordinates   : many Decimal;
      };
    };
  }
}
