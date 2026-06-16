# TODO — Exploratory Travel Dashboard
**Demo: 19 juni 2026 | EhB Cloud Integration × Flexso**

> Vink af met [x] als een taak klaar is. Vermeld je naam tussen haakjes bij elke taak die je oppakt.
> Categorieën: 🔴 Kritiek · 🟡 Nice-to-have · 🔵 Buiten scope · 🔒 Security · 🎨 Design/UX · 🛠️ Technische schuld

---

## 🔎 Audit-status (14 juni 2026 — Ismael)

Code-audit uitgevoerd: TODO gelijkgetrokken met de werkelijke code. Samenvatting:

- **Backend is vrijwel volledig af.** Afgevinkt na verificatie: 🔒 Security (JWT_SECRET-hardfail, rate limiting, TripID-eigenaarschapscheck), V3 (TravelAdmin override), V5 (verdwenen/hergebruikt TripID), FV-22, FV-26, datumvalidatie `getTripCountByPeriod`.
- **Backend klaar, alleen UI-weergave rest:** V7 (`getUpcomingTripsCount`), V8 (`TotalBudget` per airline), FV-01/FV-03 (KPI-functies bestaan, maar geen zichtbare tegel/niveau-1-startscherm in de Fiori-apps).
- **Echt nog te bouwen (overwegend Fiori-UI):** KPI-startschermen (🎨 Startscherm), airline-grafiek (FV-02/06), FV-07 (e-mail in People-lijst), FV-18 (boekingsaantal in airline-lijst), FV-20 (stad in airports-lijst), ontbrekende routes (Airlines/Airports in Travel; People/Airlines in HR), thema `sap_horizon`, i18n-labels, logging in lege `catch`-blokken, mock-data juni 2026, README/.gitignore-opschoning.

### 🐞 Bugfixes deze sessie (14 juni 2026 — Ismael) — Fiori-apps werken nu lokaal

De drie dashboards toonden eerst een wit scherm / foutdialoog. Drie blokkerende bugs gevonden en gefixt op `dev`:

