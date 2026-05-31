// ─────────────────────────────────────────────────────────────────────────────
// Fiori Elements Annotations – Travel Dashboard (Travel Coördinator)
//
// Gebaseerd op Functionele Analyse v4 – PrimePath Travel
// FV-01 t/m FV-21: dashboard KPI's, trips, people, airlines, airports
// ─────────────────────────────────────────────────────────────────────────────

using { TravelService } from '../../srv/travel-service';

// ═══════════════════════════════════════════════════════════════════════════════
// TRIPS – List Report (FV-11 t/m FV-17)
// Kern van de applicatie voor de Travel Coördinator
// ═══════════════════════════════════════════════════════════════════════════════

annotate TravelService.Trips with @(

  // Titel en beschrijving
  UI.HeaderInfo: {
    TypeName      : 'Reis',
    TypeNamePlural: 'Reizen',
    Title         : { Value: Name },
    Description   : { Value: Description }
  },

  // FV-12, FV-13, FV-14: filters op bestemming, datum, goedkeuringsstatus
  UI.SelectionFields: [
    StartsAt,
    EndsAt,
    ApprovalStatus
  ],

  // FV-11: kolommen in de lijst
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: TripId,         Label: 'Trip ID'              },
    { $Type: 'UI.DataField', Value: Name,            Label: 'Naam'                 },
    { $Type: 'UI.DataField', Value: StartsAt,        Label: 'Vertrek'              },
    { $Type: 'UI.DataField', Value: EndsAt,          Label: 'Aankomst'             },
    { $Type: 'UI.DataField', Value: Budget,          Label: 'Budget'               },
    { $Type: 'UI.DataField', Value: ApprovalStatus,  Label: 'Goedkeuringsstatus'   },
    { $Type: 'UI.DataField', Value: ProjectCode,     Label: 'Projectcode'          },
  ],

  // FV-15: detailpagina met TripPin-velden (read-only) + PrimePath-velden
  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Label : 'Reisinfo (TripPin)',
      Target: '@UI.FieldGroup#TripPin'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Label : 'PrimePath — Interne Velden',
      Target: '@UI.FieldGroup#PrimePath'
    }
  ],

  UI.FieldGroup#TripPin: {
    Label: 'Reisgegevens (extern — read-only)',
    Data : [
      { $Type: 'UI.DataField', Value: TripId,      Label: 'Trip ID'      },
      { $Type: 'UI.DataField', Value: Name,         Label: 'Naam'         },
      { $Type: 'UI.DataField', Value: Description,  Label: 'Beschrijving' },
      { $Type: 'UI.DataField', Value: StartsAt,     Label: 'Vertrekdatum' },
      { $Type: 'UI.DataField', Value: EndsAt,       Label: 'Aankomstdatum'},
      { $Type: 'UI.DataField', Value: Budget,       Label: 'Budget'       },
    ]
  },

  // FV-17: bewerkbare PrimePath-velden (projectcode, status, notitie)
  UI.FieldGroup#PrimePath: {
    Label: 'Interne PrimePath Velden (bewerkbaar)',
    Data : [
      { $Type: 'UI.DataField', Value: ProjectCode,   Label: 'Projectcode (PROJ-…)'  },
      { $Type: 'UI.DataField', Value: ApprovalStatus,Label: 'Goedkeuringsstatus'     },
      { $Type: 'UI.DataField', Value: InternalNote,  Label: 'Interne notitie'        },
    ]
  }
);

