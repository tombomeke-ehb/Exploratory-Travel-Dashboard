// Fiori Annotations - Travel Dashboard
// Opmerking: TravelService.Trips is een read-only projectie op TripPinService.Trips.
// PrimePath-velden (ApprovalStatus, ProjectCode, InternalNote) zitten in TravelExtensions.
annotate TravelService.Trips with @(
  UI.HeaderInfo: { TypeName: 'Reis', TypeNamePlural: 'Reizen', Title: { Value: Name }, Description: { Value: Description } },
  UI.SelectionFields: [ StartsAt, EndsAt ],
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: TripId,     Label: 'Trip ID' },
    { $Type: 'UI.DataField', Value: Name,        Label: 'Naam' },
    { $Type: 'UI.DataField', Value: StartsAt,    Label: 'Vertrek' },
    { $Type: 'UI.DataField', Value: EndsAt,      Label: 'Aankomst' },
    { $Type: 'UI.DataField', Value: Budget,      Label: 'Budget' },
    { $Type: 'UI.DataField', Value: Description, Label: 'Beschrijving' }
  ],
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Reisinfo (TripPin)', Target: '@UI.FieldGroup#TripPin' }
  ],
  UI.FieldGroup#TripPin: { Label: 'Reisgegevens (read-only)', Data: [
    { $Type: 'UI.DataField', Value: TripId,      Label: 'Trip ID' },
    { $Type: 'UI.DataField', Value: Name,         Label: 'Naam' },
    { $Type: 'UI.DataField', Value: Description,  Label: 'Beschrijving' },
    { $Type: 'UI.DataField', Value: StartsAt,     Label: 'Vertrekdatum' },
    { $Type: 'UI.DataField', Value: EndsAt,       Label: 'Aankomst' },
    { $Type: 'UI.DataField', Value: Budget,       Label: 'Budget' }
  ]}
);
// FV-11–17: TravelExtensions – beheerscherm voor PrimePath-velden (TravelAdmin)
// FV-05: PresentationVariant sorteert op StartsAt ascending
annotate TravelService.TravelExtensions with @(
  UI.PresentationVariant: {
    SortOrder: [{
      Property: StartsAt,
      Descending: false
    }],
    Visualizations: ['@UI.LineItem']
  },
  UI.HeaderInfo: { TypeName: 'Reisextensie', TypeNamePlural: 'Reisextensies', Title: { Value: TripID } },
  UI.SelectionFields: [ ApprovalStatus ],
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: TripID,         Label: 'Trip ID' },
    { $Type: 'UI.DataField', Value: StartsAt,        Label: 'Vertrekdatum' },
    { $Type: 'UI.DataField', Value: ProjectCode,    Label: 'Projectcode' },
    { $Type: 'UI.DataField', Value: ApprovalStatus, Label: 'Goedkeuringsstatus' },
    { $Type: 'UI.DataField', Value: InternalNote,   Label: 'Interne notitie' }
  ],
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Reisgegevens (TripPin)', Target: '@UI.FieldGroup#TripPinInfo' },
    { $Type: 'UI.ReferenceFacet', Label: 'PrimePath Interne Velden', Target: '@UI.FieldGroup#PrimePath' }
  ],
  UI.FieldGroup#TripPinInfo: { Label: 'Reisgegevens (TripPin)', Data: [
    { $Type: 'UI.DataField', Value: TripName,        Label: 'Reisnaam' },
    { $Type: 'UI.DataField', Value: TripBudget,      Label: 'Budget' },
    { $Type: 'UI.DataField', Value: TripDescription, Label: 'Beschrijving' },
    { $Type: 'UI.DataField', Value: StartsAt,        Label: 'Vertrekdatum' }
  ]},
  UI.FieldGroup#PrimePath: { Label: 'Interne PrimePath Velden', Data: [
    { $Type: 'UI.DataField', Value: TripID,         Label: 'Trip ID' },
    { $Type: 'UI.DataField', Value: ProjectCode,    Label: 'Projectcode' },
    { $Type: 'UI.DataField', Value: ApprovalStatus, Label: 'Goedkeuringsstatus' },
    { $Type: 'UI.DataField', Value: InternalNote,   Label: 'Interne notitie' }
  ]}
);
annotate TravelService.TravelExtensions with {
  TripID         @title: 'Trip ID';
  ProjectCode    @title: 'Projectcode';
  ApprovalStatus @title: 'Goedkeuringsstatus';
  InternalNote   @title: 'Interne notitie';
}
annotate TravelService.People with @(
  UI.HeaderInfo: {
    TypeName: 'Medewerker',
    TypeNamePlural: 'Medewerkers',
    Title: { Value: FirstName },
    Description: { Value: LastName }
  },
  UI.SelectionFields: [ LastName, UserName ],
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: UserName,  Label: 'Gebruikersnaam' },
    { $Type: 'UI.DataField', Value: FirstName, Label: 'Voornaam' },
    { $Type: 'UI.DataField', Value: LastName,  Label: 'Familienaam' },
    { $Type: 'UI.DataField', Value: Gender,    Label: 'Geslacht' }
  ],
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Persoonsgegevens', Target: '@UI.FieldGroup#PersonInfo' },
    { $Type: 'UI.ReferenceFacet', Label: 'Reisoverzicht', Target: 'Trips/@UI.LineItem' }
  ],
  UI.FieldGroup#PersonInfo: { Label: 'Medewerkerdetails', Data: [
    { $Type: 'UI.DataField', Value: UserName,  Label: 'Gebruikersnaam' },
    { $Type: 'UI.DataField', Value: FirstName, Label: 'Voornaam' },
    { $Type: 'UI.DataField', Value: LastName,  Label: 'Familienaam' },
    { $Type: 'UI.DataField', Value: Gender,    Label: 'Geslacht' }
  ]}
);
annotate TravelService.Airlines with @(
  UI.HeaderInfo: { TypeName: 'Airline', TypeNamePlural: 'Airlines', Title: { Value: Name }, Description: { Value: AirlineCode } },
  UI.SelectionFields: [ AirlineCode ],
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: AirlineCode, Label: 'IATA-code' },
    { $Type: 'UI.DataField', Value: Name,        Label: 'Naam' }
  ],
  UI.Facets: [{ $Type: 'UI.ReferenceFacet', Label: 'Airline details', Target: '@UI.FieldGroup#AirlineInfo' }],
  UI.FieldGroup#AirlineInfo: { Label: 'Airlinegegevens', Data: [
    { $Type: 'UI.DataField', Value: AirlineCode, Label: 'IATA-code' },
    { $Type: 'UI.DataField', Value: Name,        Label: 'Naam' }
  ]}
);
annotate TravelService.Airports with @(
  UI.HeaderInfo: { TypeName: 'Luchthaven', TypeNamePlural: 'Luchthavens', Title: { Value: Name }, Description: { Value: IataCode } },
  UI.SelectionFields: [ IcaoCode, IataCode ],
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: IcaoCode, Label: 'ICAO-code' },
    { $Type: 'UI.DataField', Value: IataCode, Label: 'IATA-code' },
    { $Type: 'UI.DataField', Value: Name,     Label: 'Naam' }
  ],
  UI.Facets: [{ $Type: 'UI.ReferenceFacet', Label: 'Luchthaven details', Target: '@UI.FieldGroup#AirportInfo' }],
  UI.FieldGroup#AirportInfo: { Label: 'Luchthavens', Data: [
    { $Type: 'UI.DataField', Value: IcaoCode, Label: 'ICAO-code' },
    { $Type: 'UI.DataField', Value: IataCode, Label: 'IATA-code' },
    { $Type: 'UI.DataField', Value: Name,     Label: 'Naam' }
  ]}
);
