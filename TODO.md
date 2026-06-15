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

- [ ] **[Naam]** **[V8 → ALLEEN UI REST]** Backend GEDAAN: `getAirlineStats` retourneert nu zowel `TripCount` als `TotalBudget` per airline (`srv/hr-service.js` én `srv/travel-service.js`). **Rest:** toon `TotalBudget` ook in de HR-grafiek of als extra kolom (UI).
  > *Stijn: "Beide usecases (aantal vluchten & totaal budget) zijn wel nuttig, we laten de keuze aan jullie over."*

- [x] **[Ismael]** **[V5 → GEDAAN]** Gerealiseerd in `srv/travel-service.js` (READ TravelExtensions): wanneer een TripID niet meer overeenkomt met een bestaande TripPin-reis, wordt `TripName` op '(reis niet meer beschikbaar in TripPin)' gezet en een waarschuwing gelogd via `cds.log('travel-service').warn(...)` — zowel bij een leeg antwoord als bij een ophaalfout (404/netwerk). ~~Oorspronkelijke taak:~~ Gepaste foutmelding tonen als een TripPin-reis verdwijnt of een TripID hergebruikt wordt.
  > *Stijn: "Opvangen met een gepaste error, moest dit gebeuren. Wij verwachten dat dit niet gebeurt."*

### Ontbrekende FV's — nice-to-have

- [ ] **[Naam]** **FV-02 / FV-06** Airline-grafiek (taart- of staafdiagram) op Travel Dashboard startscherm — `getAirlineStats` bestaat maar wordt het ook als grafiek gerenderd in de Travel Dashboard UI?
- [ ] **[Naam]** **FV-05** Eerstvolgende reizen gesorteerd op vertrekdatum als sectie op Travel Dashboard startscherm — is er een "komende reizen" blok zichtbaar bij het inloggen als TravelAdmin?
- [ ] **[Naam]** **FV-07** E-mailadres tonen in medewerkerslijst Travel Dashboard — het `Emails`-veld uit TripPin People is niet zichtbaar in de LineItem (`app/travel-dashboard/annotations.cds`)
- [ ] **[Naam]** **FV-13** Datumfilter als bereik (van–tot) op reislijst — `SelectionFields` heeft `StartsAt` en `EndsAt` maar controleer of die samen als bereikfilter werken of als twee losse filters
- [ ] **[Naam]** **FV-18** Gebruikstelling (aantal boekingen) tonen in airlinelijst — de lijst toont nu alleen `AirlineCode` en `Name`, niet het aantal boekingen per airline
- [ ] **[Naam]** **FV-20 → UITGESTELD (niet triviaal)** Stad tonen in luchthavenslijst kan **niet** via een directe annotatie `Location.City.Name`: CAP slaat het geneste TripPin-`Location`-complextype dan plat (`Location_City_Name`/`Location_Address`) bij de remote → `502 Could not find property 'Location_Address'`. Vereist een **virtueel scalair veld** `City` op de Airports-projectie + een custom `READ`-handler die `Location.City.Name` overneemt (zoals OnTravel/TripName). Onderzocht door Tom; bewust niet in de quick-wins-PR meegenomen om de Airports-lijst niet te breken.
- [x] **[Tom]** **FV-29 → GEDAAN** De People-lijst is bereikbaar vanuit het HR Dashboard: de `PeopleList`/`PeopleObjectPage`-route is toegevoegd in PR #54 (naast Trips en Airlines).

### Data & functionaliteit

- [ ] **[Naam]** Mock-reisdata toevoegen met datums in **juni 2026** zodat KPI-tegels echte waarden tonen en de statusbadge werkt — update `db/data/primepath-TravelExtensions.csv` met 5–10 rijen met `StartsAt`/`EndsAt` in 2026
- [ ] **[Naam]** Statusbadge 'Op reis'/'Beschikbaar' werkend maken — afhankelijk van bovenstaande mock-data (de logica staat al in `srv/travel-service.js` en `srv/team-service.js`)
- [ ] **[Naam]** HR-grafiek testen: laadt `getAirlineStats` correct? Worden airlines getoond? (`srv/hr-service.js`)
- [ ] **[Naam]** Landingspagina (`app/index.html`) testen in productie-URL

### UX-verbeteringen

