# Testplan — Exploratory Travel Dashboard

Wat er getest moet worden en wat er moet werken, per rol. Vink af tijdens de testronde.
Laatste update: 16 juni 2026 (na de bugfix-/perf-/docs-sessie).

> Zie ook **`ARCHITECTUUR.md`** (hoe het systeem werkt + bewuste keuzes) en **`DEMO.md`** (presentatieflow).

---

## 0. Voorbereiding

```bash
# Aanbevolen om te testen: in-memory, herdeployt seed-data bij elke start
cds watch
# (of: npm start  -> gebruikt persistent db.sqlite)
```

Open **http://localhost:4004**.

**Demo-accounts:**

| Gebruikersnaam | Wachtwoord   | Rol          | Dashboard         | TripPin-identiteit |
|----------------|--------------|--------------|-------------------|--------------------|
| `traveladmin`  | `Admin1234!` | TravelAdmin  | Travel Dashboard  | — (ziet alles)     |
| `teamlead`     | `Lead1234!`  | TeamLead     | Team Dashboard    | `angelhuffman`     |
| `hrviewer`     | `HR1234!`    | TravelViewer | HR Dashboard      | — (read-only)      |

> ⚠️ **Lees eerst §7 (bewust verwachte gedragingen).** TripPin-data is van **2014**, dus
> sommige "lege"/fallback-resultaten zijn correct en geen bug.

### 0.1 Rooktest (≈2 min — doe dit eerst)

- [ ] `cds watch` start zonder fouten; console toont `server listening on ... :4004`.
- [ ] `http://localhost:4004/` toont de landingspagina met 3 rolkaarten.
- [ ] Inloggen als `traveladmin` lukt en je belandt op het Travel-startscherm.
- [ ] De KPI-tegels tonen getallen (7 / 3 / 4) en het airlinegebruik laadt (max ~8s de eerste keer).
- [ ] Doorklikken naar een lijst en een detailpagina werkt zonder foutdialoog.

> Tip: log één keer per rol kort in om de caches te **warmen** vóór de echte test/demo.

---

## 1. Authenticatie & toegang (security)

- [ ] Zonder login rechtstreeks naar `http://localhost:4004/travel-dashboard/webapp/` → **redirect (302) naar `travel-login.html`** (auth-gate). Idem `/team-dashboard/...` en `/hr-dashboard/...`.
- [ ] Zonder login naar `http://localhost:4004/travel-start.html` → **redirect naar login** (idem team/hr).
- [ ] De landingspagina `/` en de drie `*-login.html` laden **wél** zonder login.
- [ ] Inloggen met een account van de **verkeerde rol** (bv. `hrviewer` op de Travel-login) → foutmelding "geen toegang tot dit dashboard".
- [ ] Inloggen met **fout wachtwoord** → foutmelding "Ongeldige gebruikersnaam of wachtwoord".
- [ ] **Rate limiting**: >10 foute pogingen binnen 15 min vanaf hetzelfde IP → "Te veel inlogpogingen. Probeer het over 15 minuten opnieuw."
- [ ] Na een **geslaagde login** land je op het **startscherm** van je rol.
- [ ] OData-data zonder sessie (incognito → `http://localhost:4004/travel/TravelExtensions`) → **401**.
- [ ] **Sessie-verloop**: verwijder de cookie `primepath_auth` in de devtools terwijl je in een Fiori-app zit en trigger een data-actie → je wordt automatisch naar de loginpagina geredirect (401-interceptor).
- [ ] **Logout**: klik **Afmelden** in een app → terug naar `/`; daarna `/travel-start.html` openen → redirect naar login (sessie weg).

## 2. Landingspagina (`/`)

- [ ] Toont drie rolkaarten met **badges** (Travel Coördinator / Team Lead / HR).
- [ ] Elke kaart linkt naar de juiste login (`*-login.html`).
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
- [ ] Lijst is gesorteerd op **vertrekdatum oplopend** (PresentationVariant).
- [ ] **Medewerkers**: kolommen incl. **E-mail** (FV-07) en een **status**-badge.
- [ ] Klik op een medewerker (bv. `russellwhyte`) → detailpagina met **Persoonsgegevens** (incl. e-mail) en **Reisoverzicht** dat **enkel diens eigen reizen** toont (russellwhyte = **3** reizen, niet alle 13).
- [ ] **Airlines** bereikbaar (`#/Airlines`): kolom **Boekingen** (AA toont 4) en gesorteerd op naam (FV-18).
- [ ] **Luchthavens** bereikbaar (`#/Airports`): kolom **Stad** gevuld (SFO → San Francisco, JFK → New York City) (FV-20).
- [ ] Open een TravelExtension → detailpagina heeft secties **Reisgegevens (TripPin)**, **PrimePath interne velden** en **Wijzigingshistoriek** (`modifiedAt`/`modifiedBy`/`createdAt`/`createdBy`).
- [ ] **← Overzicht** brengt terug naar het startscherm; **Afmelden** logt uit naar `/`.

