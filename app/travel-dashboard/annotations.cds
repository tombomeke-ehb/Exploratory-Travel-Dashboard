// ─────────────────────────────────────────────────────────────────────────────
// Fiori Elements Annotations – Travel Dashboard (Travel Coördinator)
//
// Definieert List Reports en Object Pages voor Trips en People.
// ─────────────────────────────────────────────────────────────────────────────

using TravelService from '../../srv/travel-service';

// ── TRIPS – List Report ───────────────────────────────────────────────────────
annotate TravelService.Trips with @(
  UI.SelectionFields: [
    StartsAt,
    EndsAt,
    ApprovalStatus
  ],
  UI.LineItem: [
    { Value: TripId,         Label: 'Trip ID'      },
    { Value: Name,           Label: 'Naam'         },
    { Value: StartsAt,       Label: 'Vertrek'      },
    { Value: EndsAt,         Label: 'Aankomst'     },
    { Value: Budget,         Label: 'Budget'       },
    { Value: ApprovalStatus, Label: 'Status'       },
    { Value: ProjectCode,    Label: 'Projectcode'  },
  ]
);

// ── TRIPS – Object Page ───────────────────────────────────────────────────────
annotate TravelService.Trips with @(
  UI.Facets: [
    {
      $Type  : 'UI.ReferenceFacet',
      Label  : 'Reisinfo (TripPin)',
      Target : '@UI.FieldGroup#TripPin'
    },
    {
      $Type  : 'UI.ReferenceFacet',
      Label  : 'PrimePath Velden',
      Target : '@UI.FieldGroup#PrimePath'
    }
  ],
  UI.FieldGroup#TripPin: {
    Label: 'TripPin Data',
    Data: [
      { Value: TripId,      Label: 'Trip ID'     },
      { Value: Name,        Label: 'Naam'        },
      { Value: Description, Label: 'Beschrijving'},
      { Value: StartsAt,    Label: 'Vertrek'     },
      { Value: EndsAt,      Label: 'Aankomst'    },
      { Value: Budget,      Label: 'Budget'      },
    ]
  },
  UI.FieldGroup#PrimePath: {
    Label: 'Interne PrimePath Velden',
    Data: [
      { Value: ProjectCode,    Label: 'Projectcode'        },
      { Value: ApprovalStatus, Label: 'Goedkeuringsstatus' },
      { Value: InternalNote,   Label: 'Interne notitie'    },
    ]
  }
);

// ── PEOPLE – List Report ──────────────────────────────────────────────────────
annotate TravelService.People with @(
  UI.SelectionFields: [ UserName, LastName ],
  UI.LineItem: [
    { Value: UserName,  Label: 'Gebruikersnaam' },
    { Value: FirstName, Label: 'Voornaam'       },
    { Value: LastName,  Label: 'Familienaam'    },
    { Value: Gender,    Label: 'Geslacht'       },
  ]
);

// ── AIRLINES – List Report ────────────────────────────────────────────────────
annotate TravelService.Airlines with @(
  UI.LineItem: [
    { Value: AirlineCode, Label: 'IATA-code' },
    { Value: Name,        Label: 'Naam'      },
  ]
);

// ── AIRPORTS – List Report ────────────────────────────────────────────────────
annotate TravelService.Airports with @(
  UI.SelectionFields: [ IcaoCode, IataCode ],
  UI.LineItem: [
    { Value: IcaoCode, Label: 'ICAO-code' },
    { Value: IataCode, Label: 'IATA-code' },
    { Value: Name,     Label: 'Naam'      },
  ]
);