- [ ] **[Naam]** Logout-knop toevoegen in de dashboards — het endpoint `POST /auth/logout` bestaat al (`server.js` regel 95), maar er is geen knop in de Fiori-apps. Voeg een custom actie of een link toe in de shell-header van elke webapp
- [ ] **[Naam]** Automatische redirect naar loginpagina bij verlopen sessie (401/403) — voeg een `fetch`-interceptor toe in de webapps die bij een 401-response redirect naar de juiste login-HTML (bijv. `travel-login.html`)
- [ ] **[Naam]** Auditlog tonen in UI: `modifiedAt` en `modifiedBy` zijn al aanwezig via CAP `managed`-mixin (`db/schema.cds` regel 27) — voeg ze toe aan de ObjectPage van TravelExtensions zodat zichtbaar is wie wanneer de status heeft gewijzigd
- [x] **[Ismael]** Foutmelding verbeteren bij ongeldige datumparameters in `getTripCountByPeriod` — GEDAAN in `srv/hr-service.js`: een opgegeven `from`/`to` die geen geldige datum is, geeft `req.error(400, 'Ongeldige datumparameters: gebruik een geldige datum (ISO 8601).')`.

### Logging

- [x] **[Tom]** Logging toegevoegd in de stille `catch`-blokken van `srv/travel-service.js` (OnTravel-status, actieve/komende telling, airline-stats) en `srv/hr-service.js` (PlanItems, per persoon, fallback): elk `catch (err)` logt nu `cds.log('<service>').warn(...)` zodat fouten traceerbaar zijn via `cf logs`, met behoud van de bestaande fallback. (`team-service.js`/`trippin-trips.js` logden al.)

---

## 🎨 Fiori Elements — correct gebruik (officiële SAP-richtlijnen)

