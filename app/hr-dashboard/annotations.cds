// ─────────────────────────────────────────────────────────────────────────────
// Fiori Elements Annotations – HR Dashboard (HR / Administratie)
// Volledig read-only. Focus op statistieken en airlinegebruik.
// ─────────────────────────────────────────────────────────────────────────────

using HRService from '../../srv/hr-service';

// ── AIRLINES – Statistieken ───────────────────────────────────────────────────
annotate HRService.Airlines with @(
  UI.LineItem: [
    { Value: AirlineCode, Label: 'IATA-code' },
    { Value: Name,        Label: 'Naam'      },
    // UsageCount wordt berekend via aggregatie in de service handler
  ]
);

// ── TRIPS – Overzicht per periode ─────────────────────────────────────────────
annotate HRService.Trips with @(
  UI.SelectionFields: [ StartsAt, EndsAt ],
  UI.LineItem: [
    { Value: TripId,   Label: 'Trip ID'   },
    { Value: Name,     Label: 'Naam'      },
    { Value: StartsAt, Label: 'Vertrek'   },
    { Value: EndsAt,   Label: 'Aankomst'  },
    { Value: Budget,   Label: 'Budget'    },
  ]
);

// ── PEOPLE – Read-only overzicht ─────────────────────────────────────────────
annotate HRService.People with @(
  UI.LineItem: [
    { Value: UserName,  Label: 'Gebruikersnaam' },
    { Value: FirstName, Label: 'Voornaam'       },
    { Value: LastName,  Label: 'Familienaam'    },
  ]
);
