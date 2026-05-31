// ─────────────────────────────────────────────────────────────────────────────
// TripPin External Service – CDS stub
//
// Dit bestand wordt normaal automatisch aangemaakt door:
//   cds import TripPin.xml --from odata-v4
//
// Tot dan dient deze vereenvoudigde stub als model voor lokale ontwikkeling.
// De volledige EDMX kan gedownload worden van:
//   https://services.odata.org/V4/TripPinServiceRW/$metadata
// ─────────────────────────────────────────────────────────────────────────────

@cds.external
service TripPinService {

  entity People {
    key UserName    : String;
    FirstName       : String;
    LastName        : String;
    Emails          : many String;
    Gender          : String; // Male, Female, Unknown
    // AddressInfo en Friends zijn navigatie-properties (vereenvoudigd hier)
  }

  entity Trips {
    key TripId      : Integer;
    Name            : String;
    Budget          : Decimal(10,2);
    Description     : String;
    Tags            : many String;
    StartsAt        : DateTime;
    EndsAt          : DateTime;
    // PlanItems bevat Flights (navigatie-property)
  }

  entity Airlines {
    key AirlineCode : String;
    Name            : String;
  }

  entity Airports {
    key IcaoCode    : String;
    Name            : String;
    IataCode        : String;
    // Location: City, CountryRegion, Lat, Lon
  }
}
