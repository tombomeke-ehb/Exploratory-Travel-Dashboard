// Fiori Annotations - HR Dashboard
annotate HRService.Airlines with @(
  UI.PresentationVariant: { SortOrder: [{ Property: Name, Descending: false }], Visualizations: ['@UI.LineItem'] },
  UI.HeaderInfo: { TypeName: 'Airline', TypeNamePlural: 'Airlines', Title: { Value: Name }, Description: { Value: AirlineCode } },
  UI.SelectionFields: [ AirlineCode ],
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: AirlineCode, Label: 'IATA-code' },
    { $Type: 'UI.DataField', Value: Name, Label: 'Naam' },
    { $Type: 'UI.DataField', Value: TripCount, Label: 'Boekingen' }
  ],
  UI.Facets: [{ $Type: 'UI.ReferenceFacet', Label: 'Airline', Target: '@UI.FieldGroup#AirlineInfo' }],
  UI.FieldGroup#AirlineInfo: { Label: 'Airlinegegevens', Data: [
    { $Type: 'UI.DataField', Value: AirlineCode, Label: 'IATA-code' },
    { $Type: 'UI.DataField', Value: Name,        Label: 'Naam' },
    { $Type: 'UI.DataField', Value: TripCount,   Label: 'Boekingen' }
  ]}
);
annotate HRService.Trips with @(
  UI.PresentationVariant: { SortOrder: [{ Property: StartsAt, Descending: false }], Visualizations: ['@UI.LineItem'] },
  UI.HeaderInfo: { TypeName: 'Reis', TypeNamePlural: 'Reizen', Title: { Value: Name }, Description: { Value: StartsAt } },
  UI.SelectionFields: [ StartsAt, EndsAt ],
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: TripId, Label: 'Trip ID' },
    { $Type: 'UI.DataField', Value: Name, Label: 'Naam' },
    { $Type: 'UI.DataField', Value: StartsAt, Label: 'Vertrek' },
    { $Type: 'UI.DataField', Value: EndsAt, Label: 'Aankomst' },
    { $Type: 'UI.DataField', Value: Budget, Label: 'Budget' }
  ],
  UI.Facets: [{ $Type: 'UI.ReferenceFacet', Label: 'Reisgegevens', Target: '@UI.FieldGroup#TripInfo' }],
  UI.FieldGroup#TripInfo: { Label: 'Reisgegevens', Data: [
    { $Type: 'UI.DataField', Value: TripId,   Label: 'Trip ID' },
    { $Type: 'UI.DataField', Value: Name,     Label: 'Naam' },
    { $Type: 'UI.DataField', Value: StartsAt, Label: 'Vertrek' },
    { $Type: 'UI.DataField', Value: EndsAt,   Label: 'Aankomst' },
    { $Type: 'UI.DataField', Value: Budget,   Label: 'Budget' }
  ]}
);
annotate HRService.TravelExtensions with @(
  UI.HeaderInfo: { TypeName: 'Reisextensie', TypeNamePlural: 'Reisextensies', Title: { Value: TripID } },
  UI.SelectionFields: [ ApprovalStatus ],
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: TripID,         Label: 'Trip ID' },
    { $Type: 'UI.DataField', Value: ProjectCode,    Label: 'Projectcode' },
    { $Type: 'UI.DataField', Value: StatusLabel,    Label: 'Goedkeuringsstatus', Criticality: { $edmJson: { $If: [
        { $Eq: [{ $Path: 'ApprovalStatus' }, 'Approved'] }, 3,
        { $If: [{ $Eq: [{ $Path: 'ApprovalStatus' }, 'Rejected'] }, 1, 2] }
    ]}} },
    { $Type: 'UI.DataField', Value: InternalNote,   Label: 'Interne notitie' }
  ],
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Reisextensie', Target: '@UI.FieldGroup#ExtInfo' }
  ],
  UI.FieldGroup#ExtInfo: { Label: 'Reisextensie details', Data: [
    { $Type: 'UI.DataField', Value: TripID,         Label: 'Trip ID' },
    { $Type: 'UI.DataField', Value: ProjectCode,    Label: 'Projectcode' },
    { $Type: 'UI.DataField', Value: StatusLabel,    Label: 'Goedkeuringsstatus', Criticality: { $edmJson: { $If: [
        { $Eq: [{ $Path: 'ApprovalStatus' }, 'Approved'] }, 3,
        { $If: [{ $Eq: [{ $Path: 'ApprovalStatus' }, 'Rejected'] }, 1, 2] }
    ]}} },
    { $Type: 'UI.DataField', Value: InternalNote,   Label: 'Interne notitie' },
    { $Type: 'UI.DataField', Value: modifiedAt,     Label: 'Laatst gewijzigd op' },
    { $Type: 'UI.DataField', Value: modifiedBy,     Label: 'Laatst gewijzigd door' }
  ]}
);
annotate HRService.Airports with @(
  UI.PresentationVariant: { SortOrder: [{ Property: Name, Descending: false }], Visualizations: ['@UI.LineItem'] },
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
annotate HRService.People with @(
  UI.PresentationVariant: { SortOrder: [{ Property: LastName, Descending: false }], Visualizations: ['@UI.LineItem'] },
  UI.HeaderInfo: { TypeName: 'Medewerker', TypeNamePlural: 'Medewerkers', Title: { Value: LastName }, Description: { Value: UserName } },
  UI.SelectionFields: [ LastName ],
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: UserName, Label: 'Gebruikersnaam' },
    { $Type: 'UI.DataField', Value: FirstName, Label: 'Voornaam' },
    { $Type: 'UI.DataField', Value: LastName, Label: 'Familienaam' }
  ],
  UI.Facets: [{ $Type: 'UI.ReferenceFacet', Label: 'Persoonsgegevens', Target: '@UI.FieldGroup#PersonInfo' }],
  UI.FieldGroup#PersonInfo: { Label: 'Medewerkerdetails', Data: [
    { $Type: 'UI.DataField', Value: UserName,  Label: 'Gebruikersnaam' },
    { $Type: 'UI.DataField', Value: FirstName, Label: 'Voornaam' },
    { $Type: 'UI.DataField', Value: LastName,  Label: 'Familienaam' }
  ]}
);
