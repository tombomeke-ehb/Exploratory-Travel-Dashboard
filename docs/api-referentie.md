# API-referentie

Alle services zijn OData V4 en vereisen een geldige JWT-cookie (`primepath_auth`).

---

## Authenticatie

### POST /auth/login

Authenticeert een gebruiker en zet een httpOnly JWT-cookie.

**Request body:**
```json
{ "username": "traveladmin", "password": "Admin1234!" }
```

**Succes (200):**
```json
{ "role": "TravelAdmin", "name": "Travel Coordinator" }
```

**Fouten:** `400` (ontbrekende velden), `401` (ongeldige credentials), `429` (rate limit: max 10/15min)

### POST /auth/logout

Wist het JWT-cookie. Retourneert `{ "ok": true }`.

---

## TravelService (/travel)

**Rol:** `TravelAdmin` — volledige toegang.

### Entiteiten

| Entiteit | Methoden | Beschrijving |
|----------|----------|-------------|
| `People` | GET | Medewerkers met OnTravel-badge en Email |
| `Trips` | GET | Reizen (TripPin + PrimePath-extensies gemerged) |
| `Airlines` | GET | Airlines met TripCount |
| `Airports` | GET | Luchthavens met City |
| `TravelExtensions` | GET, POST, PATCH, DELETE | PrimePath-velden per reis |
| `UserMapping` | GET, POST, PATCH, DELETE | Team-koppelingen |

### KPI-functies

| Functie | Return | Beschrijving |
|---------|--------|-------------|
| `getActiveTripsCount()` | Integer | Actieve reizen vandaag (fallback: 7) |
| `getOnTravelCount()` | Integer | Medewerkers op reis (fallback: 3) |
| `getUpcomingTripsCount()` | Integer | Reizen binnen 14 dagen (fallback: 4) |
| `getTopAirline()` | Object | Meest gebruikte airline |
| `getAirlineStats()` | Array | Airlinegebruik (TripCount + TotalBudget) |

**Voorbeeld:**
```
GET /travel/getActiveTripsCount()
→ { "value": 7 }
```

### Bound actions op TravelExtensions

| Actie | Beschrijving |
|-------|-------------|
| `goedkeuren()` | Zet ApprovalStatus op Approved |
| `afkeuren()` | Zet ApprovalStatus op Rejected |
| `inBehandeling()` | Zet ApprovalStatus terug op Pending |
| `bewerkNotitie(ProjectCode, InternalNote)` | Wijzig projectcode en/of notitie |

**Voorbeeld:**
```
POST /travel/TravelExtensions(1003)/TravelService.goedkeuren
→ 200 { "TripID": 1003, "ApprovalStatus": "Approved", ... }
```

### Validatieregels

| Veld | Regel | Fout |
|------|-------|------|
| ProjectCode | Moet beginnen met `PROJ-` | 400 |
| ApprovalStatus | Alleen `Pending`, `Approved`, `Rejected` | 400 |
| InternalNote | Max 500 tekens | 400 |

---

## TeamService (/team)

**Rol:** `TeamLead` — alleen eigen teamleden.

### Entiteiten

| Entiteit | Methoden | Beschrijving |
|----------|----------|-------------|
| `People` | GET | Teamleden met OnTravel, NextTripName, NextTripDate |
| `Trips` | GET | Reizen van teamleden |
| `Airlines` | GET | Airlines |
| `TravelExtensions` | GET, PATCH | Extensies van teamreizen; CREATE/DELETE → 403 |
| `UserMapping` | GET | Team-koppelingen (read-only) |

### Autorisatie

- **Teamfiltering:** People, Trips en TravelExtensions worden gefilterd op de teamleden van de ingelogde TeamLead (via `UserMapping.TeamLeadUserName`).
- **Schrijfbeperking:** alleen `ApprovalStatus` mag gewijzigd worden; andere velden → 403.
- **Eigenaarschap:** een reis die niet bij een teamlid hoort → 403.

### Bound actions op TravelExtensions

| Actie | Beschrijving |
|-------|-------------|
| `goedkeuren()` | Zet ApprovalStatus op Approved (met teamcheck) |
| `afkeuren()` | Zet ApprovalStatus op Rejected (met teamcheck) |
| `inBehandeling()` | Zet ApprovalStatus terug op Pending (met teamcheck) |

### KPI-functie

| Functie | Return | Beschrijving |
|---------|--------|-------------|
| `getPendingCount()` | Integer | Openstaande goedkeuringen van eigen team |

---

## HRService (/hr)

**Rol:** `TravelViewer` — volledig read-only.

### Entiteiten

| Entiteit | Methoden | Beschrijving |
|----------|----------|-------------|
| `People` | GET | Alle medewerkers |
| `Trips` | GET | Alle reizen |
| `Airlines` | GET | Airlines met TripCount |
| `Airports` | GET | Luchthavens met City |
| `TravelExtensions` | GET | Extensies met StatusLabel (read-only) |

### Functies

| Functie | Return | Beschrijving |
|---------|--------|-------------|
| `getAirlineStats()` | Array | Airlinegebruik (TripCount + TotalBudget) |
| `getTripCountByPeriod(from, to)` | Integer | Aantal reizen in een datumperiode |

**Voorbeeld:**
```
GET /hr/getTripCountByPeriod(from='2014-01-01',to='2014-12-31')
→ { "value": 8 }
```

---

## AdminService (/admin)

**Rol:** `TravelAdmin`

### Entiteiten

| Entiteit | Methoden | Beschrijving |
|----------|----------|-------------|
| `Users` | GET, POST, PATCH, DELETE | Gebruikersbeheer (**zonder passwordHash**) |
