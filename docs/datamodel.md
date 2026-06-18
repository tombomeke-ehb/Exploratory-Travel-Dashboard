# Datamodel

## Overzicht

Het project combineert twee databronnen:

1. **Lokale database** (SQLite dev / HANA prod) — PrimePath-specifieke entiteiten
2. **TripPin OData V4** (extern, read-only) — reisdata van Microsoft

De koppeling loopt via `TripID` (TravelExtensions ↔ TripPin Trips) en `TripPinUserName` (UserMapping/Users ↔ TripPin People).

---

## Lokale entiteiten (db/schema.cds)

### TravelExtensions

PrimePath-velden die aan een TripPin-reis worden gekoppeld via TripID.

| Veld | Type | Beschrijving |
|------|------|-------------|
| `TripID` (PK) | Integer | Verwijst naar TripPin Trips.TripId |
| `ProjectCode` | String(30) | Interne projectreferentie, begint met `PROJ-` |
| `ApprovalStatus` | ApprovalStatus | `Pending` / `Approved` / `Rejected` |
| `InternalNote` | String(500) | Vrij tekstveld voor opmerkingen |
| `createdAt` | DateTime | Automatisch (managed) |
| `createdBy` | String | Automatisch (managed) |
| `modifiedAt` | DateTime | Automatisch (managed) |
| `modifiedBy` | String | Automatisch (managed) |

**ApprovalStatus enum:**

| Waarde | Nederlands |
|--------|-----------|
| `Pending` | In behandeling |
| `Approved` | Goedgekeurd |
| `Rejected` | Afgekeurd |

### UserMapping

Koppelt een medewerker aan zijn/haar Team Lead, puur via TripPin-gebruikersnamen.

| Veld | Type | Beschrijving |
|------|------|-------------|
| `TripPinUserName` (PK) | String(256) | TripPin UserName van de medewerker |
| `TeamLeadUserName` | String(256) | TripPin UserName van de Team Lead |
| `DisplayName` | String(256) | Weergavenaam van de medewerker |

### Users

Lokale gebruikerstabel voor authenticatie.

| Veld | Type | Beschrijving |
|------|------|-------------|
| `username` (PK) | String(128) | Loginnaam |
| `passwordHash` | String(256) | bcrypt-hash (saltfactor 10) — **nooit via API zichtbaar** |
| `role` | String(50) | `TravelAdmin` / `TeamLead` / `TravelViewer` |
| `displayName` | String(256) | Weergavenaam |
| `tripPinUserName` | String(256) | Koppeling aan TripPin-identiteit (vereist voor TeamLead) |

---

## Externe entiteiten (TripPin OData V4)

Gedefinieerd in `srv/external/TripPin.cds`, geprojecteerd in `srv/shared.cds`.

### People

| Veld | Type | Beschrijving |
|------|------|-------------|
| `UserName` (PK) | String | Unieke gebruikersnaam |
| `FirstName` | String | Voornaam |
| `LastName` | String | Familienaam |
| `Gender` | String | `Male` / `Female` |
| `Emails` | many String | E-mailadressen |

**Virtuele velden (per service):**

| Veld | Service | Beschrijving |
|------|---------|-------------|
| `OnTravel` | Travel, Team | Boolean — is de persoon momenteel op reis? |
| `Email` | Travel | Eerste e-mailadres (scalair) |
| `NextTripName` | Team | Naam van de eerstvolgende reis |
| `NextTripDate` | Team | Datum van de eerstvolgende reis |

### Trips

| Veld | Type | Beschrijving |
|------|------|-------------|
| `TripId` (PK) | Integer | Reis-ID |
| `Name` | String | Reisnaam |
| `Budget` | Decimal | Reisbudget |
| `Description` | String | Beschrijving |
| `StartsAt` | DateTime | Vertrekdatum |
| `EndsAt` | DateTime | Aankomstdatum |

### Airlines

| Veld | Type | Beschrijving |
|------|------|-------------|
| `AirlineCode` (PK) | String | IATA-code (bijv. AA, FM) |
| `Name` | String | Naam van de luchtvaartmaatschappij |

**Virtueel:** `TripCount` (Travel, HR) — aantal boekingen uit airline-stats.

### Airports

| Veld | Type | Beschrijving |
|------|------|-------------|
| `IcaoCode` (PK) | String | ICAO-code |
| `IataCode` | String | IATA-code |
| `Name` | String | Naam van de luchthaven |

**Virtueel:** `City` (Travel, HR) — stad uit het geneste `Location.City.Name`.

---

## Seed-data (db/data/)

### primepath-Users.csv

| username | rol | tripPinUserName |
|----------|-----|-----------------|
| `traveladmin` | TravelAdmin | – |
| `teamlead` | TeamLead | `angelhuffman` |
| `teamlead2` | TeamLead | `willieashmore` |
| `hrviewer` | TravelViewer | – |

### primepath-UserMapping.csv

**Team 1** (teamlead → angelhuffman):
`russellwhyte`, `scottketchum`, `ronaldmundy`, `javieralfred`

**Team 2** (teamlead2 → willieashmore):
`vincentcalabrese`, `clydeguess`, `salliesampson`

### primepath-TravelExtensions.csv

| TripID | ProjectCode | Status | Eigenaar (via TripPin) |
|--------|------------|--------|----------------------|
| 0 | PROJ-2024-001 | Approved | russellwhyte (team 1) |
| 1 | PROJ-2024-004 | Approved | scottketchum (team 1) |
| 2 | PROJ-2024-005 | Pending | scottketchum (team 1) |
| 3 | PROJ-2024-006 | Approved | ronaldmundy (team 1) |
| 1003 | PROJ-2024-002 | Pending | russellwhyte (team 1) |
| 1007 | PROJ-2024-003 | Rejected | javieralfred (team 1) |
| 5007 | PROJ-2024-007 | Pending | willieashmore (team 2) |
| 7010 | PROJ-2024-008 | Approved | vincentcalabrese (team 2) |
| 8011 | PROJ-2024-009 | Rejected | clydeguess (team 2) |

---

## Relatiediagram

```
TripPin (extern)                    Lokaal (SQLite/HANA)
┌──────────┐                        ┌──────────────────┐
│ People   │◄──TripPinUserName─────►│ UserMapping      │
│ UserName │                        │ TripPinUserName  │
│ Trips[ ] │                        │ TeamLeadUserName │
└────┬─────┘                        └────────┬─────────┘
     │                                       │
     │ TripId                                 │ TripPinUserName
     ▼                                       ▼
┌──────────┐    TripID              ┌──────────────────┐
│ Trips    │◄──────────────────────►│ TravelExtensions │
│ TripId   │                        │ TripID           │
│ Name     │                        │ ApprovalStatus   │
│ Budget   │                        │ ProjectCode      │
└──────────┘                        └──────────────────┘
                                             ▲
                                             │ username
                                    ┌────────┴─────────┐
                                    │ Users            │
                                    │ username         │
                                    │ role             │
                                    │ tripPinUserName  │
                                    └──────────────────┘
```