## 4. Team Dashboard — `teamlead` / `Lead1234!`

**Startscherm (`team-start.html`):**
- [ ] KPI **Openstaande goedkeuringen = 1**; tegels teamleden op reis / beschikbaar.
- [ ] Navigatiekaarten + PrimePath-balk.

**Goedkeuringsflow (kernproces):**
- [ ] **Reisgoedkeuringen**-lijst met gekleurde statusbadge; filtervariant **"In behandeling"** beschikbaar.
- [ ] Open een **Pending**-goedkeuring van een **eigen teamlid** (bv. TripID 1003) → op de detailpagina staan de knoppen **Goedkeuren** (groen) en **Afkeuren** (rood).
- [ ] Klik **Goedkeuren** → status wordt **Approved**; **Wijzigingshistoriek** toont `modifiedBy = teamlead`.
- [ ] Klik **Afkeuren** op een andere → status **Rejected**.
- [ ] **Autorisatie**: een reis **buiten** het eigen team kun je niet beslissen → 403 (zie §9 voor een API-test).

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
- [ ] **Reizen**: de datumfilter (`StartsAt`/`EndsAt`) ondersteunt een **van–tot bereik** (FV-13).
- [ ] **Airlines**: kolom **Boekingen** gevuld.
- [ ] Detailpagina's tonen **inhoud** (Facets) — niet leeg.
- [ ] **Read-only**: geen Goedkeuren/Bewerken-knoppen.

## 6. Branding & navigatie (alle apps)

- [ ] PrimePath-blauw (`#0070F2`) in nadruk-knoppen, links en de titelbalk (sap_horizon + overlay).
- [ ] De **← Overzicht / Afmelden**-balk staat rechtsboven in alle 3 apps en werkt.
- [ ] Labels zijn Nederlands (kolomtitels, secties). Codes/eigennamen blijven Engels (Trip ID, IATA-code).

---

## 7. Bewust verwachte gedragingen (GEEN bug)

- **KPI's tonen demo-fallbacks** (7 / 3 / 4) omdat de TripPin-dataset uit **2014** komt en er dus live geen actieve/komende reizen zijn.
- **"Op reis" en "Eerstvolgende reis" zijn leeg** om dezelfde reden (geen actuele/toekomstige reizen in 2014).
- **Airline-boekingen zijn indicatief**: de airline-stats samplen een deel van de medewerkers (performance), dus alleen AA/FM/MU tonen aantallen, de rest 0.
- **Eerste airlinegrafiek-load ~8s** (zware externe traversal); daarna gecached (en bij boot voorgewarmd).
- **Console-meldingen** zoals `Component-preload.js` 404, `i18n_nl.properties` 404, `/sap/bc/lrep/...` 404 → onschadelijk; normaal voor een ongebouwde, standalone SAPUI5-app in dev. In productie genereert `cds build` een preload-bundle.
- **Sleutels in de URL** (`#/People('keithpinckney')`) → standaard Fiori Elements-gedrag (client-side hash, geen server-lek).
- **Airports**: het geneste TripPin-`Location`-complextype wordt **niet** in de projectie opgenomen (zou anders een 502 geven, zie BUG-01). De stad komt via het virtuele `City`-veld; ook een volledige `GET /travel/Airports` werkt nu (200).

## 8. Technische validatie (voor ontwikkelaars)

```bash
npx cds compile srv                      # model compileert (CSN)
node --check server.js                   # JS-syntax
npx cds-serve                            # boot-smoketest: 'server listening', 0 errors
```

> Let op: `cds compile --to sql/edmx` faalt bewust door de remote TripPin-associaties (unmanaged). Gebruik de CSN-compile hierboven.

---

## 9. API-/curl-tests per rol (backend zonder UI)

Handig om de backend los van de Fiori-UI te verifiëren. (Bash-voorbeelden.)

```bash
BASE=http://localhost:4004

# --- Login (cookie-jar per rol) ---
curl -s -c travel.jar -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"username":"traveladmin","password":"Admin1234!"}'
curl -s -c team.jar   -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"username":"teamlead","password":"Lead1234!"}'
curl -s -c hr.jar     -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"username":"hrviewer","password":"HR1234!"}'
```

**Travel — KPI's & data**
- [ ] `curl -s -b travel.jar "$BASE/travel/getActiveTripsCount()"` → `{"value":7}`
- [ ] `getOnTravelCount()` → `3`, `getUpcomingTripsCount()` → `4`
- [ ] `curl -s -b travel.jar "$BASE/travel/getTopAirline()"` → `American Airlines`
- [ ] `curl -s -b travel.jar "$BASE/travel/Trips?\$select=TripId"` → 13 reizen
- [ ] `curl -s -b travel.jar "$BASE/travel/People('russellwhyte')/Trips"` → **3** reizen (0, 1003, 1007)
- [ ] `curl -s -b travel.jar "$BASE/travel/Airports?\$select=IcaoCode,Name,City&\$top=3"` → City gevuld

