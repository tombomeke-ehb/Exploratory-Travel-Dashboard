# TODO — Exploratory Travel Dashboard
**Demo: 19 juni 2026 | EhB Cloud Integration × Flexso**

> Vink af met [x] als een taak klaar is. Vermeld je naam tussen haakjes bij elke taak die je oppakt.
> Categorieën: 🔴 Kritiek · 🟡 Nice-to-have · 🔵 Buiten scope · 🔒 Security · 🎨 Design/UX · 🛠️ Technische schuld

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

- [ ] **[Naam]** **[V3 → IMPLEMENTEREN]** TravelAdmin override-mogelijkheid op ApprovalStatus toevoegen: als een TeamLead een reis heeft afgekeurd, moet de TravelAdmin dit alsnog kunnen overschrijven. Dit is niet om de TeamLead te betwisten, maar voor opvolging wanneer de lead niet beschikbaar is. Voeg dit toe als extra UPDATE-rechten op `TravelExtensions.ApprovalStatus` voor TravelAdmin in `srv/travel-service.js`.
  > *Stijn: "Een rol die override-mogelijkheden heeft, niet zozeer om de beslissingen van de teamlead te betwisten maar om de opvolging te verzekeren wanneer de lead niet beschikbaar is."*

- [x] **[Hassan]** **[V6 → GEDAAN]** Gerealiseerd in `db/schema.cds`: UserMapping is puur TripPin-gebaseerd (`TripPinUserName` → `TeamLeadUserName`), teamcheck in `srv/team-service.js` gebruikt dit al. Let op: README vermeldt nog het oude `TeamLeadLoginId` → rechtzetten (zie TA-sectie onderaan). ~~Oorspronkelijke taak:~~ UserMapping vereenvoudigen: de huidige mapping gebruikt BTP login-IDs (e-mailadressen). Stijn raadt aan om **puur met TripPin-data** te werken: maak een lokale mapping die `TripPin UserName` van een medewerker koppelt aan de `TripPin UserName` van zijn/haar TeamLead — los van BTP-logins. Dit maakt de koppeling eenvoudiger en minder afhankelijk van BTP-configuratie. Pas `db/schema.cds` (UserMapping entiteit) en `srv/team-service.js` (teamcheck-logica) aan.
  > *Stijn: "Ik zou eerder werken met data vanuit TripPin. Waar je een mapping tabel maakt op de entity People - los van BTP."*

### Ontbrekende FV's — kritiek

- [ ] **[Naam]** **FV-01** KPI-tegel "totaal actieve reizen" zichtbaar op Travel Dashboard startscherm — `getActiveTripsCount` bestaat in `srv/travel-service.js` maar controleer of het ook visueel als tegel getoond wordt in `app/travel-dashboard/webapp/`
- [ ] **[Naam]** **FV-03** KPI-tegel "medewerkers momenteel op reis" op Travel Dashboard startscherm — definitie bevestigd door Stijn (V7): enkel medewerkers waarvoor geldt `StartsAt ≤ vandaag ≤ EndsAt`
- [ ] **[Naam]** **FV-22** Eerstvolgende reis per teamlid tonen in teamledenlijst — Team Dashboard toont de statusbadge maar toont het ook de datum en naam van de eerstvolgende reis per teamlid? (`app/team-dashboard/annotations.cds` LineItem)
- [ ] **[Naam]** **FV-26** Filter "In behandeling" als aparte filteroptie in Team Dashboard — bevestigd OK door Stijn (V9): visuele filter volstaat, geen e-mailnotificaties nodig. Controleer of de filterknop/preset zichtbaar is.

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

- [ ] **[Naam]** **[V7 → EXTRA KPI]** Tweede KPI "komende reizen binnen X weken" toevoegen op Travel Dashboard startscherm — naast de huidige "medewerkers op reis vandaag" ook een tegel voor reizen die binnenkort starten. Kies een zinvolle horizon (bijv. 2 weken). Voeg `getUpcomingTripsCount` toe in `srv/travel-service.js` en toon als extra tegel.
  > *Stijn: "Je kan ook een KPI voorzien van komende reizen binnen de X aantal weken."*

