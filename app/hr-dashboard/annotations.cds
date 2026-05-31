// ─────────────────────────────────────────────────────────────────────────────
// Fiori Elements Annotations – HR Dashboard (HR / Administratie)
//
// Gebaseerd op Functionele Analyse v4 – PrimePath Travel
// FV-27 t/m FV-30: airline-statistieken, reizen per periode, read-only
// ─────────────────────────────────────────────────────────────────────────────

using HRService from '../../srv/hr-service';

// ═══════════════════════════════════════════════════════════════════════════════
// AIRLINES – Statistieken (FV-27)
// Grafiek airlinegebruik op basis van aantal boekingen
// ═══════════════════════════════════════════════════════════════════════════════

annotate HRService.Airlines with @(

  UI.HeaderInfo: {
    TypeName      : 'Airline',
    TypeNamePlural: 'Airlines',
    Title         : { Value: Name },
    Description   : { Value: AirlineCode }
  },

  UI.SelectionFields: [ AirlineCode ],

  // FV-27: naam + code (gebruikstelling wordt berekend via aggregatie in handler)
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: AirlineCode, Label: 'IATA-code' },
    { $Type: 'UI.DataField', Value: Name,         Label: 'Naam'      },
  ],

  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Label : 'Airlinedetails',
      Target: '@UI.FieldGroup#AirlineInfo'
    }
  ],

  UI.FieldGroup#AirlineInfo: {
    Label: 'Airline',
    Data : [
      { $Type: 'UI.DataField', Value: AirlineCode, Label: 'IATA-code' },
      { $Type: 'UI.DataField', Value: Name,         Label: 'Naam'      },
    ]
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// TRIPS – Overzicht per periode (FV-28)
// HR filtert op datumbereik voor kwartaalrapportage
// ═══════════════════════════════════════════════════════════════════════════════

annotate HRService.Trips with @(

  UI.HeaderInfo: {
    TypeName      : 'Reis',
    TypeNamePlural: 'Reizen',
    Title         : { Value: Name },
    Description   : { Value: StartsAt }
  },

  // FV-28: datumfilter voor periodeoverzicht
  UI.SelectionFields: [ StartsAt, EndsAt ],

  UI.LineItem: [
    { $Type: 'UI.DataField', Value: TripId,   Label: 'Trip ID'   },
    { $Type: 'UI.DataField', Value: Name,      Label: 'Naam'      },
    { $Type: 'UI.DataField', Value: StartsAt,  Label: 'Vertrek'   },
    { $Type: 'UI.DataField', Value: EndsAt,    Label: 'Aankomst'  },
    { $Type: 'UI.DataField', Value: Budget,    Label: 'Budget'    },
  ]
);

// ═══════════════════════════════════════════════════════════════════════════════
// PEOPLE – Read-only overzicht (FV-29, FV-30)
// ═══════════════════════════════════════════════════════════════════════════════

annotate HRService.People with @(

  UI.HeaderInfo: {
    TypeName      : 'Medewerker',
    TypeNamePlural: 'Medewerkers',
    Title         : { Value: LastName },
    Description   : { Value: UserName }
  },

  UI.SelectionFields: [ LastName ],

  // FV-29: read-only medewerkeroverzicht
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: UserName,  Label: 'Gebruikersnaam' },
    { $Type: 'UI.DataField', Value: FirstName, Label: 'Voornaam'       },
    { $Type: 'UI.DataField', Value: LastName,  Label: 'Familienaam'    },
  ]
);