// Labels op veldniveau (FV-22, FV-23: projectcode en notitie bewerkbaar)
annotate TravelService.TravelExtensions with {
  TripID         @title: 'Trip ID';
  ProjectCode    @title: 'Projectcode'
                 @description: 'Interne projectreferentie. Begint altijd met PROJ-.';
  ApprovalStatus @title: 'Goedkeuringsstatus'
                 @description: 'In behandeling / Goedgekeurd / Afgekeurd';
  InternalNote   @title: 'Interne notitie'
                 @description: 'Vrij tekstveld, max. 500 tekens.';
  createdAt      @title: 'Aangemaakt op';
  modifiedAt     @title: 'Gewijzigd op';
  createdBy      @title: 'Aangemaakt door';
  modifiedBy     @title: 'Gewijzigd door';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PEOPLE – List Report (FV-07 t/m FV-10)
// ═══════════════════════════════════════════════════════════════════════════════

annotate TravelService.People with @(

  UI.HeaderInfo: {
    TypeName      : 'Medewerker',
    TypeNamePlural: 'Medewerkers',
    Title         : { Value: LastName },
    Description   : { Value: UserName }
  },

  // FV-09: filter op naam
  UI.SelectionFields: [ LastName, UserName ],

  // FV-07: lijst met naam + e-mail
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: UserName,  Label: 'Gebruikersnaam' },
    { $Type: 'UI.DataField', Value: FirstName, Label: 'Voornaam'       },
    { $Type: 'UI.DataField', Value: LastName,  Label: 'Familienaam'    },
    { $Type: 'UI.DataField', Value: Gender,    Label: 'Geslacht'       },
    // FV-07: 'Op reis / Beschikbaar' status — berekend in handler op basis van actieve Trips
  ],

  // FV-08: detailpagina met reistijdlijn
  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Label : 'Persoonsgegevens',
      Target: '@UI.FieldGroup#PersonInfo'
    }
  ],

  UI.FieldGroup#PersonInfo: {
    Label: 'Medewerkerdetails',
    Data : [
      { $Type: 'UI.DataField', Value: UserName,  Label: 'Gebruikersnaam' },
      { $Type: 'UI.DataField', Value: FirstName, Label: 'Voornaam'       },
      { $Type: 'UI.DataField', Value: LastName,  Label: 'Familienaam'    },
      { $Type: 'UI.DataField', Value: Gender,    Label: 'Geslacht'       },
    ]
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// AIRLINES – List Report (FV-18, FV-19)
// ═══════════════════════════════════════════════════════════════════════════════

annotate TravelService.Airlines with @(

  UI.HeaderInfo: {
    TypeName      : 'Airline',
    TypeNamePlural: 'Airlines',
    Title         : { Value: Name },
    Description   : { Value: AirlineCode }
  },

  UI.SelectionFields: [ AirlineCode ],

  // FV-18: naam, code en gebruikstelling
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: AirlineCode, Label: 'IATA-code' },
    { $Type: 'UI.DataField', Value: Name,         Label: 'Naam'      },
  ],

  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Label : 'Airline details',
      Target: '@UI.FieldGroup#AirlineInfo'
    }
  ],

  UI.FieldGroup#AirlineInfo: {
    Label: 'Airlinegegevens',
    Data : [
      { $Type: 'UI.DataField', Value: AirlineCode, Label: 'IATA-code' },
      { $Type: 'UI.DataField', Value: Name,         Label: 'Naam'      },
    ]
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// AIRPORTS – List Report (FV-20, FV-21)
// ═══════════════════════════════════════════════════════════════════════════════

annotate TravelService.Airports with @(

  UI.HeaderInfo: {
    TypeName      : 'Luchthaven',
    TypeNamePlural: 'Luchthavens',
    Title         : { Value: Name },
    Description   : { Value: IataCode }
  },

  // FV-21: zoeken op IATA-code of naam
  UI.SelectionFields: [ IcaoCode, IataCode ],

  // FV-20: IATA-code, naam, stad
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: IcaoCode, Label: 'ICAO-code'   },
    { $Type: 'UI.DataField', Value: IataCode, Label: 'IATA-code'   },
    { $Type: 'UI.DataField', Value: Name,      Label: 'Naam'        },
  ],

  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Label : 'Luchthaven details',
      Target: '@UI.FieldGroup#AirportInfo'
    }
  ],

  UI.FieldGroup#AirportInfo: {
    Label: 'Luchthavens',
    Data : [
      { $Type: 'UI.DataField', Value: IcaoCode, Label: 'ICAO-code' },
      { $Type: 'UI.DataField', Value: IataCode, Label: 'IATA-code' },
      { $Type: 'UI.DataField', Value: Name,      Label: 'Naam'      },
    ]
  }
);