- [ ] **[Naam]** **[V8 → UITBREIDEN]** Airline-statistieken uitbreiden met zowel **aantal boekingen als totaal budget per airline** — beide zijn nuttig voor HR. Pas `getAirlineStats` in `srv/hr-service.js` aan zodat het ook `TotalBudget` retourneert, en toon beide in de HR-grafiek of als extra kolom.
  > *Stijn: "Beide usecases (aantal vluchten & totaal budget) zijn wel nuttig, we laten de keuze aan jullie over."*

- [ ] **[Naam]** **[V5 → ERROR HANDLING]** Gepaste foutmelding tonen als een TripPin-reis verdwijnt of een TripID hergebruikt wordt — Stijn verwacht dat dit niet zal voorvallen, maar vraagt om een nette foutafhandeling. Voeg error handling toe in `srv/travel-service.js` bij de data-mashup wanneer een TripID in TravelExtensions niet meer overeenkomt met een bestaande TripPin-reis.
  > *Stijn: "Opvangen met een gepaste error, moest dit gebeuren. Wij verwachten dat dit niet gebeurt."*

### Ontbrekende FV's — nice-to-have

- [ ] **[Naam]** **FV-02 / FV-06** Airline-grafiek (taart- of staafdiagram) op Travel Dashboard startscherm — `getAirlineStats` bestaat maar wordt het ook als grafiek gerenderd in de Travel Dashboard UI?
- [ ] **[Naam]** **FV-05** Eerstvolgende reizen gesorteerd op vertrekdatum als sectie op Travel Dashboard startscherm — is er een "komende reizen" blok zichtbaar bij het inloggen als TravelAdmin?
- [ ] **[Naam]** **FV-07** E-mailadres tonen in medewerkerslijst Travel Dashboard — het `Emails`-veld uit TripPin People is niet zichtbaar in de LineItem (`app/travel-dashboard/annotations.cds`)
- [ ] **[Naam]** **FV-13** Datumfilter als bereik (van–tot) op reislijst — `SelectionFields` heeft `StartsAt` en `EndsAt` maar controleer of die samen als bereikfilter werken of als twee losse filters
- [ ] **[Naam]** **FV-18** Gebruikstelling (aantal boekingen) tonen in airlinelijst — de lijst toont nu alleen `AirlineCode` en `Name`, niet het aantal boekingen per airline
- [ ] **[Naam]** **FV-20** Stad tonen in luchthavenslijst — controleer of `Location.City` zichtbaar is in de airports annotations; TripPin Airports heeft een genest `Location`-object
- [ ] **[Naam]** **FV-29** People-lijst bereikbaar vanuit HR Dashboard — `HRService.People` is geannoteerd maar is de lijst ook als navigatiepunt opgenomen naast Trips en Airlines?

### Data & functionaliteit

- [ ] **[Naam]** Mock-reisdata toevoegen met datums in **juni 2026** zodat KPI-tegels echte waarden tonen en de statusbadge werkt — update `db/data/primepath-TravelExtensions.csv` met 5–10 rijen met `StartsAt`/`EndsAt` in 2026
- [ ] **[Naam]** Statusbadge 'Op reis'/'Beschikbaar' werkend maken — afhankelijk van bovenstaande mock-data (de logica staat al in `srv/travel-service.js` en `srv/team-service.js`)
- [ ] **[Naam]** HR-grafiek testen: laadt `getAirlineStats` correct? Worden airlines getoond? (`srv/hr-service.js`)
- [ ] **[Naam]** Landingspagina (`app/index.html`) testen in productie-URL

### UX-verbeteringen

- [ ] **[Naam]** Logout-knop toevoegen in de dashboards — het endpoint `POST /auth/logout` bestaat al (`server.js` regel 95), maar er is geen knop in de Fiori-apps. Voeg een custom actie of een link toe in de shell-header van elke webapp
- [ ] **[Naam]** Automatische redirect naar loginpagina bij verlopen sessie (401/403) — voeg een `fetch`-interceptor toe in de webapps die bij een 401-response redirect naar de juiste login-HTML (bijv. `travel-login.html`)
- [ ] **[Naam]** Auditlog tonen in UI: `modifiedAt` en `modifiedBy` zijn al aanwezig via CAP `managed`-mixin (`db/schema.cds` regel 27) — voeg ze toe aan de ObjectPage van TravelExtensions zodat zichtbaar is wie wanneer de status heeft gewijzigd
- [ ] **[Naam]** Foutmelding verbeteren bij ongeldige datumparameters in `getTripCountByPeriod` — voeg validatie toe in `srv/hr-service.js`:
  ```js
  if (isNaN(new Date(from)) || isNaN(new Date(to))) return req.error(400, 'Ongeldige datumparameters');
  ```