**Travel — validatie (negatief, verwacht 400)**
- [ ] `curl -s -b travel.jar -X PATCH "$BASE/travel/TravelExtensions(1003)" -H "Content-Type: application/json" -d '{"ProjectCode":"FOUT-1"}'` → 400 "begint altijd met 'PROJ-'"
- [ ] `... -d '{"ApprovalStatus":"Misschien"}'` → 400 "is niet geldig"
- [ ] Zet daarna terug: `... -d '{"ProjectCode":"PROJ-2024-002","ApprovalStatus":"Pending"}'`

**Team — goedkeuring & autorisatie**
- [ ] `getPendingCount()` → `1`
- [ ] `curl -s -b team.jar -X POST "$BASE/team/TravelExtensions(1003)/TeamService.goedkeuren"` → 200, status `Approved`
- [ ] `curl -s -b team.jar -X POST "$BASE/team/TravelExtensions(2)/TeamService.goedkeuren"` → **403** (reis 2 is geen teamlid)
- [ ] Zet terug: `curl -s -b team.jar -X PATCH "$BASE/team/TravelExtensions(1003)" -H "Content-Type: application/json" -d '{"ApprovalStatus":"Pending"}'`

**HR — stats & datumfilter**
- [ ] `getAirlineStats()` → array met AA(4)/FM(2)/MU(2)
- [ ] `getTripCountByPeriod(from=2014-01-01T00:00:00Z,to=2014-12-31T00:00:00Z)` → `10`
- [ ] `getTripCountByPeriod(from=NOTADATE,to=NOTADATE)` → **400** (datumvalidatie)

**Rol-isolatie (verwacht 403)**
- [ ] `curl -s -b hr.jar "$BASE/travel/TravelExtensions"` → 403 (HR mag de Travel-service niet lezen)
- [ ] `curl -s -b team.jar "$BASE/hr/getAirlineStats()"` → 403

---

## 10. Browser-devtools checks (F12)

- [ ] **Network**: na login laden de OData-requests met **200** (en de cookie `primepath_auth` gaat mee).
- [ ] **Console — onschadelijk** (zie §7): `Component-preload.js` 404, `i18n_nl/_en.properties` 404, `/sap/bc/lrep/...` 404, `S/CUBE`, MDC-`PropertyInfoValidator`-warnings.
- [ ] **Console — een ECHTE fout** zou zijn: een rode uncaught error die de pagina blokkeert, of een 500 op een OData-call. Die hoort er **niet** te zijn → meld als bug.
- [ ] **Application → Cookies**: `primepath_auth` is `HttpOnly` en (in productie) `Secure`.

---

## 11. Regressie-aandachtspunten (wat deze sessie gefixt/gebouwd is)

| # | Item | Te verifiëren in |
|---|------|------------------|
| Bug | Trips-lijst onvolledig (People-paginatie) | §3/§9 — 13 reizen |
| Bug | Lege detailpagina's (geen Facets) | §4/§5 — HR & Team detailpagina's |
| Bug | Airline-tellingen altijd 0 (`$select` op PlanItems) | §3/§5 — airlinegrafieken |
| Bug | People→Trips toonde alle reizen | §3 — medewerker-detail (eigen reizen) |
| Bug | `getTripCountByPeriod` 502 | §5/§9 — HR datumfilter |
| Feat | Gekleurde statusbadges (Criticality) | §3/§4 |
| Feat | KPI-startschermen (3 rollen) | §3/§4/§5 |
| Feat | Goedkeuren/Afkeuren-acties + teamcheck | §4/§9 |
| Feat | FV-07 e-mail · FV-18 boekingen · FV-20 stad | §3/§5 |
| Feat | Wijzigingshistoriek-facet (audit) | §3/§4 |
| Feat | Auth-gate + 401-redirect-interceptor | §1 |
| Feat | Overzicht/Afmelden-balk | §6 |
| Perf | KPI-caching + parallelle airline-stats + pre-warm | §0.1/§3/§5 — laadsnelheid |

---

## 12. Bekende beperkingen & openstaande keuzes

- **TravelAdmin kan PrimePath-velden niet in de UI bewerken** — FE V4 vereist daarvoor draft, wat botst met de custom READ-handler (virtuele velden). Bewuste keuze; de TeamLead-statuswijziging werkt wél via acties. Backend-validatie/PATCH werkt (zie §9). _Team-beslissing: draft inschakelen (met test) of een edit-actie bouwen._
- **Geen juni-2026-data** — reisdatums leven in de onveranderlijke TripPin-bron (2014); vandaar de KPI-fallbacks.
- **Airline-stats sampling** — indicatieve aantallen (performance-keuze).
- **Nog te doen door het team:** BTP-deploy + `cf logs`, mobiele/BAS-check, landingspagina visueel opwaarderen, eventueel een admin-gebruikersbeheerscherm (TA §6.4). Zie `TODO.md`.
