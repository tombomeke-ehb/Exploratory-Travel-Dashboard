# Documentatie — Exploratory Travel Dashboard

**PrimePath Travel · EhB Cloud Integration × Flexso · Demo: 19 juni 2026**

> Dit document beschrijft de volledige technische en functionele opbouw van het project.
> Zie ook: `DEMO.md` (presentatieflow) · `TESTPLAN.md` (verwachte waarden per rol) · `CLAUDE.md` (ontwikkelrichtlijnen).

---

## Inhoudsopgave

1. [Projectoverzicht](#1-projectoverzicht)
2. [Architectuur](#2-architectuur)
3. [Datamodel](#3-datamodel)
4. [Services (backend)](#4-services-backend)
5. [Authenticatie & autorisatie](#5-authenticatie--autorisatie)
6. [Frontend](#6-frontend)
7. [Externe service: TripPin](#7-externe-service-trippin)
8. [Lokaal ontwikkelen](#8-lokaal-ontwikkelen)
9. [Productie-deploy (BTP)](#9-productie-deploy-btp)
10. [Demo-accounts](#10-demo-accounts)
11. [Bekende beperkingen](#11-bekende-beperkingen)

---

## 1. Projectoverzicht

Het **Exploratory Travel Dashboard** is een centraal webdashboard voor PrimePath Travel, gebouwd als schoolproject voor de opleiding **EhB Cloud Integration** in samenwerking met **Flexso**.

Het platform biedt drie op maat gemaakte dashboards — één per bedrijfsrol — bovenop een gemeenschappelijke CAP-backend. Reisdata komt uit de externe **TripPin OData V4**-service (publieke Microsoft-demo); PrimePath-specifieke velden (projectcode, goedkeuringsstatus, interne notitie) worden lokaal bijgehouden en via `TripID` aan TripPin-reizen gekoppeld.

### Rollen en apps

| App | Doelgroep | CAP-rol (`@requires`) | Service-pad | Startscherm |
|-----|-----------|-----------------------|-------------|-------------|
| Travel Dashboard | Travel Coördinator | `TravelAdmin` | `/travel` | `travel-start.html` |
| Team Dashboard | Team Lead | `TeamLead` | `/team` | `team-start.html` |
| HR Dashboard | HR / Administratie | `TravelViewer` | `/hr` | `hr-start.html` |

### Technologiestack

| Laag | Technologie |
|------|-------------|
| Backend | SAP CAP (Node.js) |
| Frontend (lijsten/detail) | SAP Fiori Elements (OData V4) |
| Frontend (startschermen/login) | Vanilla HTML/CSS/JS (SPA met hash-navigatie) |
| Database (lokaal) | SQLite (in-memory bij `cds watch`, persistent bij `cds-serve`) |
| Database (productie) | SAP HANA (via BTP) |
| Authenticatie | Eigen JWT-systeem (bcrypt + httpOnly-cookie); **geen XSUAA** |
| Externe data | TripPin OData V4 (Microsoft demo-service) |
| Hosting | SAP Business Technology Platform (Cloud Foundry) |

---

## 2. Architectuur

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ *-login.html │  │ *-start.html │  │ webapp/index.html│  │
│  │ (Vanilla JS) │  │ (Vanilla SPA)│  │ (Fiori Elements) │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼───────────────────┼────────────┘
          │ POST /auth/login │ fetch /travel|team│/hr + cookie
          ▼                 ▼                   ▼ (XHR + cookie)
┌─────────────────────────────────────────────────────────────┐
│                     CAP Node.js server                      │
│                                                             │
│  ┌──────────────────┐   ┌─────────────────────────────────┐ │
│  │  server.js       │   │  Auth-strategy (jwt-cookie)     │ │
│  │  - /auth/login   │   │  cds.context.user ← JWT-cookie  │ │
│  │  - /auth/logout  │   │  @requires: TravelAdmin /       │ │
│  │  - auth-gate     │   │             TeamLead /          │ │
│  │  - rate limiting │   │             TravelViewer        │ │
│  └──────────────────┘   └─────────────────────────────────┘ │
│                                                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐  │
│  │ TravelService │ │  TeamService  │ │    HRService      │  │
│  │ /travel       │ │  /team        │ │    /hr            │  │
│  │ travel-service│ │ team-service  │ │  hr-service       │  │
│  │ .cds + .js    │ │ .cds + .js    │ │  .cds + .js       │  │
│  └───────┬───────┘ └───────┬───────┘ └────────┬──────────┘  │
│          └────────────────┬┘                  │             │
│                    ┌──────┘───────────────────┘             │
│                    ▼                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  shared.cds — gedeelde TripPin-projecties            │   │
│  │  (People / Trips / Airlines / Airports)              │   │
│  └──────────────────────────┬───────────────────────────┘   │
│                             │                               │
│  ┌──────────────────────────┼───────────────────────────┐   │
│  │  Lokale DB (SQLite/HANA) │  TripPin OData V4 (extern)│   │
│  │  - TravelExtensions      │  - People                  │   │
│  │  - UserMapping           │  - Trips + PlanItems       │   │
│  │  - Users                 │  - Airlines / Airports     │   │
│  └──────────────────────────┴───────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Bestandsstructuur

```
app/
  index.html               # Landingspagina (3 rolkaarten)
  travel-login.html        # Loginpagina Travel Coördinator (blauw)
  travel-start.html        # KPI-startscherm Travel Coördinator (SPA)
  team-login.html          # Loginpagina Team Lead (groen)
  team-start.html          # KPI-startscherm Team Lead (SPA)
  hr-login.html            # Loginpagina HR / Administratie (oranje)
  hr-start.html            # KPI-startscherm HR (SPA)
  travel-dashboard/webapp/ # Fiori Elements-app Travel Coördinator
  team-dashboard/webapp/   # Fiori Elements-app Team Lead
  hr-dashboard/webapp/     # Fiori Elements-app HR / Administratie

db/
  schema.cds               # TravelExtensions, UserMapping, Users
  data/
    primepath-Users.csv              # Seed-data demo-accounts
    primepath-UserMapping.csv        # Seed-data teamkoppelingen
    primepath-TravelExtensions.csv   # Seed-data PrimePath-velden

srv/
  shared.cds               # Gedeelde TripPin-projecties (één bron)
  travel-service.cds       # Travel-servicemodel (entiteiten + KPI-functies)
  travel-service.js        # Travel-service handler (KPI's, CRUD, validatie)
  team-service.cds         # Team-servicemodel (goedkeuren/afkeuren actions)
  team-service.js          # Team-service handler (teamcheck, goedkeuringslogica)
  hr-service.cds           # HR-servicemodel (read-only + statistieken)
  hr-service.js            # HR-service handler (airline-stats, datumfilter)
  auth-strategy.js         # Custom CDS-auth: JWT-cookie → cds.context.user
  jwt-config.js            # JWT_SECRET-beheer + hardfail in productie
  external/TripPin.cds     # Externe TripPin-servicedefinitie

server.js                  # Bootstrap: /auth/*, auth-gate, statische bestanden
.cdsrc.json                # Auth-profielen (dev/prod)
mta.yaml                   # BTP/MTA-deployment
```

---

## 3. Datamodel

### 3.1 TravelExtensions

Koppelt PrimePath-specifieke velden aan een TripPin-reis via `TripID`. Erft `createdAt / createdBy / modifiedAt / modifiedBy` van de CAP `managed`-mixin (auditspoor).

| Veld | Type | Beschrijving |
|------|------|--------------|
| `TripID` *(sleutel)* | Integer | Verwijst naar `TripId` in TripPin |
| `ProjectCode` | String(30) | Interne projectreferentie. Moet beginnen met `PROJ-`. |
| `ApprovalStatus` | Enum | `Pending` / `Approved` / `Rejected` |
| `InternalNote` | String(500) | Vrij tekstveld. Max. 500 tekens. |
| `createdAt` | DateTime | Automatisch ingevuld door CAP |
| `createdBy` | String | Automatisch ingevuld (ingelogde gebruikersnaam) |
| `modifiedAt` | DateTime | Automatisch bijgewerkt bij elke wijziging |
| `modifiedBy` | String | Automatisch bijgewerkt (ingelogde gebruikersnaam) |

Virtuele velden (niet opgeslagen in de DB, ingevuld vanuit TripPin in de READ-handler):

| Virtueel veld | Beschrijving |
|---------------|--------------|
| `StartsAt` | Vertrekdatum van de TripPin-reis |
| `EndsAt` | Aankomstdatum |
| `TripName` | Naam van de reis |
| `TripBudget` | Budget |
| `TripDescription` | Beschrijving |

### 3.2 UserMapping

Koppelt de TripPin-gebruikersnaam van een medewerker aan de TripPin-gebruikersnaam van zijn/haar Team Lead. Puur TripPin-gebaseerd — geen BTP-afhankelijkheid.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `TripPinUserName` *(sleutel)* | String(256) | UserName medewerker in TripPin |
| `TeamLeadUserName` | String(256) | UserName verantwoordelijke Team Lead |
| `DisplayName` | String(256) | Weergavenaam van de medewerker |

### 3.3 Users

Lokale gebruikerstabel voor dashboard-authenticatie. Vervangt SAP XSUAA.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `username` *(sleutel)* | String(128) | Inlognaam |
| `passwordHash` | String(256) | bcrypt-hash (saltfactor 10) |
| `role` | String(50) | `TravelAdmin` \| `TeamLead` \| `TravelViewer` |
| `displayName` | String(256) | Weergavenaam |
| `tripPinUserName` | String(256) | TripPin-identiteit (vereist voor TeamLead-rol) |

---

## 4. Services (backend)

### 4.1 Gedeelde projecties (`srv/shared.cds`)

Alle drie rollen hebben leestoegang tot dezelfde TripPin-entiteiten. Die worden **één keer** gedefinieerd in `shared.cds` en hergebruikt via `using`. Centrale Nederlandse `@title`-labels (= `@Common.Label`) worden hier ook eenmalig vastgelegd, zodat alle services dezelfde labels erven.

Entiteiten: `People · Trips · Airlines · Airports`

### 4.2 Travel Dashboard Service (`/travel`, rol: `TravelAdmin`)

**Bestand:** `srv/travel-service.cds` + `srv/travel-service.js`

Biedt volledige toegang tot TripPin-data (read-only) en volledige CRUD op `TravelExtensions`.

**Entiteiten:**

| Entiteit | Toegang | Bijzonderheden |
|----------|---------|----------------|
| `People` | Read | + virtuele velden `OnTravel`, `Email` |
| `Trips` | Read | — |
| `Airlines` | Read | + virtueel veld `TripCount` |
| `Airports` | Read | + virtueel veld `City`; `Location`-complextype bewust weggelaten (veroorzaakte 502) |
| `TravelExtensions` | Volledig CRUD | + virtuele TripPin-velden; bound action `bewerk` |
| `UserMapping` | Read + Write | Beheer van teamkoppelingen |

**KPI-functies:**

| Functie | FV | Beschrijving | Retourtype |
|---------|-----|--------------|------------|
| `getActiveTripsCount()` | FV-01 | Totaal actieve reizen vandaag | Integer |
| `getOnTravelCount()` | FV-03 | Medewerkers momenteel op reis | Integer |
| `getUpcomingTripsCount()` | V7 | Komende reizen (binnen 14 dagen) | Integer |
| `getTopAirline()` | FV-02 | Meest gebruikte airline | `{ AirlineCode, Name, TripCount }` |
| `getAirlineStats()` | FV-06/V8 | Top airlines met boekingsaantallen + budget | Array |

> **Let op:** TripPin-data is van **2014**. Reizen die "vandaag actief" zouden zijn bestaan niet. De KPI-functies geven bewuste **demo-fallbackwaarden** terug: `7 / 3 / 4`.

**Bound action `bewerk`:**

Hiermee past de TravelAdmin PrimePath-velden aan via een Fiori-dialoog. Lege parameters blijven ongemoeid (`PATCH`-semantiek). Draft is bewust niet gebruikt — de custom READ-handler (virtuele velden) conflicteert met het CAP draft-mechanisme.

**Validatieregels (before CREATE/UPDATE):**

- `ProjectCode` moet beginnen met `PROJ-`
- `ApprovalStatus` moet een geldige enum-waarde zijn (`Pending / Approved / Rejected`)
- `InternalNote` mag maximaal 500 tekens bevatten

### 4.3 Team Dashboard Service (`/team`, rol: `TeamLead`)

**Bestand:** `srv/team-service.cds` + `srv/team-service.js`

Read-only toegang tot TripPin-data. Schrijven is uitsluitend toegestaan op `ApprovalStatus` van reizen van **eigen teamleden**.

**Entiteiten:**

| Entiteit | Toegang | Bijzonderheden |
|----------|---------|----------------|
| `People` | Read | + `OnTravel`, `NextTripName`, `NextTripDate` |
| `Trips` | Read | — |
| `Airlines` | Read | — |
| `TravelExtensions` | Read + bound actions | `goedkeuren()` / `afkeuren()` |
| `UserMapping` | Read | Teamleden opzoeken |

**Bound actions:**

| Actie | Beschrijving |
|-------|--------------|
| `goedkeuren()` | Zet `ApprovalStatus` op `Approved`; controleert teamlidmaatschap (403 bij niet-teamlid) |
| `afkeuren()` | Zet `ApprovalStatus` op `Rejected`; zelfde teamcheck |
| `getPendingCount()` | Aantal openstaande goedkeuringen voor dit team |

**Teamcheck (`_assertTeamOwnership`):**

De handler vergelijkt het `TripID` van de te bewerken extensie met de verzamelde TripIDs van alle teamleden van de ingelogde Team Lead (via `UserMapping`). Reizen buiten het eigen team geven een **403 Forbidden**. Dit is de veiligheidskritische kern van de teamservice.

### 4.4 HR Dashboard Service (`/hr`, rol: `TravelViewer`)

**Bestand:** `srv/hr-service.cds` + `srv/hr-service.js`

Volledig **read-only**. Focus op statistieken voor rapportage.

**Entiteiten:**

| Entiteit | Toegang | Bijzonderheden |
|----------|---------|----------------|
| `People` | Read | — |
| `Trips` | Read | — |
| `Airlines` | Read | + virtueel veld `TripCount` |
| `Airports` | Read | — |
| `TravelExtensions` | Read | — |

**Statistiekfuncties:**

| Functie | FV | Beschrijving |
|---------|----|--------------|
| `getAirlineStats()` | FV-27/V8 | Airlinegebruik: boekingsaantallen + budget |
| `getTripCountByPeriod(from, to)` | FV-28 | Totaal reizen in een opgegeven periode (ISO 8601 datums) |

---

## 5. Authenticatie & autorisatie

### 5.1 Login-flow

```
Browser                          server.js
  │                                  │
  │── POST /auth/login ──────────────▶│
  │   { username, password }         │
  │                                  │── bcrypt.compare() ──▶ Users-tabel
  │                                  │◀── match / geen match ──
  │                                  │
  │                            [match]│── JWT ondertekenen ──▶ jwt.sign(
  │                                  │     { username, role, displayName, tripPinUserName },
  │                                  │     JWT_SECRET, { expiresIn: '8h' }
  │                                  │   )
  │                                  │── Set-Cookie: primepath_auth (httpOnly, Strict) ──▶
  │◀── 200 { role, displayName } ────│
  │
  │── Redirect naar *-start.html ───▶
```

### 5.2 Sessieverificatie (auth-strategy)

Bij elke CAP-request leest `srv/auth-strategy.js` de `primepath_auth`-cookie, verifieert het JWT met `JWT_SECRET` en zet `cds.context.user` op een `cds.User`-object met de juiste rol. CAP's `@requires`-annotatie op de services doet de rest.

### 5.3 Auth-gate (server.js)

Een Express-middleware vóór de statische bestanden controleert de JWT-cookie bij toegang tot:
- `/travel-dashboard/webapp/*`
- `/team-dashboard/webapp/*`
- `/hr-dashboard/webapp/*`
- `travel-start.html` / `team-start.html` / `hr-start.html`

Geen/ongeldige sessie → **302 redirect** naar de juiste `*-login.html`. Login-/landingspagina's en `/auth/*` zijn publiek.

### 5.4 XHR-interceptor (Fiori-apps)

UI5 gebruikt `XMLHttpRequest` (niet `fetch`) voor alle OData-requests. Elke `webapp/index.html` patcht `XMLHttpRequest.prototype.open` om na elke respons de statuscode te controleren. Bij **401 of 403** volgt een directe redirect naar de juiste loginpagina — ook als de sessie *tijdens* het gebruik verloopt.

### 5.5 Rate limiting

`server.js` gebruikt `express-rate-limit` op `/auth/login`: maximaal **10 pogingen per 15 minuten per IP**. Bij overschrijding: HTTP 429 met de melding *"Te veel inlogpogingen. Probeer het over 15 minuten opnieuw."*

### 5.6 JWT_SECRET-beveiliging

`srv/jwt-config.js` gooit een harde fout bij het opstarten als `JWT_SECRET` in productie ontbreekt of nog de standaard dev-waarde (`primepath-dev-secret-CHANGE-IN-PRODUCTION`) heeft. De app start dan niet op.

### 5.7 Rollenmatrix

| Actie | TravelAdmin | TeamLead | TravelViewer |
|-------|:-----------:|:--------:|:------------:|
| TripPin-data lezen | ✅ | ✅ | ✅ |
| TravelExtensions lezen | ✅ | ✅ | ✅ |
| TravelExtensions bewerken (alle velden) | ✅ | ❌ | ❌ |
| ApprovalStatus eigen teamlid aanpassen | ✅ | ✅ | ❌ |
| ApprovalStatus vreemd teamlid aanpassen | ✅ | ❌ (403) | ❌ |
| UserMapping beheren | ✅ | ❌ | ❌ |
| Statistieken opvragen | ✅ | ❌ | ✅ |

---

## 6. Frontend

### 6.1 Landingspagina (`app/index.html`)

Toont drie rolkaarten met kleurgecodeerde badges (blauw / groen / oranje) die duidelijk aangeven welke rol toegang heeft tot welk dashboard. Elke kaart linkt naar de bijbehorende loginpagina.

### 6.2 Loginpagina's

Alle drie loginpagina's (`travel-login.html`, `team-login.html`, `hr-login.html`) delen dezelfde structuur en CSS, met uitsluitend de accentkleur en het rol-icoon als verschillen.

**Login-flow (JS):**
1. `e.preventDefault()` — voorkomt pagina-refresh
2. Knop uitschakelen + tekst → "Bezig..."
3. `POST /auth/login` met `{ username: (getrimd), password }`
4. Foutmelding tonen bij `!res.ok`
5. Rolcontrole: als `data.role` niet overeenkomt → toegang geweigerd
6. Bij succes: redirect naar het juiste startscherm

| Pagina | Accentkleur | Rol | Redirect na login |
|--------|------------|-----|-------------------|
| `travel-login.html` | `#0070F2` (blauw) | TravelAdmin | `travel-start.html` |
| `team-login.html` | `#1F9D63` (groen) | TeamLead | `team-start.html` |
| `hr-login.html` | `#C8730B` (oranje) | TravelViewer | `hr-start.html` |

### 6.3 KPI-startschermen (SPA)

De drie startschermen zijn custom Single Page Applications met hash-gebaseerde navigatie. Ze fungeren als **niveau 1** (startscherm) in de drie-niveaux navigatiehiërarchie (startscherm → lijst → detail).

**Gemeenschappelijke patronen:**

- `api(path)` — centrale `fetch`-wrapper met cookieauth (`credentials: 'include'`) en automatische redirect bij 401/403
- `esc(s)` — XSS-preventie via DOM `textContent` (nooit `innerHTML` als invoer)
- `navigate()` — hash-navigatie met `loaded{}`-cache (elke view wordt maar één keer geladen)
- `hashchange`-event voor browser voor/achteruit
- Lazy loading: data wordt pas opgehaald als een view voor het eerst actief wordt

**`travel-start.html` — Travel Coördinator:**

| Sectie | Data | Opmerking |
|--------|------|-----------|
| KPI: Actieve reizen | `getActiveTripsCount()` | Demo-fallback: 7 |
| KPI: Op reis | `getOnTravelCount()` | Demo-fallback: 3 |
| KPI: Komende reizen | `getUpcomingTripsCount()` | Demo-fallback: 4 |
| KPI: Top airline | Afgeleid uit `getAirlineStats()` | American Airlines (4 boekingen) |
| Airlinegebruik (top 5) | `getAirlineStats()` | Staafgrafiek met boekingen + budget |
| Extensies | `TravelExtensions?$expand=...` | Tabel + drawer voor bewerken |
| Medewerkers | `People` | Tabel + statusbadge |
| Airlines | `Airlines` | Client-side sorteerbaar |
| Luchthavens | `Airports` | Tabel |

**`team-start.html` — Team Lead:**

| Sectie | Data |
|--------|------|
| KPI: Openstaande goedkeuringen | `getPendingCount()` |
| KPI: Teamleden op reis | Uit `People` (OnTravel-veld) |
| KPI: Beschikbaar | Uit `People` (OnTravel-veld) |
| Goedkeuringen (tabel) | `TravelExtensions` (gefilterd op Pending) |
| Teamleden (tabel) | `People` (teamleden) |
| Reizen (tabel) | Trips van eigen team |

**`hr-start.html` — HR / Administratie:**

| Sectie | Data |
|--------|------|
| KPI: Totaal reizen | `Trips` (count) |
| KPI: Medewerkers | `People` (count) |
| KPI: Top airline | Afgeleid uit `getAirlineStats()` |
| Airlinegebruik (top 5) | `getAirlineStats()` — staafgrafiek |
| Reizen | `Trips` — tabel met zoekbalk |
| Airlines | `Airlines` — tabel, client-side sorteerbaar |
| Medewerkers | `People` — tabel met zoekbalk |

### 6.4 Fiori Elements-apps

Elke app volgt het **List Report + Object Page**-patroon van SAP Fiori Elements (OData V4).

**Gedeelde kenmerken:**
- Thema: `sap_horizon` + PrimePath-merk-overlay (`webapp/css/primepath.css`)
- Namespace-registratie via `data-sap-ui-resourceroots` in `webapp/index.html`
- Automatische mount via `ComponentSupport` (`data-sap-ui-component`)
- XHR-interceptor voor sessie-verloopafdekking
- PrimePath-appbar (← Overzicht + Afmelden) bovenaan

**Travel Dashboard:**
- Lijsten: TravelExtensions, People, Trips, Airlines, Airports
- Gekleurde statusbadge via `Criticality`-annotatie: Pending=oranje, Approved=groen, Rejected=rood
- `bewerk`-actie op TravelExtensions Object Page (Fiori-dialoog)
- Wijzigingshistoriek-facet: `modifiedAt/By`, `createdAt/By`
- Sortering op `StartsAt` oplopend (PresentationVariant)

**Team Dashboard:**
- Lijsten: TravelExtensions, People, Trips, Airlines
- `goedkeuren`/`afkeuren`-knoppen (groen/rood) op TravelExtensions Object Page
- Filter "In behandeling" als beschikbare SelectionVariant
- Wijzigingshistoriek-facet

**HR Dashboard:**
- Lijsten: TravelExtensions, People, Trips, Airlines, Airports
- Volledig read-only (geen wijzig-knoppen)
- Datumfilter op reislijst (`StartsAt` als SelectionField)

---

## 7. Externe service: TripPin

TripPin is een publieke Microsoft OData V4 demo-service gebruikt als reisinformatiebron.

**Basis-URL:** `https://services.odata.org/TripPinRESTierService`

**Gebruikte entiteiten:**

| Entiteit | Beschrijving |
|----------|--------------|
| `People` | Medewerkers met naam, e-mail, geslacht |
| `Trips` | Reizen met naam, budget, beschrijving, datums |
| `PlanItems` | Reisonderdelen (vluchten etc.) met airline-informatie |
| `Airlines` | Luchtvaartmaatschappijen met IATA-code |
| `Airports` | Luchthavens met ICAO-code, naam, stad |

**Navigatiestructuur:**

```
People → Trips → PlanItems (via FlightPlan → Airline)
```

Diepe navigatie (People → Trips → PlanItems) kan niet via één CDS-`SELECT`. Gebruik `TripPin.send({ method: 'GET', path: '...' })` voor raw OData-paden.

**Beperkingen:**

- Data is van **2014** — er zijn geen reizen in 2025/2026
- TripPin heeft geen top-level `Trips`-endpoint; reizen worden opgehaald via `People('x')/Trips`
- Het `Location`-complextype op `Airports` veroorzaakte een 502 bij directe projectie; de stad wordt via een raw TripPin-call opgehaald en als virtueel `City`-veld teruggegeven

**Caching:**

Airline-statistieken worden 5 minuten in-memory gecached (server-side). Bij boot worden de caches voorgewarmd zodat de eerste gebruiker geen 8-seconden laadtijd ondervindt.

---

## 8. Lokaal ontwikkelen

### Vereisten

- Node.js ≥ 18
- `npm install` (of `@sap/cds-dk` globaal)

### Starten

```bash
# Aanbevolen: in-memory SQLite, herdeployt seed-data bij elke start
cds watch

# Alternatief: persistent db.sqlite (na schemawijziging eerst npx cds deploy uitvoeren)
npm start
```

Open `http://localhost:4004`.

### Validatie na wijzigingen

```bash
# CDS-model compileren (faalt = modelfout)
npx cds compile srv > /dev/null

# JS-syntax controleren
node --check server.js

# Boot-smoketest (verwacht: 'server listening on ... :4004' zonder fouten)
npx cds-serve
```

> **Let op:** `cds compile --to sql` / `--to edmx` faalt hier bewust vanwege de unmanaged TripPin-associaties. Gebruik de CSN-compile hierboven.

### Seed-data herladen

Na een schemawijziging is `db.sqlite` verouderd (`no such column`-fouten bij login). Oplossingen:

```bash
# Optie 1: regenereer db.sqlite met verse seed-data
npx cds deploy

# Optie 2: gebruik cds watch (altijd in-memory, geen verouderde sqlite)
cds watch
```

### Auth-profiel (`.cdsrc.json`)

Lokaal kan dummy-auth gelden. Autorisatiechecks slaan `anonymous` over in het dev-profiel. Test rolspecifiek gedrag altijd met een echt ingelogde gebruiker.

---

## 9. Productie-deploy (BTP)

```bash
# Stap 1: MTA-archief bouwen
mbt build

# Stap 2: deployen naar Cloud Foundry
cf deploy mta_archives/exploratory-travel-dashboard_1.0.0.mtar -f

# Stap 3: recente logs controleren op fouten
cf logs exploratory-travel-dashboard-srv --recent
```

### Omgevingsvariabelen (verplicht in productie)

| Variabele | Beschrijving |
|-----------|--------------|
| `JWT_SECRET` | Willekeurige, sterke geheime sleutel. De app start **niet** als deze ontbreekt of nog de dev-standaardwaarde heeft. |
| `NODE_ENV` | Moet `production` zijn voor de hardfail-check op `JWT_SECRET`. |

> **Nooit committen.** `JWT_SECRET` hoort uitsluitend in omgevingsvariabelen of BTP-secrets — nooit in de code of in versiebeheer.

---

## 10. Demo-accounts

| Gebruikersnaam | Wachtwoord | Rol | Dashboard | TripPin-identiteit |
|----------------|-----------|-----|-----------|-------------------|
| `traveladmin` | `Admin1234!` | TravelAdmin | Travel Dashboard | — (ziet alles) |
| `teamlead` | `Lead1234!` | TeamLead | Team Dashboard | `angelhuffman` |
| `hrviewer` | `HR1234!` | TravelViewer | HR Dashboard | — (read-only) |

**Tip voor demo:** log vóór de presentatie één keer per rol in zodat de airline-statistieken-cache warm is (eerste load ~8s, daarna instant).

---

## 11. Bekende beperkingen

| Beperking | Oorzaak | Status |
|-----------|---------|--------|
| KPI's tonen demo-fallbackwaarden (7/3/4) | TripPin-data is van 2014; geen actuele reizen | Bewust — gedocumenteerd |
| "Op reis" en "Eerstvolgende reis" leeg | Zelfde reden (geen 2026-reizen in TripPin) | Bewust — gedocumenteerd |
| Airline-boekingsaantallen zijn indicatief | Statistieken samplen een deel van de medewerkers (performance) | Bewust — gedocumenteerd |
| Reissleutels zichtbaar in URL (`#/Trips(5007)`) | Standaard Fiori Elements-gedrag (client-side hash, geen server-lek) | Aanvaard als SAP-standaard |
| Geen globale cross-entiteit zoekbalk | Fiori Elements ondersteunt dit niet standaard | Buiten scope |
| Geen CSV-export HR | Bewust niet gebouwd op verzoek van de klant | Buiten scope |
| Geen Create Flow voor nieuwe reizen | Nieuwe reizen vloeien vanuit TripPin | Buiten scope |
| In-memory cache werkt niet bij meerdere CF-instanties | SQLite/in-memory cache is per instantie | Bekend; Redis/HANA-cache is buiten scope |
| Console-meldingen in dev (`Component-preload.js`, `i18n_nl.properties`, `/sap/bc/lrep/…` 404) | Normale UI5-ruis zonder preload-bundle | Onschadelijk; verdwijnt na `cds build` in productie |

---

*Laatste update: 18 juni 2026*
