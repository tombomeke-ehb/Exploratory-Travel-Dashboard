// ─────────────────────────────────────────────────────────────────────────────
// Fiori Elements Annotations – Team Dashboard (Team Lead)
//
// Gebaseerd op Functionele Analyse v4 – PrimePath Travel
// FV-22 t/m FV-26: teamoverzicht, reistijdlijn, goedkeuring
// ─────────────────────────────────────────────────────────────────────────────

using { TeamService } from '../../srv/team-service';

// ═══════════════════════════════════════════════════════════════════════════════
// PEOPLE – Teamoverzicht (FV-22)
// Toont per medewerker de beschikbaarheidsstatus en eerstvolgende reis
// ═══════════════════════════════════════════════════════════════════════════════

annotate TeamService.People with @(

  UI.HeaderInfo: {
    TypeName      : 'Teamlid',
    TypeNamePlural: 'Teamleden',
    Title         : { Value: LastName },
    Description   : { Value: UserName }
  },

  UI.SelectionFields: [ LastName, UserName ],

  // FV-22: statusbadge 'Op reis / Beschikbaar' + eerstvolgende reis
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: UserName,  Label: 'Gebruikersnaam' },
    { $Type: 'UI.DataField', Value: FirstName, Label: 'Voornaam'       },
    { $Type: 'UI.DataField', Value: LastName,  Label: 'Familienaam'    },
    // 'Op reis' status wordt berekend in de UI op basis van actieve Trips
  ],

  // FV-23: reistijdlijn op detailpagina
  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Label : 'Persoonsgegevens',
      Target: '@UI.FieldGroup#PersonInfo'
    }
  ],

  UI.FieldGroup#PersonInfo: {
    Label: 'Teamlid details',
    Data : [
      { $Type: 'UI.DataField', Value: UserName,  Label: 'Gebruikersnaam' },
      { $Type: 'UI.DataField', Value: FirstName, Label: 'Voornaam'       },
      { $Type: 'UI.DataField', Value: LastName,  Label: 'Familienaam'    },
    ]
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// TRIPS – Reistijdlijn per medewerker (FV-23, FV-24, FV-25)
// ═══════════════════════════════════════════════════════════════════════════════

annotate TeamService.Trips with @(

  UI.HeaderInfo: {
    TypeName      : 'Reis',
    TypeNamePlural: 'Reizen',
    Title         : { Value: Name },
    Description   : { Value: StartsAt }
  },

  // FV-26: filter op 'In behandeling' voor openstaande goedkeuringen
  UI.SelectionFields: [ StartsAt, EndsAt, ApprovalStatus ],

  UI.LineItem: [
    { $Type: 'UI.DataField', Value: TripId,         Label: 'Trip ID'            },
    { $Type: 'UI.DataField', Value: Name,            Label: 'Naam'               },
    { $Type: 'UI.DataField', Value: StartsAt,        Label: 'Vertrek'            },
    { $Type: 'UI.DataField', Value: EndsAt,          Label: 'Aankomst'           },
    { $Type: 'UI.DataField', Value: ApprovalStatus,  Label: 'Goedkeuringsstatus' },
  ]
);

// ═══════════════════════════════════════════════════════════════════════════════
// TRAVELEXTENSIONS – Goedkeuring (FV-24: enige bewerkbare kolom = ApprovalStatus)
// ═══════════════════════════════════════════════════════════════════════════════

annotate TeamService.TravelExtensions with @(

  UI.HeaderInfo: {
    TypeName      : 'Reisextensie',
    TypeNamePlural: 'Reisextensies',
    Title         : { Value: TripID }
  },

  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Label : 'Goedkeuring',
      Target: '@UI.FieldGroup#Approval'
    }
  ],

  // FV-24: Team Lead kan enkel ApprovalStatus aanpassen
  // FV-25: alle andere velden read-only
  UI.FieldGroup#Approval: {
    Label: 'Goedkeuringsstatus (bewerkbaar door Team Lead)',
    Data : [
      { $Type: 'UI.DataField', Value: ApprovalStatus, Label: 'Goedkeuringsstatus' },
      { $Type: 'UI.DataField', Value: ProjectCode,    Label: 'Projectcode'        },
      { $Type: 'UI.DataField', Value: InternalNote,   Label: 'Interne notitie'    },
      { $Type: 'UI.DataField', Value: modifiedAt,     Label: 'Gewijzigd op'       },
      { $Type: 'UI.DataField', Value: modifiedBy,     Label: 'Gewijzigd door'     },
    ]
  }
);

// Labels
annotate TeamService.TravelExtensions with {
  TripID         @title: 'Trip ID'           @readonly;
  ApprovalStatus @title: 'Goedkeuringsstatus';
  ProjectCode    @title: 'Projectcode'        @readonly;
  InternalNote   @title: 'Interne notitie'    @readonly;
  modifiedAt     @title: 'Gewijzigd op'       @readonly;
  modifiedBy     @title: 'Gewijzigd door'     @readonly;
}
