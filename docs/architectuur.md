# Architectuur

## Systeemoverzicht

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser                                                            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Travel       │  │ Team         │  │ HR           │              │
│  │ Dashboard    │  │ Dashboard    │  │ Dashboard    │              │
│  │ (Fiori Elem.)│  │ (Fiori Elem.)│  │ (Fiori Elem.)│              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐              │
│  │ travel-start │  │ team-start   │  │ hr-start     │              │
│  │ (KPI-pagina) │  │ (KPI-pagina) │  │ (KPI-pagina) │              │
│  └──────┬───────┘  └──────┴───────┘  └──────┬───────┘              │
└─────────┼──────────────────┼────────────────┼───────────────────────┘
          │    OData V4      │                │
          ▼                  ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SAP CAP (Node.js) — server.js                                      │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │ TravelSvc   │  │ TeamService │  │ HRService   │  │ AdminSvc  │ │
│  │ /travel     │  │ /team       │  │ /hr         │  │ /admin    │ │
│  │ TravelAdmin │  │ TeamLead    │  │ TravelViewer│  │ TravelAdmin│ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘ │
│         │                │                │                │       │
│  ┌──────┴────────────────┴────────────────┴────────────────┘       │
│  │                                                                  │
│  │  auth-strategy.js ← JWT-cookie verificatie                       │
│  │  trippin-trips.js ← Gedeelde TripPin-aggregatie + cache          │
│  │                                                                  │
│  └──────┬─────────────────────────────┬────────────────────────────┘│
│         │                             │                             │
│         ▼                             ▼                             │
│  ┌─────────────┐              ┌──────────────┐                     │
│  │ SQLite/HANA │              │ TripPin      │                     │
│  │ (lokaal)    │              │ OData V4     │                     │
│  │             │              │ (extern)     │                     │
│  │ Extensions  │              │              │                     │
│  │ UserMapping │              │ People       │                     │
│  │ Users       │              │ Trips        │                     │
│  └─────────────┘              │ Airlines     │                     │
│                               │ Airports     │                     │
│                               └──────────────┘                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Componenten

### Frontend (app/)

| Component | Type | Beschrijving |
|-----------|------|-------------|
| `index.html` | Statisch | Landingspagina met rolkeuze |
| `*-login.html` | Statisch | Loginpagina per rol (pre-filled demo-account) |
| `*-start.html` | Statisch + JS | KPI-startscherm (niveau 1) met live data via fetch |
| `*/webapp/` | Fiori Elements | List Report + Object Page (niveau 2 & 3) |

### Backend (srv/)

| Bestand | Verantwoordelijkheid |
|---------|---------------------|
| `server.js` | Bootstrap: cookie-parser, auth-gate, login/logout, statische pagina's |
| `auth-strategy.js` | Custom CDS-auth: JWT-cookie → `cds.context.user` |
| `jwt-config.js` | Gedeelde JWT_SECRET met hardfail in productie |
| `shared.cds` | Gedeelde TripPin-projecties (People/Trips/Airlines/Airports) |
| `travel-service.cds/.js` | TravelAdmin service + KPI-functies |
| `team-service.cds/.js` | TeamLead service + teamcheck-autorisatie |
| `hr-service.cds/.js` | HR read-only service + statistieken |
| `admin-service.cds` | Gebruikersbeheer (zonder passwordHash) |
| `trippin-trips.js` | TripPin-aggregatie, caching, client-side query |

### Dataopslag (db/)

| Bron | Type | Inhoud |
|------|------|--------|
| SQLite (dev) / HANA (prod) | Lokaal | TravelExtensions, UserMapping, Users |
| TripPin OData V4 | Extern, read-only | People, Trips, Airlines, Airports |

## Dataflow: reis goedkeuren

```
1. TeamLead klikt "Goedkeuren" op reis 1003
2. Fiori stuurt: POST /team/TravelExtensions(1003)/TeamService.goedkeuren
3. team-service.js:
   a. _tripIdFromParams(req) → 1003
   b. _assertTeamOwnership(req, 1003, TripPin):
      - Zoek Users.tripPinUserName op voor de ingelogde gebruiker
      - Zoek teamleden via UserMapping.TeamLeadUserName
      - Verzamel TripIDs van alle teamleden via TripPin People/Trips
      - Controleer: zit 1003 erbij? Ja → door. Nee → 403.
   c. UPDATE TravelExtensions SET ApprovalStatus='Approved' WHERE TripID=1003
   d. SELECT TravelExtensions WHERE TripID=1003 → return + StatusLabel
4. Fiori ontvangt het bijgewerkte record en ververst de UI
```

## Caching

TripPin-data wordt 5 minuten in-memory gecachet (`CACHE_TTL = 5 * 60 * 1000`):

| Cache | Bestand | Wat |
|-------|---------|-----|
| `collectAllTrips` | `trippin-trips.js` | Alle reizen via People-navigatie |
| `_buildAirlineStats` | `travel-service.js` | Airlinegebruik (vluchten + budget) |
| `_airportCities` | `travel-service.js` | Luchthaven → stad mapping |

Caches worden bij boot pre-warmed. Lege resultaten worden niet gecachet om cache-poisoning te voorkomen.

## Bewuste keuzes

| Keuze | Reden |
|-------|-------|
| Geen XSUAA | Schoolproject; eigen JWT-auth is eenvoudiger en demonstreert het concept |
| Geen draft-editing | Conflicteert met virtuele TripPin-velden; bound actions als alternatief |
| `LocalStorageConnector` | Geen LREP-backend; personalisatie werkt in-memory via localStorage |
| Demo-fallbacks | TripPin-data is van 2014; KPI's en OnTravel-badge gebruiken hardcoded waarden |
| Client-side query | TripPin ondersteunt geen $search; filtering/sortering na verrijking in JS |
