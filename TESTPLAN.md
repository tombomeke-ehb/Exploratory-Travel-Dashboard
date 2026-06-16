# Testplan — Exploratory Travel Dashboard

Wat er getest moet worden en wat er moet werken, per rol. Vink af tijdens de testronde.
Laatste update: 16 juni 2026 (na de bugfix-/perf-sessie).

---

## 0. Voorbereiding

```bash
# Aanbevolen om te testen: in-memory, herdeployt seed-data bij elke start
cds watch
# (of: npm start  -> gebruikt persistent db.sqlite)
```

Open **http://localhost:4004**.

**Demo-accounts:**

| Gebruikersnaam | Wachtwoord   | Rol          | Dashboard         |
|----------------|--------------|--------------|-------------------|
| `traveladmin`  | `Admin1234!` | TravelAdmin  | Travel Dashboard  |
| `teamlead`     | `Lead1234!`  | TeamLead     | Team Dashboard    |
| `hrviewer`     | `HR1234!`    | TravelViewer | HR Dashboard      |

> ⚠️ **Lees eerst §7 (bewust verwachte gedragingen).** TripPin-data is van **2014**, dus
> sommige "lege"/fallback-resultaten zijn correct en geen bug.

---

## 1. Authenticatie & toegang (security)

- [ ] Zonder login rechtstreeks naar `http://localhost:4004/travel-dashboard/webapp/` → **redirect naar `travel-login.html`** (auth-gate).
- [ ] Zonder login naar `http://localhost:4004/travel-start.html` → **redirect naar login**. (Idem team/hr.)
- [ ] De landingspagina `/` en de drie `*-login.html` laden **wél** zonder login.
- [ ] Inloggen met een account van de **verkeerde rol** (bv. `hrviewer` op de Travel-login) → foutmelding "geen toegang tot dit dashboard".
- [ ] Inloggen met **fout wachtwoord** → foutmelding. Na **>10 pogingen** binnen 15 min → "Te veel inlogpogingen" (rate limiting).
- [ ] Na een **geslaagde login** land je op het **startscherm** van je rol.
- [ ] OData-data zonder sessie (bv. in een incognito-venster `http://localhost:4004/travel/TravelExtensions`) → **401**.

## 2. Landingspagina (`/`)

- [ ] Toont drie rolkaarten met **badges** (Travel Coördinator / Team Lead / HR).
- [ ] De oude **"Unified Dashboard"-kaart is weg** (het React-dashboard is verwijderd).

## 3. Travel Dashboard — `traveladmin` / `Admin1234!`

**Startscherm (`travel-start.html`, niveau 1):**
- [ ] KPI-tegels: **Actieve reizen = 7**, **Medewerkers op reis = 3**, **Komende reizen = 4** (demo-fallback, zie §7).
- [ ] Tegel **Meest gebruikte airline = American Airlines** (4 boekingen).
- [ ] Sectie **Airlinegebruik top 5**: `AA 4 (€6.000)`, `FM 2 (€13.000)`, `MU 2 (€13.000)`. _Eerste keer laden ~8s, daarna snel (cache)._
- [ ] Navigatiekaarten naar Reizen/Medewerkers/Airlines/Luchthavens werken.
- [ ] Rechtsboven de **PrimePath-balk** met **← Overzicht** en **Afmelden**.

**Lijsten & detail:**
- [ ] **Reizen & extensies** (TravelExtensions): de kolom **Goedkeuringsstatus** is een **gekleurde badge** — Pending=oranje, Approved=groen, Rejected=rood.
- [ ] **Medewerkers**: kolommen incl. **E-mail** (FV-07) en een **status**-badge.
- [ ] Klik op een medewerker (bv. `russellwhyte`) → detailpagina met **Persoonsgegevens** (incl. e-mail) en **Reisoverzicht** dat **enkel diens eigen reizen** toont (russellwhyte = **3** reizen, niet alle 13).
- [ ] **Airlines** en **Luchthavens** zijn bereikbaar (URL `#/Airlines`, `#/Airports`) en gesorteerd op naam.
- [ ] Open een TravelExtension → detailpagina heeft secties **Reisgegevens (TripPin)**, **PrimePath interne velden** en **Wijzigingshistoriek** (`modifiedAt`/`modifiedBy`).
- [ ] Validatie (via bewerken/PATCH): een ProjectCode zonder `PROJ-` → foutmelding; een ongeldige ApprovalStatus → foutmelding.
- [ ] **← Overzicht** brengt terug naar het startscherm; **Afmelden** logt uit naar `/`.

## 4. Team Dashboard — `teamlead` / `Lead1234!`