### Logging

- [ ] **[Naam]** Logging toevoegen in lege `catch`-blokken in alle services — minstens `cds.log('service').warn(err)` zodat fouten traceerbaar zijn via `cf logs` (`srv/travel-service.js` regels 45, 78, 219, 290–296; `srv/team-service.js` regels 41, 82; `srv/hr-service.js` regels 76–80)

---

## 🎨 Fiori Elements — correct gebruik (officiële SAP-richtlijnen)

> Gebaseerd op de officiële [SAP Fiori Design Guidelines](https://experience.sap.com/fiori-design-web/), [SAP CAP documentatie](https://cap.cloud.sap/docs/guides/uis/fiori) en [SAPUI5 annotatie-documentatie](https://sapui5.hana.ondemand.com/sdk/). Vereist door FA §9.1 (vijf Fiori-principes) en TA §6.1 (Fiori Elements floorplans). Cross-referenced met Stijn/Babet-feedback.

### Thema & visuele identiteit (FA §9.1 · TA §6.1)

- [ ] **[Naam]** `sap_horizon`-thema instellen in **alle 3 apps** — voeg `"theme": "sap_horizon"` toe aan `sap.ui5` → `contentDensities` of als bootstrap-parameter in `manifest.json` van `app/travel-dashboard/webapp/`, `app/team-dashboard/webapp/` en `app/hr-dashboard/webapp/`. Horizon is het huidige standaardthema per SAP Fiori Design Guidelines (Morning Horizon / `sap_horizon`).
- [ ] **[Naam]** Controleer in BAS-preview of het `sap_horizon`-thema daadwerkelijk geladen wordt (afgeronde hoeken, nieuwe kleurpalet) — open de app lokaal via `cds watch` en kijk in het netwerktabblad of `sap_horizon` als thema-parameter meekomt.

### List Report floorplan — verplichte annotaties (officieel CAP/Fiori Elements)

> Volgens de officiële CAP-documentatie zijn `UI.LineItem` en `UI.SelectionFields` de minimumvereisten voor een werkend List Report. `UI.HeaderInfo` is verplicht voor de Object Page.

- [ ] **[Naam]** **Airlines-route ontbreekt in Travel Dashboard** — `app/travel-dashboard/webapp/manifest.json` heeft geen route naar een Airlines-lijstpagina. Voeg toe: `AirlinesList` en `AirlinesObjectPage` met bijbehorende `UI.LineItem`-annotatie in `app/travel-dashboard/annotations.cds`.
- [ ] **[Naam]** **Airports-route ontbreekt in Travel Dashboard** — zelfde probleem: voeg `AirportsList` en `AirportsObjectPage` toe aan `manifest.json` en zorg voor `UI.LineItem`-annotatie.
- [ ] **[Naam]** **People-route ontbreekt in HR Dashboard** — `app/hr-dashboard/webapp/manifest.json` heeft geen `PeopleList`/`PeopleObjectPage`. `HRService.People` is geannoteerd in `app/hr-dashboard/annotations.cds` maar de route ontbreekt. Toevoegen aan `manifest.json`.
- [ ] **[Naam]** **Airlines-route ontbreekt in HR Dashboard** — idem: voeg `AirlinesList`/`AirlinesObjectPage` toe aan HR Dashboard `manifest.json`.
- [ ] **[Naam]** Elke List Report-entiteit moet een `@UI.PresentationVariant` hebben met expliciete `SortOrder` — controleer `app/team-dashboard/annotations.cds` en `app/hr-dashboard/annotations.cds`: hebben People, Trips en Airlines een `PresentationVariant` met sortering? Travel Dashboard heeft dit al voor TravelExtensions, maar de overige ontbreken.

### Object Page floorplan — verplichte annotaties (officieel)

> Volgens de officiële SAP-richtlijnen is `UI.HeaderInfo` de **enige verplichte annotatie** voor een Object Page. `UI.Facets` en `UI.FieldGroup` zijn technisch optioneel maar essentieel voor zinvolle weergave van detaildata.

- [ ] **[Naam]** Controleer of **elke** Object Page een `@UI.HeaderInfo` heeft met `TypeName`, `TypeNamePlural` en een zinvolle `Title`-waarde — loop door `app/travel-dashboard/annotations.cds`, `app/team-dashboard/annotations.cds` en `app/hr-dashboard/annotations.cds` en vul ontbrekende `HeaderInfo`-annotaties aan.
- [ ] **[Naam]** `@UI.Facets` toevoegen op TravelExtensions ObjectPage met aparte secties voor: (1) reisgegevens (`TripName`, `StartsAt`, `TripBudget`, `TripDescription`), (2) goedkeuringsstatus (`ApprovalStatus`, `InternalNote`), (3) auditgegevens (`modifiedAt`, `modifiedBy`) — nu zijn alle velden waarschijnlijk in één vlak blok. Gebruik `#FIELDGROUP_REFERENCE` facetten.
- [ ] **[Naam]** `@UI.Identification` annotatie toevoegen op TravelExtensions — verplicht voor acties op de ObjectPage-toolbar (bijv. een toekomstige "Override"-actie voor TravelAdmin). Voeg toe in `app/travel-dashboard/annotations.cds`.

### Semantische kleuren & Criticality (officieel Fiori-patroon)

> Fiori Elements rendert automatisch semantische kleuren op basis van `Criticality`-waarden: 1 = rood (fout), 2 = oranje (waarschuwing), 3 = groen (succes). Dit is de officiële methode voor statusweergave per SAP Design Guidelines.

- [ ] **[Naam]** `Criticality`-mapping toevoegen op `ApprovalStatus` in de annotations — voeg een virtueel veld `ApprovalStatusCriticality` toe (of gebruik een inline CDS-mapping) en annoteer:
  - `Pending` → `2` (oranje / waarschuwing)
  - `Approved` → `3` (groen / succes)
  - `Rejected` → `1` (rood / fout)
  
  Annoteer vervolgens het `ApprovalStatus`-veld in `UI.LineItem` met `Criticality: ApprovalStatusCriticality` of gebruik een static `$edmJson` expressie. Pas aan in `app/travel-dashboard/annotations.cds` en `app/team-dashboard/annotations.cds`.
- [ ] **[Naam]** `UI.DataFieldForAnnotation` met `DataPointQualifier` gebruiken voor de `ApprovalStatus`-kolom in de lijst — dit geeft een gekleurde badge in plaats van platte tekst. Hogere visuele impact voor de demo.

### i18n labels & internationalisatie (officieel CAP-advies)

> Officieel CAP-advies: gebruik `@title` (mapt naar `@Common.Label`) in CDS-modellen i.p.v. hardcoded strings in annotaties. De CDS Language Server waarschuwt voor niet-geïnternationaliseerde labels.

- [ ] **[Naam]** Alle hardcoded Engelstalige `Label`-waarden in annotaties vervangen door `{i18n>sleutelNaam}` verwijzingen — maak per app een `i18n/i18n.properties` bestand in de webapp-map met Nederlandse vertalingen. Minimaal voor: `TripID` → `Reis-ID`, `ApprovalStatus` → `Goedkeuringsstatus`, `InternalNote` → `Interne opmerking`, `ProjectCode` → `Projectcode`, `StartsAt` → `Vertrekdatum`, `OnTravel` → `Op reis`.
- [ ] **[Naam]** `@Common.Label` toevoegen via `@title`-annotaties in `srv/shared.cds` voor alle gedeelde entiteitsattributen — zo worden labels automatisch overgeërfd in alle 3 services zonder herhaling.

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

- [ ] **[Naam]** **[KRITIEK]** Startscherm toevoegen in Travel Dashboard met KPI-tegels — dit is het niveau-1-scherm zoals FA §9.2 vereist. Opties: (a) gebruik een custom `index.html` met drie `sap.m.GenericTile`-elementen voor FV-01/FV-03/FV-07, of (b) maak een aparte Fiori Elements-app als "overzichtspagina" met KPI-tags via `@UI.KPIAnnotation`. KPI-tags zijn beschikbaar in List Reports voor OData V4 (zie: [KPI Tags in SAP Fiori Elements List Report](https://community.sap.com/t5/technology-blog-posts-by-sap/kpi-tags-in-sap-fiori-elements-list-report-odata-v4-beyond-analytical/ba-p/14298306)).
- [ ] **[Naam]** Startscherm toevoegen in Team Dashboard met overzicht openstaande goedkeuringen (FV-26/getPendingCount-tegel) — TeamLead moet bij inloggen direct zien hoeveel aanvragen wachten.
- [ ] **[Naam]** Startscherm toevoegen in HR Dashboard met airline-stats overzicht (FV-02/FV-06 grafiek) en datumfilter voor reisperiodes.

---

## 🎨 Design / UX (update vereist vóór demo)

> De huidige UI is de standaard SAP Fiori Elements-stijl. Voor een indrukwekkende demo bij EhB en Flexso verdient de presentatielaag aandacht.

- [ ] **[Naam]** Landingspagina (`app/index.html`) visueel verbeteren — voeg logo, kleuraccenten of een hero-sectie toe die aansluit bij PrimePath Travel branding. **Combineer dit met de V0.1-fix** (rolbadges ipv rolselectie)
- [ ] **[Naam]** Fiori-thema aanpassen per dashboard — overweeg `sap_fiori_3` (blauw, professioneel) of `sap_horizon` (moderner) consistent in te stellen via `manifest.json` (`"theme": "sap_horizon"`) in alle 3 apps
- [ ] **[Naam]** Kolomlabels en veldnamen vertalen naar het Nederlands in de annotations (`app/travel-dashboard/annotations.cds`, `app/team-dashboard/annotations.cds`, `app/hr-dashboard/annotations.cds`) — nu staan er nog Engelstalige labels als `TripID`, `ApprovalStatus`, etc.
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

- [ ] **[Naam]** **[TA §6.3]** React demo-dashboard (`app/dashboard/`) koppelen aan de CAP-services (/travel, /team, /hr) i.p.v. rechtstreeks aan TripPin, zodat login, rollen en teamfiltering ook daar gelden. Mockdata enkel als fallback wanneer de backend onbereikbaar is. Pas `app/dashboard/data.jsx` aan.
- [ ] **[Naam]** **[TA §6.4]** Beheerscherm voor gebruikersaccounts bovenop AdminService (/admin): accounts aanmaken, rol toekennen, wachtwoord resetten (server-side bcrypt-hash). Alleen voor TravelAdmin.
- [ ] **[Naam]** **[TA §3.3 + README]** README rechtzetten: tekst vermeldt nog `UserMapping.TeamLeadLoginId`, schema gebruikt `TeamLeadUserName`. README en `db/schema.cds` gelijktrekken.
- [ ] **[Naam]** **[TA Bijlage A]** Repo opschonen: `db.sqlite-shm`, `db.sqlite-wal` en `cds-test.log` uit versiebeheer (`.gitignore` + `git rm --cached`).

### Al in deze TODO, nu gekoppeld aan de TA (afwerken vóór 19 juni)

- [ ] **[TA §7.3]** TravelAdmin override op ApprovalStatus (zie 🔴 Klantfeedback V3)
- [x] **[TA §7.3]** Volledige TripID-eigenaarschap check TeamLead UPDATE (zie 🔒 Security)
- [x] **[TA §8.4]** Harde fout bij ontbrekende/default JWT_SECRET in productie (zie 🔒 Security)
- [x] **[TA §8.4]** Rate limiting op /auth/login, max 10 pogingen / 15 min (zie 🔒 Security)
- [ ] **[TA §7.4 + §10]** Seed-data met juni 2026-datums zodat KPI's en OnTravel-badge echte waarden tonen (zie 🟡 Data)
- [ ] **[TA §4.3]** getUpcomingTripsCount toevoegen als extra KPI (zie 🟡 Klantfeedback V7)
- [ ] **[TA §4.3]** getAirlineStats uitbreiden met TotalBudget per airline (zie 🟡 Klantfeedback V8)
- [ ] **[TA §10]** Nette foutafhandeling bij verdwenen/hergebruikt TripID (zie 🟡 Klantfeedback V5)
- [ ] **[TA §7.3]** Datumvalidatie in getTripCountByPeriod (zie 🟡 UX-verbeteringen)
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