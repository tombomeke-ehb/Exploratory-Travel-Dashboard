// ─────────────────────────────────────────────────────────────────────────────
// Fiori Elements Annotations – Team Dashboard (Team Lead)
// ─────────────────────────────────────────────────────────────────────────────

using TeamService from '../../srv/team-service';

// ── PEOPLE – Teamoverzicht ────────────────────────────────────────────────────
annotate TeamService.People with @(
  UI.SelectionFields: [ UserName, LastName ],
  UI.LineItem: [
    { Value: UserName,  Label: 'Gebruikersnaam' },
    { Value: FirstName, Label: 'Voornaam'       },
    { Value: LastName,  Label: 'Familienaam'    },
    // Status badge 'Op reis / Beschikbaar' wordt berekend in de frontend
    // op basis van actieve Trips voor deze persoon.
  ]
);

// ── TRIPS – Tijdlijn per medewerker (read-mostly) ─────────────────────────────
annotate TeamService.Trips with @(
  UI.SelectionFields: [ StartsAt, EndsAt, ApprovalStatus ],
  UI.LineItem: [
    { Value: TripId,         Label: 'Trip ID'      },
    { Value: Name,           Label: 'Naam'         },
    { Value: StartsAt,       Label: 'Vertrek'      },
    { Value: EndsAt,         Label: 'Aankomst'     },
    { Value: ApprovalStatus, Label: 'Status'       },
  ]
);

// ── TRIPS Object Page: ApprovalStatus is de enige bewerkbare kolom ────────────
annotate TeamService.TravelExtensions with @(
  UI.Facets: [
    {
      $Type  : 'UI.ReferenceFacet',
      Label  : 'Goedkeuring',
      Target : '@UI.FieldGroup#Approval'
    }
  ],
  UI.FieldGroup#Approval: {
    Label: 'Goedkeuringsstatus',
    Data: [
      { Value: ApprovalStatus, Label: 'Status'          },
      { Value: ProjectCode,    Label: 'Projectcode'     },
      { Value: InternalNote,   Label: 'Interne notitie' },
      { Value: ModifiedAt,     Label: 'Gewijzigd op'    },
      { Value: ModifiedBy,     Label: 'Gewijzigd door'  },
    ]
  }
);
