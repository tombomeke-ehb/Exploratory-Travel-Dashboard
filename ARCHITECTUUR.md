# Architectuur & werking — Exploratory Travel Dashboard

Ontwikkelaarsdocumentatie: hoe het systeem in elkaar zit, de integratie-valkuilen en de
bewuste keuzes. Aanvullend op `README.md` (opzet), `TESTPLAN.md` (testen) en `DEMO.md` (demo).
Laatste update: 16 juni 2026.

---

## 1. Overzicht

**PrimePath Travel** = drie **SAP Fiori Elements**-apps op **één gedeelde CAP (Node.js)-backend**.

```
Browser ──► Fiori-apps (travel/team/hr) ──► CAP-services (/travel, /team, /hr)
              + start/login-HTML              │
                                              ├─► TripPin OData V4 (extern, read-only, 2014-data)
                                              └─► SQLite/HANA (lokaal: TravelExtensions, UserMapping, Users)
```

- **Reisdata** (People, Trips, Airlines, Airports) komt uit de externe **TripPin OData V4**-service.
- **PrimePath-specifieke velden** (ProjectCode, ApprovalStatus, InternalNote) leven lokaal in
  `TravelExtensions` en worden via `TripID` aan een TripPin-reis gekoppeld.
- **Authenticatie**: eigen systeem (lokale `Users` + bcrypt + JWT-cookie). **Geen XSUAA.**

### Rollen

| Rol (`@requires`) | App | Service | Mag |
|-------------------|-----|---------|-----|
| `TravelAdmin`  | Travel | `/travel` | Alles lezen; PrimePath-velden beheren; status-override |
| `TeamLead`     | Team   | `/team`   | Lezen; **alleen** ApprovalStatus van **eigen teamleden** wijzigen |
| `TravelViewer` | HR     | `/hr`     | Alles **read-only**; statistieken |

---

## 2. Mapstructuur (kern)

```
app/
  index.html                landingspagina (rolbadges)
  {travel,team,hr}-login.html   loginpagina's
  {travel,team,hr}-start.html   KPI-startschermen (niveau 1, plain HTML)
  {travel,team,hr}-dashboard/
    annotations.cds         Fiori-annotaties (LineItem, Facets, Criticality, acties)
    webapp/                 UI5-bootstrap, manifest (routes), css/primepath.css, i18n
db/
  schema.cds                TravelExtensions, UserMapping, Users
  data/*.csv                seed-data
srv/
  shared.cds                gedeelde TripPin-projecties + centrale @title-labels
  travel|team|hr-service.cds/.js   services + handlers + KPI/acties
  trippin-trips.js          gedeelde TripPin-reisaggregatie (collectAllTrips, collectTripsForPerson)
  auth-strategy.js          custom CDS-auth: JWT-cookie -> cds.context.user
  jwt-config.js             gedeelde JWT_SECRET (hardfail in productie)
server.js                   bootstrap: /auth/login|logout, statische pagina's, auth-gate, rate limiting
```

---

## 3. Authenticatie & autorisatie

**Login** (`server.js` → `POST /auth/login`): valideert tegen `Users` (bcrypt), zet een
**httpOnly JWT-cookie** (`primepath_auth`, 8u). `srv/auth-strategy.js` leest die cookie bij elk
verzoek en zet `cds.context.user` (rol). De services dwingen toegang af met `@requires`.

**Lagen van bescherming:**
1. **`@requires`** op elke service → OData-data is rolgebonden (anders 401/403).
2. **Auth-gate** (`server.js`): een middleware controleert de JWT-cookie vóór de **statische**
   app-shells (`/{rol}-dashboard/webapp/*`) en startpagina's (`*-start.html`); geen/ongeldige
   sessie → 302 naar de juiste `*-login.html`. Login-/landingspagina's en `/auth/*` blijven publiek.
3. **401-interceptor** (in elke `webapp/index.html`): UI5 gebruikt XMLHttpRequest, dus we patchen
   `XHR.prototype.open`; bij een 401/403-respons tijdens gebruik → redirect naar login.
4. **Rate limiting** op `/auth/login` (max 10/15 min per IP).
5. **TeamLead-teamcheck** (`srv/team-service.js`, `_assertTeamOwnership`): veiligheidskritisch —
   een Team Lead mag enkel reizen van eigen teamleden beslissen (via `UserMapping`). Gedeeld door
   de `before('UPDATE')` én de bound actions `goedkeuren`/`afkeuren`.

> `JWT_SECRET` komt uit `srv/jwt-config.js`; in productie throwt het laden bij een ontbrekende of
> nog-default secret (geen onveilige default in prod).

---

## 4. TripPin-integratie & valkuilen

De externe TripPin-service heeft eigenaardigheden die de architectuur sturen:

1. **Geen top-level `Trips`-entiteitset.** Reizen zijn alleen bereikbaar via navigatie
   `People('x')/Trips`. Daarom aggregeert `srv/trippin-trips.js` (`collectAllTrips`) alle reizen
   door over People te lopen. Een directe `SELECT.from('TripPinService.Trips')` geeft **502**
   (deze bug zat in `getTripCountByPeriod`).
2. **Paginatie van 8.** TripPin levert max 8 records/pagina en CAP volgt de `@odata.nextLink`
   niet. `collectAllTrips` en de airport-stad-map **doorlopen daarom alle pagina's via `$skip`**.
   Anders mis je alles voorbij de eerste pagina.
3. **Complextype-flattening.** CAP slaat geneste TripPin-complextypes plat (`Location_City_Name`,
   `Location_Address`). Een directe annotatie `Location.City.Name` op Airports → **502**. Oplossing
   (FV-20): een **virtueel `City`-veld**, gevuld uit een **raw `TripPin.send`** (raw OData bevat het
   geneste object zónder flattening).