**Startscherm (`team-start.html`):**
- [ ] KPI **Openstaande goedkeuringen = 1**; tegels teamleden op reis / beschikbaar.
- [ ] Navigatiekaarten + PrimePath-balk.

**Goedkeuringsflow (kernproces):**
- [ ] **Reisgoedkeuringen**-lijst met gekleurde statusbadge; filtervariant **"In behandeling"**.
- [ ] Open een **Pending**-goedkeuring van een **eigen teamlid** (bv. TripID 1003) → op de detailpagina staan de knoppen **Goedkeuren** (groen) en **Afkeuren** (rood).
- [ ] Klik **Goedkeuren** → status wordt **Approved**; **Wijzigingshistoriek** toont `modifiedBy = teamlead`.
- [ ] Klik **Afkeuren** op een andere → status **Rejected**.
- [ ] (Backend-afgedekt, lastig in UI te forceren: een reis **buiten** het eigen team wijzigen geeft **403**.)

**Overig:**
- [ ] **Teamleden**-lijst met statusbadge. _"Eerstvolgende reis" is leeg — verwacht (2014-data), zie §7._
- [ ] Klik op een teamlid → detailpagina toont inhoud (niet leeg).
- [ ] Klik op een reis → Trips-detailpagina toont inhoud (niet leeg).

## 5. HR Dashboard — `hrviewer` / `HR1234!`

**Startscherm (`hr-start.html`):**
- [ ] Sectie **Airlinegebruik top 5** (met budget) en KPI's: **aantal airlines**, **totaal boekingen**, **meest gebruikte airline**.
- [ ] Navigatiekaarten + PrimePath-balk.

**Lijsten:**
- [ ] **Reizen**, **Medewerkers** en **Airlines** zijn alle bereikbaar.
- [ ] Detailpagina's tonen **inhoud** (Facets) — niet leeg.
- [ ] **Read-only**: geen Goedkeuren/Bewerken-knoppen.

## 6. Branding & navigatie (alle apps)

- [ ] PrimePath-blauw (`#0070F2`) in nadruk-knoppen, links en de titelbalk (sap_horizon + overlay).
- [ ] De **← Overzicht / Afmelden**-balk staat rechtsboven in alle 3 apps en werkt.

---

## 7. Bewust verwachte gedragingen (GEEN bug)

- **KPI's tonen demo-fallbacks** (7 / 3 / 4) omdat de TripPin-dataset uit **2014** komt en er dus live geen actieve/komende reizen zijn.
- **"Op reis" en "Eerstvolgende reis" zijn leeg** om dezelfde reden (geen actuele/toekomstige reizen in 2014).
- **Eerste airlinegrafiek-load ~8s** (zware externe traversal); daarna gecached (en bij boot voorgewarmd).
- **Console-meldingen** zoals `Component-preload.js` 404, `i18n_nl.properties` 404, `/sap/bc/lrep/...` 404 → onschadelijk; normaal voor een ongebouwde, standalone SAPUI5-app in dev. In productie genereert `cds build` een preload-bundle.
- **Sleutels in de URL** (`#/People('keithpinckney')`) → standaard Fiori Elements-gedrag (client-side hash, geen server-lek).

## 8. Technische validatie (voor ontwikkelaars)

```bash
npx cds compile srv                      # model compileert
node --check server.js                   # JS-syntax
npx cds-serve                            # boot-smoketest: 'server listening', 0 errors
```

---

## 9. Wat in deze sessie gefixt/gebouwd is (regressie-aandachtspunten)

| # | Item | Te verifiëren in |
|---|------|------------------|
| Bug | Trips-lijst was onvolledig (paginatie) | Travel/HR Trips-lijst toont alle reizen |
| Bug | Lege detailpagina's (geen Facets) | HR People/Trips/Airlines + Team Trips detail |
| Bug | Airline-tellingen altijd 0 (`$select`) | Airlinegrafieken tonen echte cijfers |
| Bug | People→Trips toonde alle reizen | §3 medewerker-detail (eigen reizen) |
| Bug | `getTripCountByPeriod` 502 | HR datumfilter op de Reizen-lijst |
| Feat | Gekleurde statusbadges | §3/§4 goedkeuringsstatus |
| Feat | KPI-startschermen (3 rollen) | §3/§4/§5 startschermen |
| Feat | Goedkeuren/Afkeuren-acties | §4 goedkeuringsflow |
| Feat | Auth-gate | §1 |
| Feat | Overzicht/Afmelden-balk | §6 |
| Feat | Wijzigingshistoriek-facet | §3/§4 detailpagina |
| Feat | FV-07 e-mail in People-lijst | §3 medewerkers |
| Perf | KPI-caching + parallelle airline-stats + pre-warm | §3/§5 laadsnelheid |