> Gebaseerd op de officiële [SAP Fiori Design Guidelines](https://experience.sap.com/fiori-design-web/), [SAP CAP documentatie](https://cap.cloud.sap/docs/guides/uis/fiori) en [SAPUI5 annotatie-documentatie](https://sapui5.hana.ondemand.com/sdk/). Vereist door FA §9.1 (vijf Fiori-principes) en TA §6.1 (Fiori Elements floorplans). Cross-referenced met Stijn/Babet-feedback.

### Thema & visuele identiteit (FA §9.1 · TA §6.1)

- [x] **[Tom]** `sap_horizon`-thema staat in **alle 3 apps** (bootstrap-parameter `data-sap-ui-theme="sap_horizon"` in elke `webapp/index.html`). Daar bovenop nu een PrimePath-merk-overlay (`webapp/css/primepath.css`) die de Horizon CSS-variabelen naar de huisstijlkleuren zet.
- [ ] **[Naam]** Controleer in BAS-preview of het `sap_horizon`-thema daadwerkelijk geladen wordt (afgeronde hoeken, nieuwe kleurpalet) — open de app lokaal via `cds watch` en kijk in het netwerktabblad of `sap_horizon` als thema-parameter meekomt.

### List Report floorplan — verplichte annotaties (officieel CAP/Fiori Elements)

> Volgens de officiële CAP-documentatie zijn `UI.LineItem` en `UI.SelectionFields` de minimumvereisten voor een werkend List Report. `UI.HeaderInfo` is verplicht voor de Object Page.

- [x] **[Tom]** **Airlines-route in Travel Dashboard** — `AirlinesList`/`AirlinesObjectPage` toegevoegd aan `app/travel-dashboard/webapp/manifest.json` (annotatie bestond al).
- [x] **[Tom]** **Airports-route in Travel Dashboard** — `AirportsList`/`AirportsObjectPage` toegevoegd aan `manifest.json`.
- [x] **[Tom]** **People-route in HR Dashboard** — `PeopleList`/`PeopleObjectPage` toegevoegd aan `app/hr-dashboard/webapp/manifest.json`.
- [x] **[Tom]** **Airlines-route in HR Dashboard** — `AirlinesList`/`AirlinesObjectPage` toegevoegd aan HR Dashboard `manifest.json`.
- [x] **[Tom]** `@UI.PresentationVariant` met expliciete `SortOrder` toegevoegd op de nieuw-gerouteerde entiteiten: Travel Airlines/Airports (op `Name`) en HR People (op `LastName`)/Airlines (op `Name`). _Resterend (los): HR Trips en Travel People/Trips hebben nog geen expliciete PresentationVariant._

### Object Page floorplan — verplichte annotaties (officieel)

> Volgens de officiële SAP-richtlijnen is `UI.HeaderInfo` de **enige verplichte annotatie** voor een Object Page. `UI.Facets` en `UI.FieldGroup` zijn technisch optioneel maar essentieel voor zinvolle weergave van detaildata.

- [ ] **[Naam]** Controleer of **elke** Object Page een `@UI.HeaderInfo` heeft met `TypeName`, `TypeNamePlural` en een zinvolle `Title`-waarde — loop door `app/travel-dashboard/annotations.cds`, `app/team-dashboard/annotations.cds` en `app/hr-dashboard/annotations.cds` en vul ontbrekende `HeaderInfo`-annotaties aan.
- [ ] **[Naam]** `@UI.Facets` toevoegen op TravelExtensions ObjectPage met aparte secties voor: (1) reisgegevens (`TripName`, `StartsAt`, `TripBudget`, `TripDescription`), (2) goedkeuringsstatus (`ApprovalStatus`, `InternalNote`), (3) auditgegevens (`modifiedAt`, `modifiedBy`) — nu zijn alle velden waarschijnlijk in één vlak blok. Gebruik `#FIELDGROUP_REFERENCE` facetten.
- [ ] **[Naam]** `@UI.Identification` annotatie toevoegen op TravelExtensions — verplicht voor acties op de ObjectPage-toolbar (bijv. een toekomstige "Override"-actie voor TravelAdmin). Voeg toe in `app/travel-dashboard/annotations.cds`.

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

- [ ] **[Naam]** Controleer of `TravelExtensions` is geannoteerd met `@odata.draft.enabled` in `srv/travel-service.cds` of `app/travel-dashboard/annotations.cds` — zonder dit werkt de "Bewerken"-knop op de ObjectPage niet in OData V4. Als jullie bewust kiezen voor directe PUT/PATCH zonder draft: documenteer dit als bewuste afwijking van de standaard.
- [ ] **[Naam]** Als draft ingeschakeld wordt: voeg validatie toe via `srv.before('PATCH', 'TravelExtensions', ...)` in `srv/travel-service.js` — dit is het officiële CAP-patroon voor veldbewaking tijdens een draft-sessie.

### SelectionVariant — standaard actieve filters (officieel Fiori-patroon)

- [ ] **[Naam]** `@UI.SelectionVariant #Pending` in Team Dashboard al aanwezig — verifieer of de filtervariant ook correct wordt opgepakt als de app opent (defaultFilterValues werken alleen als de SelectionVariant als `initialLoad: true` is ingesteld in `manifest.json` onder `settings`).
- [ ] **[Naam]** `@UI.SelectionVariant #Upcoming` toevoegen in Travel Dashboard voor `TravelExtensions` — filtert automatisch op reizen waarbij `StartsAt >= vandaag`. Voeg toe in `app/travel-dashboard/annotations.cds`.

### Shell-header logout & 401-redirect (TA §6.2)

- [ ] **[Naam]** Logout-knop in shell-header van alle 3 Fiori-apps — per TA §6.2 hoort de logout in de shell-header, niet als losse paginalink. Gebruik een `sap.ui.core.CustomPlugin` of de `shellPlugin` extensie in `manifest.json` (`sap.ui5.extends.extensions`).
- [ ] **[Naam]** Automatische 401-redirect per TA §6.2 — voeg een AJAX-fouthandler toe (`$.ajaxSetup` of `fetch`-interceptor) in een controller-extensie die bij elke 401-respons redirect naar de juiste `*-login.html`. Bestand aanmaken in `app/travel-dashboard/webapp/ext/` (en hetzelfde voor team/hr).

### Startscherm (Niveau 1) — FA §9.2 drie navigatieniveaus

> FA §9.2 definieert expliciet drie navigatieniveaus: (1) startscherm, (2) lijstscherm, (3) detailpagina. De huidige apps openen direct op niveau 2 (List Report). KPI's en de "aankomende reizen"-sectie bestaan alleen in het React demo-dashboard, niet in de officiële Fiori-apps.

- [x] **[Tom]** **[KRITIEK → GEDAAN]** Niveau-1-startscherm toegevoegd via optie (a): `app/travel-start.html` met KPI-tegels (actieve reizen FV-01, op reis FV-03, komende reizen V7), een "meest gebruikte airline"-tegel (FV-02), een airlinegebruik-sectie (FV-06/V8) en navigatiekaarten naar de List Reports (niveau 2). Live data via de bestaande CAP-functies; geserveerd door `server.js` + `mta.yaml`; login-redirect wijst ernaartoe. 401/403 → terug naar `travel-login.html`.
- [ ] **[Naam]** Startscherm toevoegen in Team Dashboard met overzicht openstaande goedkeuringen (FV-26/getPendingCount-tegel) — TeamLead moet bij inloggen direct zien hoeveel aanvragen wachten.
- [ ] **[Naam]** Startscherm toevoegen in HR Dashboard met airline-stats overzicht (FV-02/FV-06 grafiek) en datumfilter voor reisperiodes.

---

## 🎨 Design / UX (update vereist vóór demo)

> De huidige UI is de standaard SAP Fiori Elements-stijl. Voor een indrukwekkende demo bij EhB en Flexso verdient de presentatielaag aandacht.

- [ ] **[Naam]** Landingspagina (`app/index.html`) visueel verbeteren — voeg logo, kleuraccenten of een hero-sectie toe die aansluit bij PrimePath Travel branding. **Combineer dit met de V0.1-fix** (rolbadges ipv rolselectie)
- [x] **[Tom]** Fiori-thema consistent: alle 3 apps draaien op `sap_horizon` + een gedeelde PrimePath-merk-overlay (`webapp/css/primepath.css`, geregistreerd via `sap.ui5.resources.css`). Merkkleuren brand `#0070F2` / hover `#0058C4` op brand/accent, nadruk-knoppen, links/selectie en de shellbalk. _Visuele eindcontrole nog in de browser._
- [x] **[Tom]** Kolomlabels/veldnamen zijn Nederlands: de annotatie-`Label`-strings waren al NL, en de gedeelde entiteiten hebben nu centrale Nederlandse `@title`-labels in `srv/shared.cds`. (Resterende Engelse termen zijn eigennamen/codes: `Trip ID`, `IATA-code`, `ICAO-code`, `Budget`.)
- [ ] **[Naam]** KPI-tegels visueel opwaarderen in Travel Dashboard — gebruik `@UI.HeaderInfo` met subtitle die het totaal dynamisch toont en zorg dat de tegel een icoontje heeft (bijv. `sap-icon://travel-expense`)
- [ ] **[Naam]** Lege-state melding toevoegen als er geen reizen zijn — Fiori Elements toont standaard een leeg scherm; voeg `@UI.MessagePage` toe of pas de `noDataText` aan in `manifest.json`
- [ ] **[Naam]** Loginpagina's (`app/travel-login.html`, `app/team-login.html`, `app/hr-login.html`) uniform stylen — controleer of alle drie er hetzelfde uitzien en of het PrimePath Travel-logo/naam consistent staat
- [ ] **[Naam]** Mobiele weergave controleren — Fiori Elements is responsive, maar check in BAS preview of de lijst- en detailpagina's correct schalen op smaller scherm (niet verplicht, maar indrukwekkend tijdens demo)

---

### Testen & deployen

- [ ] **[Naam]** Volledige deploy uitvoeren op BTP na alle fixes: `mbt build && cf deploy mta_archives/exploratory-travel-dashboard_1.0.0.mtar -f`
- [ ] **[Naam]** Na deploy: controleer cf logs op fouten — `cf logs exploratory-travel-dashboard-srv --recent`
- [ ] **[Naam]** People ObjectPage testen: open Travel Dashboard → klik op medewerker → controleer of reizen zichtbaar zijn (`app/travel-dashboard/annotations.cds`)
- [ ] **[Naam]** TeamLead-flow testen: log in als `teamlead`, pas ApprovalStatus aan van eigen teamlid, controleer dat reizen van anderen geblokkeerd zijn (`srv/team-service.js`)
- [ ] **[Naam]** Demo-script schrijven: welke flow per rol? (TravelAdmin → TeamLead → HR) — max 5 min per rol


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
- [ ] **[TA §7.4 + §10]** Seed-data met juni 2026-datums zodat KPI's en OnTravel-badge echte waarden tonen (zie 🟡 Data)
- [ ] **[TA §4.3]** getUpcomingTripsCount toevoegen als extra KPI (zie 🟡 Klantfeedback V7) — backend GEDAAN, alleen UI-tegel rest
- [ ] **[TA §4.3]** getAirlineStats uitbreiden met TotalBudget per airline (zie 🟡 Klantfeedback V8) — backend GEDAAN, alleen UI-weergave rest
- [x] **[TA §10]** Nette foutafhandeling bij verdwenen/hergebruikt TripID (zie 🟡 Klantfeedback V5)
- [x] **[TA §7.3]** Datumvalidatie in getTripCountByPeriod (zie 🟡 UX-verbeteringen)
- [ ] **[TA §6.2]** Logout-knop + automatische redirect naar login bij 401 (zie 🟡 UX-verbeteringen)
- [ ] **[TA §6.2]** Landingspagina met rolbadges i.p.v. rolkeuze (zie 🔴 Klantfeedback V0.1)
- [ ] **[TA §6.2]** Nederlandse labels in annotations + consistent sap_horizon-thema (zie 🎨 Design/UX)

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