4. **Heterogene PlanItems.** `FlightNumber` bestaat alleen op het `Flight`-subtype, niet op het
   `PlanItem`-basistype. `?$select=FlightNumber` → 502. Daarom halen we PlanItems **zonder $select**
   op en filteren we client-side op `item.FlightNumber` (anders bleven airline-tellingen 0).
5. **Diepe navigatie** (People → Trips → PlanItems) kan niet via één CDS-`SELECT`; we gebruiken
   `TripPin.send({ method, path })` met een ruw OData-path.

---

## 5. Caching & performance

Alle TripPin-traversals zijn traag (sequentiële remote-calls over het internet). Strategie:

| Cache | Module | TTL | Inhoud |
|-------|--------|-----|--------|
| `collectAllTrips` | `srv/trippin-trips.js` | 5 min | alle reizen + `byId` + `owners`-map |
| airline-stats | `srv/travel-service.js` + `srv/hr-service.js` | 5 min | boekingen + budget per airline |
| airport-steden | `srv/travel-service.js` | 5 min | `IcaoCode → stad` |

Aanvullend:
- **KPI-counts** (active/onTravel/upcoming) hergebruiken de gecachte `collectAllTrips` i.p.v. een
  eigen traversal → vrijwel **instant**.
- **Parallellisatie**: de airline-stats-traversal loopt via `Promise.all` over personen én reizen
  (cold ~31s → ~8s).
- **Pre-warm bij boot**: elke service triggert zijn caches niet-blokkerend bij het opstarten, zodat
  de eerste gebruiker de warme cache raakt.
- **Graceful degradatie**: merges (airline-boekingen, airport-steden) zitten in try/catch — faalt
  de remote, dan blijft de lijst werken (met 0 / lege stad).

---

## 6. Datamodel & demo-fallbacks

- `TravelExtensions` (`key TripID`): ProjectCode (begint met `PROJ-`), ApprovalStatus
  (`Pending`/`Approved`/`Rejected`), InternalNote (max 500). `managed` → createdAt/By + modifiedAt/By
  (zichtbaar als "Wijzigingshistoriek"-facet).
- `UserMapping`: `TripPinUserName` (medewerker) → `TeamLeadUserName` (lead). Puur TripPin-gebaseerd.
- `Users`: login-account → `role` + `tripPinUserName` (koppelt login aan TripPin-identiteit).
- **Demo-fallbacks**: TripPin-data is **2014**, dus live KPI's zouden 0 zijn. `getActiveTripsCount`
  (7), `getOnTravelCount` (3), `getUpcomingTripsCount` (4) geven bewust fallbackwaarden. De
  reken-logica is correct; alleen de brondata is verouderd.

---

## 7. Frontend (Fiori Elements + start-/login-HTML)

- **Drie navigatieniveaus** (FA §9.2): (1) `*-start.html` KPI-startscherm → (2) List Report →
  (3) Object Page. De startschermen zijn **plain HTML** die de CAP-functies aanroepen (geen FE-tegels).
- **Annotaties** (`app/*/annotations.cds`): `UI.LineItem`, `UI.SelectionFields`, `UI.HeaderInfo`,
  `UI.Facets`/`FieldGroup`, `UI.PresentationVariant` (sortering), `Criticality` (gekleurde
  statusbadges via `$edmJson`), en `UI.Identification` met `DataFieldForAction` (Team Goedkeuren/Afkeuren).
- **Thema**: `sap_horizon` + een **PrimePath-merk-overlay** (`webapp/css/primepath.css`, via
  `sap.ui5.resources.css`) die de Horizon CSS-variabelen naar de huisstijlkleuren zet
  (brand `#0070F2`, hover `#0058C4`).
- **Shell-balk** (vast, `position: fixed` in `webapp/index.html`): ← Overzicht + Afmelden. Bewuste
  keuze i.p.v. een FLP-shellPlugin (standalone FE V4 heeft geen launchpad; dit is risicoloos qua layout).
- **Labels**: centraal Nederlands via `@title` in `srv/shared.cds` (= `@Common.Label`), geërfd door
  alle 3 services. Geen `{i18n>}`-sleutels (Nederlandstalige demo).

---

## 8. Bewuste keuzes & beperkingen

- **Geen draft** (`@odata.draft.enabled`) op `TravelExtensions`: botst met de custom READ-handler
  (virtuele TripPin-velden). Gevolg: TravelAdmin-UI-bewerking van vrije velden is nog niet mogelijk
  (openstaande team-beslissing); TeamLead-status werkt via acties. Backend-CRUD/validatie werkt wel.
- **Geen `{i18n>}`-sleutels** — Nederlandstalige demo; `@title` volstaat en vermijdt rauwe-sleutel-weergave.
- **Airline-sampling** — performance-afweging; aantallen indicatief.
- **Sleutels in de URL** — standaard Fiori-gedrag (client-side hash), bewust geaccepteerd.
- **Geen XSUAA** — eigen JWT-login (schoolcontext); rolselectie via de badge-landingspagina.

---

## 9. Lokaal draaien & valideren

```bash
npm run watch        # cds watch — in-memory, auto-reload, verse seed-data
npm start            # cds-serve — persistent db.sqlite

npx cds compile srv  # model valideren (CSN) na elke .cds-wijziging
node --check server.js
```

> Na een schemawijziging is een verouderde `db.sqlite` een bekende valkuil (`no such column`):
> gebruik `cds watch` (in-memory) of `npx cds deploy` om te regenereren. `db.sqlite` is gitignored.

Branch-model: `feature/* → PR → dev → release-PR → main`. Deploy gebeurt vanaf `main` (zie `README.md`/`mta.yaml`).
