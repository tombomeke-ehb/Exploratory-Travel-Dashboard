// Fiori Annotations - Team Dashboard
annotate TeamService.People with @(
  UI.HeaderInfo: {
    TypeName: 'Teamlid',
    TypeNamePlural: 'Teamleden',
    Title: { Value: FirstName },
    Description: { Value: LastName }
  },
  UI.SelectionFields: [ LastName, UserName ],
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: UserName,     Label: 'Gebruikersnaam' },
    { $Type: 'UI.DataField', Value: FirstName,    Label: 'Voornaam' },
    { $Type: 'UI.DataField', Value: LastName,     Label: 'Familienaam' },
    { $Type: 'UI.DataField', Value: NextTripDate, Label: 'Eerstvolgende reis (datum)' },
    { $Type: 'UI.DataField', Value: NextTripName, Label: 'Eerstvolgende reis' },
    {
      $Type: 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#TravelStatus',
      Label: 'Status'
    }
  ],
  UI.DataPoint #TravelStatus: {
    Value: OnTravel,
    Title: 'Resstatus',
    Criticality: { $edmJson: { $If: [{ $Eq: [{ $Path: 'OnTravel' }, true] }, 1, 3] } }
  },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Persoonsgegevens', Target: '@UI.FieldGroup#PersonInfo' },
    { $Type: 'UI.ReferenceFacet', Label: 'Reistijdlijn', Target: 'Trips/@UI.LineItem' }
  ],
  UI.FieldGroup#PersonInfo: { Label: 'Teamlid details', Data: [
    { $Type: 'UI.DataField', Value: UserName,     Label: 'Gebruikersnaam' },
    { $Type: 'UI.DataField', Value: FirstName,    Label: 'Voornaam' },
    { $Type: 'UI.DataField', Value: LastName,     Label: 'Familienaam' },
    { $Type: 'UI.DataField', Value: OnTravel,     Label: 'Op reis' },
    { $Type: 'UI.DataField', Value: NextTripDate, Label: 'Eerstvolgende reis (datum)' },
    { $Type: 'UI.DataField', Value: NextTripName, Label: 'Eerstvolgende reis' }
  ]}
);
// Opmerking: TeamService.Trips is een read-only projectie op TripPinService.Trips.
// ApprovalStatus staat in TravelExtensions, niet in Trips.
annotate TeamService.Trips with @(
  UI.HeaderInfo: { TypeName: 'Reis', TypeNamePlural: 'Reizen', Title: { Value: Name }, Description: { Value: StartsAt } },
  UI.SelectionFields: [ StartsAt, EndsAt ],
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: TripId,  Label: 'Trip ID' },
    { $Type: 'UI.DataField', Value: Name,     Label: 'Naam' },
    { $Type: 'UI.DataField', Value: StartsAt, Label: 'Vertrek' },
    { $Type: 'UI.DataField', Value: EndsAt,   Label: 'Aankomst' }
  ]
);
annotate TeamService.TravelExtensions with @(
  UI.HeaderInfo: { TypeName: 'Reisgoedkeuring', TypeNamePlural: 'Reisgoedkeuringen', Title: { Value: TripID } },
  // FV-26: filter op goedkeuringsstatus, met 'In behandeling' als preset
  UI.SelectionFields: [ ApprovalStatus ],
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: TripID,         Label: 'Trip ID' },
    { $Type: 'UI.DataField', Value: ApprovalStatus, Label: 'Goedkeuringsstatus' },
    { $Type: 'UI.DataField', Value: ProjectCode,    Label: 'Projectcode' },
    { $Type: 'UI.DataField', Value: InternalNote,   Label: 'Interne notitie' }
  ],
  UI.SelectionVariant #Pending: {
    Text: 'In behandeling',
    SelectOptions: [{
      PropertyName: ApprovalStatus,
      Ranges: [{ Sign: #I, Option: #EQ, Low: 'Pending' }]
    }]
  },
  UI.Facets: [{ $Type: 'UI.ReferenceFacet', Label: 'Goedkeuring', Target: '@UI.FieldGroup#Approval' }],
  UI.FieldGroup#Approval: { Label: 'Goedkeuringsstatus', Data: [
    { $Type: 'UI.DataField', Value: ApprovalStatus, Label: 'Goedkeuringsstatus' },
    { $Type: 'UI.DataField', Value: ProjectCode,    Label: 'Projectcode' },
    { $Type: 'UI.DataField', Value: InternalNote,   Label: 'Interne notitie' }
  ]}
);
annotate TeamService.TravelExtensions with {
  TripID         @title: 'Trip ID'            @readonly;
  ApprovalStatus @title: 'Goedkeuringsstatus';
  ProjectCode    @title: 'Projectcode'         @readonly;
  InternalNote   @title: 'Interne notitie'     @readonly;
}