- [x] **UI5-CDN-versie** — alle 3 apps laadden UI5 `1.130.0`, die niet (meer) op de CDN staat (HTTP 404) → wit scherm. Naar `1.136.0` gebumpt (PR #44, issue #43).
- [x] **TripPin heeft geen top-level `Trips`** — HR/Team startten op een Trips-lijst → foutdialoog; Travel-reisvelden bleven leeg. Gedeelde aggregatie via `People('x')/Trips` toegevoegd in `srv/trippin-trips.js` (PR #46, issue #45).
- [x] **Container-hoogte 0** — apps initialiseerden volledig maar bleven wit; `html/body/#content`, de ComponentSupport-tussen-div én `#container` op `height:100%` gezet (PR #48, issue #47).

> ⚠️ **Nog te doen vóór demo:** deze fixes staan op `dev`, niet op productie. De BTP-URL toont nog de oude (kapotte) versie tot de release `dev → main` + deploy. Lokaal renderen alle 3 de List Reports nu correct met data.

---

## 🔎 Bevindingen browsertest (15 juni 2026 — Tom)

Tom heeft de drie Fiori-apps + de nieuwe startschermen lokaal in de browser getest. Bevindingen, op prioriteit:

### 🔴 Kritiek voor demo
- [x] **[Tom]** **TeamLead kan goedkeuringen aanpassen → GEDAAN.** Twee bound actions `goedkeuren()`/`afkeuren()` op `TeamService.TravelExtensions` met `UI.DataFieldForAction`-knoppen (groen/rood) op de Object Page; zetten `Pending` → `Approved`/`Rejected` in één klik. Hergebruikt de teamcheck (`_assertTeamOwnership`): een reis buiten het eigen team geeft 403. Integratietest: `goedkeuren(1003)` → 200 (Approved, `modifiedBy=teamlead`); reis 2 (buiten team) → 403.
- [x] **[Tom]** **Trips Object Page laadt niets → GEDAAN.** Bleek twee oorzaken: (1) de detailpagina toonde geen inhoud omdat **HR People/Trips/Airlines en Team Trips geen `UI.Facets`** hadden (enkel een header) — Facets + FieldGroup toegevoegd; (2) de **Trips-lijst was onvolledig** doordat `collectAllTrips` maar de eerste 8 People ophaalde — paginatie gefixt (zie #70/PR #71). De data zelf was altijd al beschikbaar (`/hr/Trips(5007)` → 200).

### 🔒 Security
- [x] **[Tom]** **Auth-gate op de UI → GEDAAN.** Middleware in `server.js` controleert de JWT-cookie vóór de statische app-shells (`/travel|team|hr-dashboard/webapp/*`) én de startpagina's (`*-start.html`); geen/ongeldige sessie → 302 naar de juiste `*-login.html`. Login-/landingspagina's en `/auth/*` blijven publiek. Getest: zonder cookie → 302, mét cookie → 200, geen redirect-loops.
- [ ] **[Naam]** **Sleutels/IDs zichtbaar in de URL** (bijv. `#/People('keithpinckney')`, `#/Trips(5007)`) — Toms opmerking dat de URL's niet netjes zijn en data tonen. Dit is **standaard Fiori Elements-gedrag**: de entiteitssleutel staat in de hash voor deep-linking/bookmarks. Het is een client-side `#`-fragment (wordt niet naar de server gestuurd → geen server-side lek/logging) en de sleutels zijn identifiers (TripPin-username, reis-ID), geen gevoelige gegevens. Verbergen kan **niet** zonder Fiori Elements te verlaten (freestyle UI5). **Aanbeveling: accepteren als normaal SAP-gedrag** (laag/geen prioriteit); eventueel benoemen in de demo.

### 🎨 UX / navigatie
- [x] **[Tom]** **Weg terug + logout → GEDAAN.** Vaste PrimePath-balk (`position: fixed`) met **← Overzicht** (naar het rol-startscherm) en **Afmelden** (`POST /auth/logout` → landingspagina) toegevoegd aan elke `webapp/index.html` (travel/team/hr). Geen layout/hoogte-impact. (Binnen de app werkt browser-/FE-back tussen lijst en Object Page sowieso.)
- [x] **[Tom]** **"Start"-knop Team → geen bug.** Dit is de standaard Fiori-filterbalkknop "Go" (in NL UI5 "Start"): hij past de filters toe. Omdat de lijst al via `initialLoad` geladen is, verandert er visueel niets bij ongewijzigde filters. Verwacht gedrag.

### 🟡 Performance
- [x] **[Tom]** **Airlinegebruik laadt traag → GEDAAN.** (a) `travel-start.html` leidt de top-airline af uit `getAirlineStats` (één call minder); (b) caches pre-warmen bij boot in travel/team/hr; (c) de PlanItems-traversal parallelliseren (`Promise.all` over personen én reizen). Resultaat: `getAirlineStats` cold **31,5s → 8,1s**, warm **0,003s**. Bovendien hergebruiken de KPI-counts (active/onTravel/upcoming) nu de gecachte reizenlijst → **instant** (was elke keer een volledige traversal).

### 🟢 Ruis (geen actie vereist — ter info)
> Deze console-meldingen zijn normaal voor een ongebouwde, standalone SAPUI5-app in dev en breken niets:
> - `Component-preload.js` 404 / MIME-mismatch → geen preload-bundle in dev; UI5 laadt losse modules. `cds build` genereert dit voor productie.
> - `i18n_nl.properties` / `i18n_en.properties` 404 → UI5 zoekt taal-specifieke bundles en valt terug op `i18n.properties`. Optioneel te stillen met lege taalbestanden.
> - `/sap/bc/lrep/flex/...` 404 → geen flexibility/variant-backend (standalone). Onschadelijk.
> - `S/CUBE is not yet supported`, MDC `PropertyInfoValidator`-warnings, `No cards available` → bekende SAPUI5-ruis.
> - `GET /travel/$metadata - Network error` → waarschijnlijk transient (trage remote / eerste load); de app laadt verder. In het oog houden.

---

## 🔍 Controle tegen FA/TA v4 (16 juni 2026 — Ismael) — wat nog ontbreekt

Volledige controle van de Functionele Analyse (FV01–FV30) en de Technische Analyse tegen de werkelijke, **lokaal geteste** code. Hieronder enkel **wat nog ontbreekt of afwijkt** van de documenten; het werkende deel is bevestigd en staat in de secties hieronder.

### 🔴 Beslissing nodig vóór demo
- [ ] **[Naam]** **FA-scope vs FV-lijst** — FA v4 lijst **FV-10, FV-12, FV-16 en FV-19** nog als vereisten, maar ze staan buiten scope (zie 🔵 Buiten scope). Risico: de FA belooft wat de demo niet toont. Kies: (a) opnemen in FA §6.2 met motivering, of (b) expliciet als fase-2-keuze benoemen in de presentatie.

### 🟡 Functioneel — ontbreekt of gedeeltelijk
- [ ] **[Naam]** **FV-11** — De reizenlijst in Travel toont **geen Aankomst/bestemming**. De geroute lijst is Reisextensies (Vertrek + status); de volledige Trips-lijst (Vertrek/Aankomst) is **niet als route** opgenomen in `app/travel-dashboard/webapp/manifest.json`. Beslis: Trips-lijst toevoegen of Reisextensies-`LineItem` uitbreiden met `EndsAt`.
- [ ] **[Naam]** **FV-13** — **Datumbereik-filter ontbreekt** in de Travel-lijst: `UI.SelectionFields` van TravelExtensions bevat enkel `ApprovalStatus`, geen datum. Voeg `StartsAt`/`EndsAt` toe als (bereik)filter in `app/travel-dashboard/annotations.cds`.
- [ ] **[Naam]** **FV-04 / FV-21** — **Centrale zoekbalk** ontbreekt: FA vraagt één centrale zoekbalk (medewerker/luchthaven/airline); nu is er enkel zoeken **per lijst** (Fiori-standaard). Beslis: aanvaarden + in de demo benoemen, of als bewuste afwijking documenteren in de FA.

### 🟡 Technisch (TA) — beschreven maar ontbreekt
- [ ] **[Naam]** **TA §6.3** — **React demo-dashboard `/dashboard` bestaat niet**: `app/dashboard/` is leeg in de repo, terwijl de TA het in detail beschrijft (incl. Bijlage A). Bouwen (gekoppeld aan /travel·/team·/hr) of uit de TA verwijderen.
- [ ] **[Naam]** **TA §6.4** — **Beheerscherm gebruikersaccounts ontbreekt**: de `AdminService` (`/admin`) werkt (HTTP 200), maar er is **geen UI-scherm** om accounts te beheren. Bouwen of TA bijstellen.
- [ ] **[Naam]** **TA §7.4** — **Seed-data juni 2026 ontbreekt**: daardoor toont de OnTravel-badge altijd 'Beschikbaar' en vallen de KPI's terug op fallbackwaarden. Voeg 5–10 TravelExtensions-rijen met 2026-datums toe (gekoppeld aan reizen die via People/Trips bestaan).
- [ ] **[Naam]** **TA §6.2** — **Logout in shell-header**: TA beschrijft een uitlogknop in de Fiori shell-header; nu is er een eigen vaste PrimePath-balk (werkt wél). Aanvaarden of tekst/implementatie gelijktrekken.

> Bevestigd **werkend** bij deze controle (geen actie nodig): FV-01/02/03/05/06/07/08/09/14/15/17/18/20 (Travel), FV-22 t/m FV-26 (Team), FV-27 t/m FV-30 (HR), de 4 services incl. `/admin`, JWT-auth + auth-gate + rate-limiting + JWT_SECRET-hardfail, `sap_horizon`, NL-labels en 401-redirect.

---

## ✅ Klaar (niet aanraken)

- [x] Login-flow (JWT-cookie, 3 rollen)
- [x] TravelExtensions CRUD voor TravelAdmin (ProjectCode, ApprovalStatus, InternalNote)
- [x] Validatie ProjectCode (begint met PROJ-), ApprovalStatus enum, InternalNote max 500 tekens
- [x] TeamLead-beperking: alleen ApprovalStatus aanpassen van eigen teamleden
- [x] UserMapping JWT-mismatch gefixt (verouderde omschrijving: sinds de V6-vereenvoudiging loopt de koppeling via Users.tripPinUserName → UserMapping.TeamLeadUserName)
- [x] HR Dashboard volledig read-only
- [x] Airlines- en Airports-lijsten in alle dashboards
- [x] Datumfilter getTripCountByPeriod (FV-28)
- [x] KPI demo-fallbackwaarden (getActiveTripsCount, getOnTravelCount)
- [x] Airline-stats caching (5 minuten in-memory)
- [x] Sortering TravelExtensions op StartsAt ascending
- [x] TripPin-velden op reisdetailpagina (TripName, Budget, Description)
- [x] People ObjectPage routing in Travel Dashboard en Team Dashboard
- [x] Statusbadge annotaties (OnTravel DataPoint)
- [x] getPendingCount beperkt tot eigen teamleden
- [x] AdminService toegevoegd zodat HANA-deployment werkt
- [x] People → Trips navigatieproperty gefixt in CDS

---

## 🔴 Kritiek voor demo (moet af vóór 19 juni)

### Klantfeedback Stijn — verplicht te verwerken

- [x] **[V0.1 → GEDAAN]** Landingspagina herzien: rolbadges per kaart staan al in `app/index.html` (badge-travel/team/hr). Enkel nog visueel verifiëren op de productie-URL. ~~Oorspronkelijke taak:~~ Landingspagina herzien: de huidige drie afzonderlijke rolkaarten waarbij de gebruiker zelf zijn rol kiest zijn **verwarrend voor de demo**. Stijn geeft aan: alle kaarten tonen maar met een duidelijk label/badge welke rol toegang heeft tot welke kaart (bijv. "Alleen voor Travel Coördinator"). Zo hoef je geen XSUAA-selectie te faken. Pas `app/index.html` aan.

- [x] **[Ismael]** **[V0.3 → GEDAAN]** Gerealiseerd in `srv/shared.cds`: gedeelde projecties op People/Trips/Airlines/Airports, hergebruikt via `using` in alle drie de services. ~~Oorspronkelijke taak:~~ Servicestructuur herzien volgens feedback Stijn: breng eerst in kaart wat **alle rollen gemeenschappelijk** nodig hebben (People, Trips, Airlines, Airports lezen) en definieer dit **één keer**. Hergebruik dit in de drie services via `using`. Enkel wat echt per rol verschilt (ApprovalStatus-rechten van TravelAdmin vs TeamLead, teamfiltering, HR-stats) leeft in de rol-specifieke service. Pas de CDS `.cds`-bestanden aan zodat de gedeelde entiteiten niet driemaal apart gedefinieerd zijn.
  > *Stijn: "Beter is om eerst in kaart te brengen wat alle rollen moeten kunnen zien of doen, en pas daarna op te splitsen — in overkoepelende (gedeelde) zaken en rol-specifieke zaken. De gedeelde zaken definiëren we één keer en hergebruiken we."*

- [x] **[Ismael]** **[V3 → GEDAAN]** Gerealiseerd in `srv/travel-service.js`: de TravelAdmin heeft volledige UPDATE-rechten op `TravelExtensions` en mag een reeds besliste status (`Approved`/`Rejected`) van een TeamLead overschrijven; die override wordt als audit-event gelogd (`modifiedBy`/`modifiedAt` via de `managed`-mixin). ~~Oorspronkelijke taak:~~ TravelAdmin override-mogelijkheid op ApprovalStatus toevoegen: als een TeamLead een reis heeft afgekeurd, moet de TravelAdmin dit alsnog kunnen overschrijven. Dit is niet om de TeamLead te betwisten, maar voor opvolging wanneer de lead niet beschikbaar is. Voeg dit toe als extra UPDATE-rechten op `TravelExtensions.ApprovalStatus` voor TravelAdmin in `srv/travel-service.js`.
  > *Stijn: "Een rol die override-mogelijkheden heeft, niet zozeer om de beslissingen van de teamlead te betwisten maar om de opvolging te verzekeren wanneer de lead niet beschikbaar is."*

- [x] **[Hassan]** **[V6 → GEDAAN]** Gerealiseerd in `db/schema.cds`: UserMapping is puur TripPin-gebaseerd (`TripPinUserName` → `TeamLeadUserName`), teamcheck in `srv/team-service.js` gebruikt dit al. Let op: README vermeldt nog het oude `TeamLeadLoginId` → rechtzetten (zie TA-sectie onderaan). ~~Oorspronkelijke taak:~~ UserMapping vereenvoudigen: de huidige mapping gebruikt BTP login-IDs (e-mailadressen). Stijn raadt aan om **puur met TripPin-data** te werken: maak een lokale mapping die `TripPin UserName` van een medewerker koppelt aan de `TripPin UserName` van zijn/haar TeamLead — los van BTP-logins. Dit maakt de koppeling eenvoudiger en minder afhankelijk van BTP-configuratie. Pas `db/schema.cds` (UserMapping entiteit) en `srv/team-service.js` (teamcheck-logica) aan.
  > *Stijn: "Ik zou eerder werken met data vanuit TripPin. Waar je een mapping tabel maakt op de entity People - los van BTP."*

### Ontbrekende FV's — kritiek

- [x] **[Tom]** **FV-01 → GEDAAN** Backend bestond al (`getActiveTripsCount`, demo-fallback 7); KPI-tegel "actieve reizen" nu zichtbaar op het niveau-1-startscherm `app/travel-start.html`.
- [x] **[Tom]** **FV-03 → GEDAAN** Backend bestond al (`getOnTravelCount`, demo-fallback 3); KPI-tegel "medewerkers op reis" nu zichtbaar op `app/travel-start.html`.
- [x] **[Ismael]** **FV-22** Eerstvolgende reis per teamlid tonen in teamledenlijst — GEDAAN: backend vult `NextTripName`/`NextTripDate` (`srv/team-service.js`), beide staan in de `UI.LineItem` van People (`app/team-dashboard/annotations.cds`) naast de statusbadge.
- [x] **[Ismael]** **FV-26** Filter "In behandeling" als aparte filteroptie in Team Dashboard — GEDAAN: `UI.SelectionVariant #Pending` ('In behandeling', filtert op `ApprovalStatus = Pending`) staat in `app/team-dashboard/annotations.cds` op TravelExtensions. (V9: visuele filter volstaat.)

### Security (kritiek voor productie/demo)

- [x] **[Ismael]** Harde fout bij opstarten als `JWT_SECRET` ontbreekt of nog de defaultwaarde heeft in productie — gerealiseerd in `srv/jwt-config.js` (gedeelde module die `server.js` én `srv/auth-strategy.js` gebruiken): in productie throwt het laden bij een ontbrekende of nog-default secret.
  ```js
  if (process.env.NODE_ENV === 'production' &&
      (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'primepath-dev-secret-CHANGE-IN-PRODUCTION')) {
    throw new Error('JWT_SECRET is niet ingesteld of is nog de standaardwaarde!');
  }
  ```
- [x] **[Ismael]** Volledige TripID-eigenaarschap check in TeamLead UPDATE: gerealiseerd in `srv/team-service.js` — `_collectTeamTripIds` verzamelt de TripIDs van alle teamleden en de UPDATE wordt geweigerd als het specifieke TripID daar niet bij hoort (niet langer enkel "heeft de TeamLead teamleden?")
- [x] **[Ismael]** Rate limiting toevoegen op `/auth/login` — gerealiseerd in `server.js` met `express-rate-limit` (`loginLimiter`: max 10 pogingen per 15 minuten per IP, `trust proxy` ingesteld achter de CF-router).

---

## 🟡 Gewenst voor demo (nice-to-have)

### Klantfeedback Stijn — aanbevolen

- [x] **[Tom]** **[V7 → GEDAAN]** Backend bestond al (`getUpcomingTripsCount`, horizon 14 dagen, demo-fallback 4); getoond als KPI-tegel "komende reizen" op `app/travel-start.html`.
  > *Stijn: "Je kan ook een KPI voorzien van komende reizen binnen de X aantal weken."*

- [x] **[Tom]** **[V8 → GEDAAN]** `getAirlineStats` retourneert `TripCount` én `TotalBudget`; het totale budget per airline wordt nu getoond in de airlinegebruik-sectie op `travel-start.html` én `hr-start.html` (naast het aantal boekingen).
  > *Stijn: "Beide usecases (aantal vluchten & totaal budget) zijn wel nuttig, we laten de keuze aan jullie over."*

- [x] **[Ismael]** **[V5 → GEDAAN]** Gerealiseerd in `srv/travel-service.js` (READ TravelExtensions): wanneer een TripID niet meer overeenkomt met een bestaande TripPin-reis, wordt `TripName` op '(reis niet meer beschikbaar in TripPin)' gezet en een waarschuwing gelogd via `cds.log('travel-service').warn(...)` — zowel bij een leeg antwoord als bij een ophaalfout (404/netwerk). ~~Oorspronkelijke taak:~~ Gepaste foutmelding tonen als een TripPin-reis verdwijnt of een TripID hergebruikt wordt.
  > *Stijn: "Opvangen met een gepaste error, moest dit gebeuren. Wij verwachten dat dit niet gebeurt."*

### Ontbrekende FV's — nice-to-have

- [x] **[Tom]** **FV-02 / FV-06 → GEDAAN** `getAirlineStats` wordt nu als staafvisualisatie (top 5, met boekingen + budget) gerenderd op `travel-start.html` én `hr-start.html`.
- [x] **[Tom]** **FV-05** — Op `travel-start.html` staat een KPI-tegel **"Komende reizen"** (`getUpcomingTripsCount`, 14 dgn). Een volledige gesorteerde lijst-sectie zou met de 2014-TripPin-data leeg zijn (geen toekomstige reizen); de tegel dekt de bedoeling. _Bij echte toekomstige data kan dit later een lijst-sectie worden._
- [x] **[Tom]** **FV-07 → GEDAAN** E-mailadres zichtbaar in de Travel medewerkerslijst + detailpagina via een virtueel scalair `Email`-veld (eerste adres uit het `many String` `Emails`-veld), gevuld in de People-READ-handler. Getest: russellwhyte → Russell@example.com.
- [x] **[Tom]** **FV-13** — De reislijst heeft `StartsAt` en `EndsAt` als `SelectionFields`. In Fiori Elements ondersteunt elk datumfilterveld standaard **bereik-operatoren** ("tussen X en Y"), dus een van–tot-filter op `StartsAt` werkt out-of-the-box (geen extra annotatie nodig). Visuele bevestiging staat in `TESTPLAN.md` (HR Reizen-lijst).
- [x] **[Tom]** **FV-18 → GEDAAN** Aantal boekingen per airline (`TripCount`) toegevoegd als kolom "Boekingen" in de Airlines-lijst (Travel + HR), gevuld uit de gecachte airline-stats in de Airlines-READ-handler (graceful: faalt de stats, dan 0). Getest: AA:4, FM:2, MU:2. _Indicatief: airline-stats samplen een deel van de medewerkers._
- [x] **[Tom]** **FV-20 → GEDAAN** Stad in de luchthavenlijst (Travel) via een virtueel scalair `City`-veld + een gecachte `IcaoCode→stad`-map die via **raw `TripPin.send`** wordt opgehaald (de raw respons bevat `Location` zonder CAP's flattening; de directe annotatie `Location.City.Name` brak de lijst eerder met een 502). De Airports-READ-handler merget City (graceful) en de cache wordt pre-warmed bij boot. Getest: SFO→San Francisco, LAX→Los Angeles, PEK→Beijing, JFK→New York City.
- [x] **[Tom]** **FV-29 → GEDAAN** De People-lijst is bereikbaar vanuit het HR Dashboard: de `PeopleList`/`PeopleObjectPage`-route is toegevoegd in PR #54 (naast Trips en Airlines).

### Data & functionaliteit

- [x] **[Tom → NIET HAALBAAR]** Mock-reisdata met juni-2026-datums kan niet via `primepath-TravelExtensions.csv`: die tabel bevat **geen reisdatums** (alleen TripID + PrimePath-velden). `StartsAt`/`EndsAt` komen uit de **externe, onveranderlijke TripPin-bron (2014)**. Vandaar de bewuste KPI-fallbacks. (Alternatief zou een eigen reizen-entiteit vereisen i.p.v. TripPin — buiten scope.)
- [x] **[Tom]** Statusbadge-logica ('Op reis'/'Beschikbaar') is correct en aanwezig (`srv/travel-service.js`/`srv/team-service.js`); ze toont in de demo "Beschikbaar" omdat er geen actuele reizen in de 2014-data zijn (verwacht, zie hierboven).
- [x] **[Tom]** HR-grafiek getest: `getAirlineStats` laadt correct (integratietest als `hrviewer`: 8 airlines geretourneerd) en wordt getoond op `hr-start.html`.
- [ ] **[Naam]** Landingspagina (`app/index.html`) testen in productie-URL

### UX-verbeteringen

- [x] **[Tom]** Logout-knop toegevoegd in alle 3 Fiori-apps (de "Afmelden"-knop in de PrimePath-balk in `webapp/index.html`; roept `POST /auth/logout` aan en gaat naar de landingspagina).
- [x] **[Tom]** Automatische redirect naar login bij verlopen sessie (401/403) — GEDAAN: XHR-interceptor in elke `webapp/index.html` (UI5 gebruikt XMLHttpRequest, geen `fetch`) redirect bij een 401/403-respons naar de juiste `*-login.html`. Complementair aan de server-side auth-gate.
- [x] **[Tom]** Auditlog in UI: `modifiedAt`/`modifiedBy`/`createdAt`/`createdBy` toegevoegd als "Wijzigingshistoriek"-facet op de TravelExtensions Object Page in Travel én Team — zichtbaar wie wanneer de status wijzigde.
- [x] **[Ismael]** Foutmelding verbeteren bij ongeldige datumparameters in `getTripCountByPeriod` — GEDAAN in `srv/hr-service.js`: een opgegeven `from`/`to` die geen geldige datum is, geeft `req.error(400, 'Ongeldige datumparameters: gebruik een geldige datum (ISO 8601).')`.

### Logging

- [x] **[Tom]** Logging toegevoegd in de stille `catch`-blokken van `srv/travel-service.js` (OnTravel-status, actieve/komende telling, airline-stats) en `srv/hr-service.js` (PlanItems, per persoon, fallback): elk `catch (err)` logt nu `cds.log('<service>').warn(...)` zodat fouten traceerbaar zijn via `cf logs`, met behoud van de bestaande fallback. (`team-service.js`/`trippin-trips.js` logden al.)

---

## 🎨 Fiori Elements — correct gebruik (officiële SAP-richtlijnen)

> Gebaseerd op de officiële [SAP Fiori Design Guidelines](https://experience.sap.com/fiori-design-web/), [SAP CAP documentatie](https://cap.cloud.sap/docs/guides/uis/fiori) en [SAPUI5 annotatie-documentatie](https://sapui5.hana.ondemand.com/sdk/). Vereist door FA §9.1 (vijf Fiori-principes) en TA §6.1 (Fiori Elements floorplans). Cross-referenced met Stijn/Babet-feedback.

### Thema & visuele identiteit (FA §9.1 · TA §6.1)

- [x] **[Tom]** `sap_horizon`-thema staat in **alle 3 apps** (bootstrap-parameter `data-sap-ui-theme="sap_horizon"` in elke `webapp/index.html`). Daar bovenop nu een PrimePath-merk-overlay (`webapp/css/primepath.css`) die de Horizon CSS-variabelen naar de huisstijlkleuren zet.
- [x] **[Tom]** `sap_horizon` wordt geladen: `data-sap-ui-theme="sap_horizon"` staat in de bootstrap van elke `webapp/index.html`, plus de PrimePath-overlay. (Visuele eindcontrole in de browser blijft aan te raden.)

### List Report floorplan — verplichte annotaties (officieel CAP/Fiori Elements)

> Volgens de officiële CAP-documentatie zijn `UI.LineItem` en `UI.SelectionFields` de minimumvereisten voor een werkend List Report. `UI.HeaderInfo` is verplicht voor de Object Page.

- [x] **[Tom]** **Airlines-route in Travel Dashboard** — `AirlinesList`/`AirlinesObjectPage` toegevoegd aan `app/travel-dashboard/webapp/manifest.json` (annotatie bestond al).
- [x] **[Tom]** **Airports-route in Travel Dashboard** — `AirportsList`/`AirportsObjectPage` toegevoegd aan `manifest.json`.
- [x] **[Tom]** **People-route in HR Dashboard** — `PeopleList`/`PeopleObjectPage` toegevoegd aan `app/hr-dashboard/webapp/manifest.json`.
- [x] **[Tom]** **Airlines-route in HR Dashboard** — `AirlinesList`/`AirlinesObjectPage` toegevoegd aan HR Dashboard `manifest.json`.
- [x] **[Tom]** `@UI.PresentationVariant` met expliciete `SortOrder` toegevoegd op de nieuw-gerouteerde entiteiten: Travel Airlines/Airports (op `Name`) en HR People (op `LastName`)/Airlines (op `Name`). _Resterend (los): HR Trips en Travel People/Trips hebben nog geen expliciete PresentationVariant._

### Object Page floorplan — verplichte annotaties (officieel)

> Volgens de officiële SAP-richtlijnen is `UI.HeaderInfo` de **enige verplichte annotatie** voor een Object Page. `UI.Facets` en `UI.FieldGroup` zijn technisch optioneel maar essentieel voor zinvolle weergave van detaildata.

- [x] **[Tom]** Elke Object Page heeft een `@UI.HeaderInfo` met `TypeName`/`TypeNamePlural`/`Title` — geverifieerd voor alle entiteiten in alle 3 apps (Travel, Team, HR).
- [x] **[Tom]** `@UI.Facets` op de TravelExtensions Object Page met aparte secties: (1) reisgegevens (TripPin), (2) PrimePath interne velden incl. goedkeuringsstatus, (3) **wijzigingshistoriek** (`modifiedAt`/`modifiedBy`/`createdAt`/`createdBy`). Reeds als losse FieldGroup-facetten.
- [x] **[Tom]** `@UI.Identification` met `DataFieldForAction` aanwezig op **Team** `TravelExtensions` (Goedkeuren/Afkeuren) én op **Travel** `TravelExtensions` (de **Bewerken**-knop, FV-17 — zie BUG-03).

### Semantische kleuren & Criticality (officieel Fiori-patroon)

> Fiori Elements rendert automatisch semantische kleuren op basis van `Criticality`-waarden: 1 = rood (fout), 2 = oranje (waarschuwing), 3 = groen (succes). Dit is de officiële methode voor statusweergave per SAP Design Guidelines.

- [x] **[Tom]** `Criticality`-mapping toegevoegd op `ApprovalStatus` via een inline `$edmJson`-expressie (Approved=3 groen, Rejected=1 rood, Pending=2 oranje) in zowel `UI.LineItem` als de Object Page `FieldGroup` van `app/travel-dashboard/annotations.cds` en `app/team-dashboard/annotations.cds`. ~~Oorspronkelijke taak:~~ voeg een virtueel veld `ApprovalStatusCriticality` toe (of gebruik een inline CDS-mapping) met Pending→2, Approved→3, Rejected→1.
- [x] **[Tom]** Gekleurde badge i.p.v. platte tekst gerealiseerd: het `ApprovalStatus`-`DataField` mét `Criticality` rendert in Fiori Elements als gekleurde `ObjectStatus`-badge (met semantisch icoon) in de lijst. (`UI.DataFieldForAnnotation` met aparte `DataPoint` is daardoor niet nodig.)

### i18n labels & internationalisatie (officieel CAP-advies)

> Officieel CAP-advies: gebruik `@title` (mapt naar `@Common.Label`) in CDS-modellen i.p.v. hardcoded strings in annotaties. De CDS Language Server waarschuwt voor niet-geïnternationaliseerde labels.

- [x] **[Tom]** **Bewuste keuze: geen `{i18n>}`-sleutels.** De demo is Nederlandstalig; `{i18n>}` levert alleen meerwaarde bij meertaligheid en riskeert "rauwe sleutel"-weergave bij een ontbrekende key. We centraliseren de labels in plaats daarvan via literal Nederlandse `@title` (zie volgende punt) — het officiële CAP-advies. De annotatie-`Label`-strings zijn bovendien al Nederlands.
- [x] **[Tom]** `@Common.Label` via `@title`-annotaties toegevoegd in `srv/shared.cds` voor alle gedeelde attributen (People/Trips/Airlines/Airports). Alle 3 services erven nu dezelfde Nederlandse labels zonder herhaling; filterbalk/value-help/object page krijgen consistente NL-labels.

### Draft-ondersteuning voor bewerkbare entiteiten (officieel CAP-vereiste)

> Officieel CAP-standpunt: "We raden aan altijd Draft te gebruiken wanneer de applicatie data-invoer door eindgebruikers vereist." Voor OData V4 met Fiori Elements is `@odata.draft.enabled` de standaardmethode voor bewerkbare entiteiten. Zonder draft zijn inline-bewerkingen niet mogelijk in Fiori Elements V4.

- [x] **[Tom]** **Draft bewust niet gebruikt — bewerken via een actie i.p.v. (FV-17, BUG-03 opgelost).** `@odata.draft.enabled` botst met de custom READ-handler (virtuele TripPin-velden). In plaats daarvan bewerkt de TravelAdmin de PrimePath-velden via een **bound action `bewerk`** (ProjectCode/ApprovalStatus/InternalNote), die FE als dialoog rendert. Lege velden blijven ongemoeid. Getest via API: geldig → 200 (`modifiedBy=traveladmin`), foute waarden → 400, partiële wijziging behoudt de rest.
- [x] **[Tom]** Validatie zit in `srv.before(['CREATE','UPDATE'], 'TravelExtensions', …)` (ProjectCode `PROJ-`, ApprovalStatus-enum, InternalNote max 500) en wordt **hergebruikt** door de `bewerk`-actie (die via `this.update` door dezelfde handler loopt) — geen duplicatie.

### SelectionVariant — standaard actieve filters (officieel Fiori-patroon)

- [x] **[Tom]** `@UI.SelectionVariant #Pending` (Team) geverifieerd: de variant is aanwezig en `initialLoad` staat aan, maar een bare `SelectionVariant` wordt in FE V4 **niet automatisch als default-filter toegepast** (dat vereist een `SelectionPresentationVariant`-default). Conform de V9-beslissing ("visuele filter volstaat") laten we het een **beschikbare filter** i.p.v. een opgedrongen default — bewuste keuze.
- [x] **[Tom]** **`@UI.SelectionVariant #Upcoming` → niet haalbaar.** `StartsAt` op `TravelExtensions` is een **virtueel** veld (ingevuld vanuit TripPin in de READ-handler), dus er kan niet op gefilterd worden in de DB-query — een SelectionVariant erop zou falen/geen effect hebben. Een echte server-side filter zou een persistente datumkolom vereisen (en die is er niet, want reisdatums leven in TripPin).

### Shell-header logout & 401-redirect (TA §6.2)

- [x] **[Tom]** Logout in alle 3 apps — GEDAAN via de vaste PrimePath-balk (← Overzicht / Afmelden) in `webapp/index.html`. _Bewuste afwijking van de shellPlugin-aanpak: een standalone FE V4-app heeft geen FLP-shell; een lichte vaste balk is robuuster en risicoloos (geen layout-/hoogte-impact)._
- [x] **[Tom]** Automatische 401-redirect per TA §6.2 — GEDAAN via een XHR-interceptor in elke `webapp/index.html` (redirect naar de juiste `*-login.html` bij 401/403). Lichter en betrouwbaarder dan een per-controller-extensie, en vangt álle UI5-requests af.

### Startscherm (Niveau 1) — FA §9.2 drie navigatieniveaus

> FA §9.2 definieert expliciet drie navigatieniveaus: (1) startscherm, (2) lijstscherm, (3) detailpagina. De huidige apps openen direct op niveau 2 (List Report). KPI's en de "aankomende reizen"-sectie bestaan alleen in het React demo-dashboard, niet in de officiële Fiori-apps.

- [x] **[Tom]** **[KRITIEK → GEDAAN]** Niveau-1-startscherm toegevoegd via optie (a): `app/travel-start.html` met KPI-tegels (actieve reizen FV-01, op reis FV-03, komende reizen V7), een "meest gebruikte airline"-tegel (FV-02), een airlinegebruik-sectie (FV-06/V8) en navigatiekaarten naar de List Reports (niveau 2). Live data via de bestaande CAP-functies; geserveerd door `server.js` + `mta.yaml`; login-redirect wijst ernaartoe. 401/403 → terug naar `travel-login.html`.
- [x] **[Tom]** Startscherm Team Dashboard toegevoegd (`app/team-start.html`): KPI openstaande goedkeuringen (`getPendingCount`) + teamleden op reis/beschikbaar (uit `/team/People`), met navigatiekaarten naar goedkeuringen/teamleden/reizen. Login-redirect wijst ernaartoe.
- [x] **[Tom]** Startscherm HR Dashboard toegevoegd (`app/hr-start.html`): airline-stats overzicht (`getAirlineStats`) als top-5 staafvisualisatie met budget, plus KPI's (aantal airlines, totaal boekingen, meest gebruikte airline). Datumfilter voor reisperiodes blijft op de Trips-lijst (FV-28).

---

## 🎨 Design / UX (update vereist vóór demo)

> De huidige UI is de standaard SAP Fiori Elements-stijl. Voor een indrukwekkende demo bij EhB en Flexso verdient de presentatielaag aandacht.

- [ ] **[Naam]** Landingspagina (`app/index.html`) visueel verbeteren — voeg logo, kleuraccenten of een hero-sectie toe die aansluit bij PrimePath Travel branding. **Combineer dit met de V0.1-fix** (rolbadges ipv rolselectie)
- [x] **[Tom]** Fiori-thema consistent: alle 3 apps draaien op `sap_horizon` + een gedeelde PrimePath-merk-overlay (`webapp/css/primepath.css`, geregistreerd via `sap.ui5.resources.css`). Merkkleuren brand `#0070F2` / hover `#0058C4` op brand/accent, nadruk-knoppen, links/selectie en de shellbalk. _Visuele eindcontrole nog in de browser._
- [x] **[Tom]** Kolomlabels/veldnamen zijn Nederlands: de annotatie-`Label`-strings waren al NL, en de gedeelde entiteiten hebben nu centrale Nederlandse `@title`-labels in `srv/shared.cds`. (Resterende Engelse termen zijn eigennamen/codes: `Trip ID`, `IATA-code`, `ICAO-code`, `Budget`.)
- [ ] **[Naam]** KPI-tegels visueel opwaarderen in Travel Dashboard — gebruik `@UI.HeaderInfo` met subtitle die het totaal dynamisch toont en zorg dat de tegel een icoontje heeft (bijv. `sap-icon://travel-expense`)
- [ ] **[Naam]** Lege-state melding toevoegen als er geen reizen zijn — Fiori Elements toont standaard een leeg scherm; voeg `@UI.MessagePage` toe of pas de `noDataText` aan in `manifest.json`
- [x] **[Tom]** Loginpagina's zijn uniform: alle 3 (`travel-/team-/hr-login.html`) delen dezelfde structuur/CSS (shell-header, role-badge, login-card, PrimePath-logo) — geverifieerd. Enkel rol-label/badgekleur verschilt.
- [ ] **[Naam]** Mobiele weergave controleren — Fiori Elements is responsive, maar check in BAS preview of de lijst- en detailpagina's correct schalen op smaller scherm (niet verplicht, maar indrukwekkend tijdens demo)

---

### Testen & deployen

- [ ] **[Naam]** Volledige deploy uitvoeren op BTP na alle fixes: `mbt build && cf deploy mta_archives/exploratory-travel-dashboard_1.0.0.mtar -f`
- [ ] **[Naam]** Na deploy: controleer cf logs op fouten — `cf logs exploratory-travel-dashboard-srv --recent`
- [x] **[Tom]** People ObjectPage getest: de Reisoverzicht-sectie toont nu per medewerker enkel diens eigen reizen (bug gefixt — zie #78). Integratietest: russellwhyte → 3 reizen, scottketchum → 2.
- [ ] **[Naam]** TeamLead-flow testen: log in als `teamlead`, pas ApprovalStatus aan van eigen teamlid, controleer dat reizen van anderen geblokkeerd zijn (`srv/team-service.js`)
- [x] **[Tom]** Demo-script geschreven: `DEMO.md` — ~5 min per rol (TravelAdmin → TeamLead → HR), met voorbereiding (cache warm-up), klik-flow per rol en architectuur-praatpunten.


---

## 🔵 Buiten scope voor demo (bewust niet gedaan)

> ⚠️ **Let op (review 12 juni):** FV-04, FV-10, FV-12, FV-16, FV-19 en FV-23 staan hieronder als buiten scope, maar staan in de Functionele Analyse v4 nog als vereisten en NIET in §6.2 'Wat bouwen we niet'. Dat is een risico bij de beoordeling (FA belooft wat de demo niet toont). Kies vóór 19 juni: (a) deze FV's alsnog opnemen in FA §6.2 met motivering, of (b) ze in de presentatie expliciet benoemen als bewuste fase-2-keuzes.

- Globale cross-entiteit zoekbalk (FV-04) — Fiori Elements ondersteunt dit niet standaard
- Filter op bestemming (FV-12) — TripPin Trips heeft geen Destination-veld op rootniveau
- Doorklikken reisdetail → airline (FV-16) — vereist extra associaties in CDS
- Doorklikken airline → reizen (FV-19) — vereist extra associaties in CDS
- Doorklikken medewerker → specifieke reis (FV-10) — vereist People → TravelExtensions koppeling
- Visuele Gantt-tijdlijn (FV-23 visueel) — Fiori Elements heeft geen ingebouwde tijdlijnweergave
- CSV-exportfunctie HR-dashboard — **niet gewenst door klant** (V0.2: "niet te veel functionaliteit naar Excel trekken, zoveel mogelijk in de app zelf")
- Create Flow voor nieuwe reizen — **bevestigd niet nodig** (V4: "nieuwe reizen vloeien vanuit TripPin, bidirectioneel is niet nodig")
- Gewone medewerkers eigen reizen laten bekijken — **bevestigd buiten scope** (V11: "geen slechte functionaliteit maar niet in scope")
- Redis/HANA-gebaseerde cache voor airline-stats — in-memory cache werkt niet bij meerdere CF-instanties
- XSUAA automatische rolselectie — voor de demo werkt de badge-aanpak op de landingspagina (V0.1)

---

## 📄 TA v4 is leidend - code in lijn brengen met de Technische Analyse (12 juni 2026)

> Afspraak team: de Technische Analyse v4 beschrijft de doelarchitectuur. Onderstaande punten brengen de code in lijn met de TA. Punten die al elders in deze TODO staan, zijn hier enkel gekoppeld aan het TA-hoofdstuk.

### Nieuw (nog niet elders in deze TODO)

- [x] **[Tom]** **[TA §6.3 → VERVALLEN]** Het React demo-dashboard (`app/dashboard/`) is **verwijderd** (hardgecodeerde mockup, niet het beoogde eindproduct). De drie Fiori Elements-apps zijn de frontend; het koppelen van een los React-dashboard aan CAP is daarmee niet meer van toepassing.
- [ ] **[Naam]** **[TA §6.4]** Beheerscherm voor gebruikersaccounts bovenop AdminService (/admin): accounts aanmaken, rol toekennen, wachtwoord resetten (server-side bcrypt-hash). Alleen voor TravelAdmin.
- [x] **[Tom]** **[TA §3.3 + README → REEDS IN ORDE]** README gebruikt al `TeamLeadUserName` (geen `TeamLeadLoginId` meer); README en `db/schema.cds` lopen gelijk. Geverifieerd, niets te wijzigen.
- [x] **[Tom]** **[TA Bijlage A → REEDS IN ORDE]** `.gitignore` negeert al `*.sqlite`, `*.sqlite-shm`, `*.sqlite-wal` en `*.log`; `git ls-files` toont geen getrackte sqlite-/log-bestanden. Niets te verwijderen uit versiebeheer.

### Al in deze TODO, nu gekoppeld aan de TA (afwerken vóór 19 juni)

- [x] **[TA §7.3]** TravelAdmin override op ApprovalStatus (zie 🔴 Klantfeedback V3)
- [x] **[TA §7.3]** Volledige TripID-eigenaarschap check TeamLead UPDATE (zie 🔒 Security)
- [x] **[TA §8.4]** Harde fout bij ontbrekende/default JWT_SECRET in productie (zie 🔒 Security)
- [x] **[TA §8.4]** Rate limiting op /auth/login, max 10 pogingen / 15 min (zie 🔒 Security)
- [x] **[TA §7.4 + §10 → NIET HAALBAAR]** Seed-data met juni 2026-datums kan niet: reisdatums leven in de **externe, onveranderlijke TripPin-bron (2014)**; `TravelExtensions` heeft geen eigen datumkolom (StartsAt is virtueel). Daarom bewuste **KPI-fallbacks** (7/3/4) en lege OnTravel/NextTrip. Gedocumenteerd in `TESTPLAN.md` §7.
- [x] **[TA §4.3]** getUpcomingTripsCount als KPI-tegel — GEDAAN op `travel-start.html` (zie V7).
- [x] **[TA §4.3]** getAirlineStats `TotalBudget` zichtbaar — GEDAAN op de startschermen (airlinegebruik) en in de airlinelijst (zie V8/FV-18).
- [x] **[TA §10]** Nette foutafhandeling bij verdwenen/hergebruikt TripID (zie 🟡 Klantfeedback V5)
- [x] **[TA §7.3]** Datumvalidatie in getTripCountByPeriod (zie 🟡 UX-verbeteringen)
- [~] **[TA §6.2]** Logout-knop GEDAAN (Overzicht/Afmelden-balk in alle 3 apps) + auth-gate redirect bij ongeauthenticeerde toegang. **Nog open:** automatische redirect bij een 401 die **tijdens** het gebruik van de FE-app optreedt (sessie verloopt) — vereist een UI5-fouthandler/controller-extensie (zie 🟡 UX-verbeteringen / §6.2).
- [x] **[TA §6.2]** Landingspagina met rolbadges i.p.v. rolkeuze — GEDAAN (V0.1).
- [x] **[TA §6.2]** Nederlandse labels in annotations + consistent `sap_horizon`-thema — GEDAAN (centrale `@title` in shared.cds + sap_horizon + PrimePath-overlay).

---

---

**Bronnen officiële SAP-richtlijnen (gebruikt voor 🎨 Fiori Elements-sectie):**
- [SAP Fiori Design Guidelines — List Report Floorplan](https://experience.sap.com/fiori-design-web/list-report-floorplan-sap-fiori-element/)
- [SAP Fiori Design Guidelines — Object Page Floorplan](https://experience.sap.com/fiori-design-web/object-page/)
- [SAP CAP — Serving SAP Fiori UIs (officiële gids)](https://cap.cloud.sap/docs/guides/uis/fiori)
- [SAP Blog — KPI Tags in Fiori Elements List Report OData V4](https://community.sap.com/t5/technology-blog-posts-by-sap/kpi-tags-in-sap-fiori-elements-list-report-odata-v4-beyond-analytical/ba-p/14298306)
- [SAP Blog — Dynamic Criticality in CAP met Fiori Elements](https://community.sap.com/t5/technology-blog-posts-by-members/dynamic-criticality-in-sap-cap-using-fiori-elements-and-node-js/ba-p/14408789)
- [SAP Tutorial — Fiori Elements configureren voor OData V4](https://developers.sap.com/tutorials/fiori-tools-configure-object-pages.html)
- [SAP Feature Showcase — fiori-elements-feature-showcase (GitHub)](https://github.com/SAP-samples/fiori-elements-feature-showcase)

*Laatste update: 14 juni 2026 | Contactpersoon: Tom*