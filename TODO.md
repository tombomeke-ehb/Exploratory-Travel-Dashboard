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
- [x] UserMapping JWT-mismatch gefixt (TeamLeadLoginId = username)
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

### Testen & deployen
- [ ] **[Naam]** Volledige deploy uitvoeren op BTP na alle fixes: `mbt build && cf deploy mta_archives/exploratory-travel-dashboard_1.0.0.mtar -f`
- [ ] **[Naam]** Na deploy: controleer cf logs op fouten — `cf logs exploratory-travel-dashboard-srv --recent`
- [ ] **[Naam]** People ObjectPage testen: open Travel Dashboard → klik op medewerker → controleer of reizen zichtbaar zijn (`app/travel-dashboard/annotations.cds`)
- [ ] **[Naam]** TeamLead-flow testen: log in als `teamlead`, pas ApprovalStatus aan van eigen teamlid, controleer dat reizen van anderen geblokkeerd zijn (`srv/team-service.js`)
- [ ] **[Naam]** Demo-script schrijven: welke flow per rol? (TravelAdmin → TeamLead → HR) — max 5 min per rol

### Ontbrekende FV's — kritiek
- [ ] **[Naam]** **FV-01** KPI-tegel "totaal actieve reizen" zichtbaar op Travel Dashboard startscherm — `getActiveTripsCount` bestaat in `srv/travel-service.js` maar controleer of het ook visueel als tegel getoond wordt in `app/travel-dashboard/webapp/`
- [ ] **[Naam]** **FV-03** KPI-tegel "medewerkers op reis" zichtbaar op Travel Dashboard startscherm — `getOnTravelCount` bestaat maar controleer of het als tegel geïntegreerd is
- [ ] **[Naam]** **FV-22** Eerstvolgende reis per teamlid tonen in teamledenlijst — Team Dashboard toont de statusbadge maar toont het ook de datum en naam van de eerstvolgende reis per teamlid? (`app/team-dashboard/annotations.cds` LineItem)
- [ ] **[Naam]** **FV-26** Filter "In behandeling" als aparte filteroptie in Team Dashboard — is er een duidelijke filterknop of preset specifiek voor `ApprovalStatus = 'Pending'`? (`app/team-dashboard/annotations.cds` SelectionFields)

### Security (kritiek voor productie/demo)
- [ ] **[Naam]** Harde fout bij opstarten als `JWT_SECRET` ontbreekt of nog de defaultwaarde heeft in productie — voeg toe aan `server.js` en `srv/auth-strategy.js`:
  ```js
  if (process.env.NODE_ENV === 'production' &&
      (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'primepath-dev-secret-CHANGE-IN-PRODUCTION')) {
    throw new Error('JWT_SECRET is niet ingesteld of is nog de standaardwaarde!');
  }
  ```
- [ ] **[Naam]** Volledige TripID-eigenaarschap check in TeamLead UPDATE: controleer of het TripID daadwerkelijk toebehoort aan een teamlid van de ingelogde TeamLead (`srv/team-service.js` regels 122–138) — de huidige check verifieert alleen of de TeamLead überhaupt teamleden heeft, niet of dit specifieke trip van hen is
- [ ] **[Naam]** Rate limiting toevoegen op `/auth/login` — installeer `express-rate-limit`, max 10 pogingen per 15 minuten per IP (`server.js` vóór regel 53):
  ```bash
  npm install express-rate-limit
  ```

---

## 🟡 Gewenst voor demo (nice-to-have)

### Ontbrekende FV's — nice-to-have
- [ ] **[Naam]** **FV-02 / FV-06** Airline-grafiek (taart- of staafdiagram) op Travel Dashboard startscherm — `getAirlineStats` bestaat maar wordt het ook als grafiek gerenderd in de Travel Dashboard UI? (FV-27 voor HR is apart)
- [ ] **[Naam]** **FV-05** Eerstvolgende reizen gesorteerd op vertrekdatum als sectie op Travel Dashboard startscherm — is er een "komende reizen" blok zichtbaar bij het inloggen als TravelAdmin?
- [ ] **[Naam]** **FV-07** E-mailadres tonen in medewerkerslijst Travel Dashboard — de statusbadge staat er maar het `Emails`-veld uit TripPin People is niet zichtbaar in de LineItem (`app/travel-dashboard/annotations.cds`)
- [ ] **[Naam]** **FV-13** Datumfilter als bereik (van–tot) op reislijst — `SelectionFields` heeft `StartsAt` en `EndsAt` maar controleer of die samen als bereikfilter werken of als twee losse filters
- [ ] **[Naam]** **FV-18** Gebruikstelling (aantal boekingen) tonen in airlinelijst — de lijst toont nu alleen `AirlineCode` en `Name`, niet het aantal boekingen per airline; vereist een computed veld of extra annotatie via `getAirlineStats`
- [ ] **[Naam]** **FV-20** Stad tonen in luchthavenslijst — controleer of `Location.City` zichtbaar is in de airports annotations (`app/travel-dashboard/annotations.cds`); TripPin Airports heeft een genest `Location`-object
- [ ] **[Naam]** **FV-29** People-lijst bereikbaar vanuit HR Dashboard — `HRService.People` is geannoteerd maar is de lijst ook als navigatiepunt opgenomen in het HR Dashboard naast Trips en Airlines?

### Data & functionaliteit
- [ ] **[Naam]** Mock-reisdata toevoegen met datums in **juni 2026** zodat KPI-tegels echte waarden tonen en de statusbadge werkt — update `db/data/primepath-TravelExtensions.csv` met 5–10 rijen met `StartsAt`/`EndsAt` in 2026
- [ ] **[Naam]** Statusbadge 'Op reis'/'Beschikbaar' werkend maken — afhankelijk van bovenstaande mock-data (de logica staat al in `srv/travel-service.js` en `srv/team-service.js`)
- [ ] **[Naam]** HR-grafiek testen: laadt `getAirlineStats` correct? Worden airlines getoond? (`srv/hr-service.js`)
- [ ] **[Naam]** Landingspagina (`app/index.html`) testen in productie-URL

### UX-verbeteringen
- [ ] **[Naam]** Logout-knop toevoegen in de dashboards — het endpoint `POST /auth/logout` bestaat al (`server.js` regel 95), maar er is geen knop in de Fiori-apps. Voeg een custom actie of een link toe in de shell-header van elke webapp
- [ ] **[Naam]** Automatische redirect naar loginpagina bij verlopen sessie (401/403) — voeg een `fetch`-interceptor toe in de webapps die bij een 401-response redirect naar de juiste login-HTML (bijv. `travel-login.html`)
- [ ] **[Naam]** Auditlog tonen in UI: `modifiedAt` en `modifiedBy` zijn al aanwezig via CAP `managed`-mixin (`db/schema.cds` regel 27) — voeg ze toe aan de ObjectPage van TravelExtensions zodat zichtbaar is wie wanneer de status heeft gewijzigd
- [ ] **[Naam]** Foutmelding verbeteren bij ongeldige datumparameters in `getTripCountByPeriod` — voeg validatie toe in `srv/hr-service.js` regels 101–116:
  ```js
  if (isNaN(new Date(from)) || isNaN(new Date(to))) return req.error(400, 'Ongeldige datumparameters');
  ```

### Logging
- [ ] **[Naam]** Logging toevoegen in lege `catch`-blokken in alle services — minstens `cds.log('service').warn(err)` zodat fouten traceerbaar zijn via `cf logs` (`srv/travel-service.js` regels 45, 78, 219, 290–296; `srv/team-service.js` regels 41, 82; `srv/hr-service.js` regels 76–80)

---

## 🎨 Design / UX (update vereist vóór demo)

> De huidige UI is de standaard SAP Fiori Elements-stijl. Voor een indrukwekkende demo bij EhB en Flexso verdient de presentatielaag aandacht.

- [ ] **[Naam]** Landingspagina (`app/index.html`) visueel verbeteren — de huidige kaarten zijn functioneel maar minimaal. Voeg logo, kleuraccenten of een hero-sectie toe die aansluit bij PrimePath Travel branding
- [ ] **[Naam]** Fiori-thema aanpassen per dashboard — overweeg `sap_fiori_3` (blauw, professioneel) of `sap_horizon` (moderner) consistent in te stellen via `manifest.json` (`"theme": "sap_horizon"`) in alle 3 apps
- [ ] **[Naam]** Kolomlabels en veldnamen vertalen naar het Nederlands in de annotations (`app/travel-dashboard/annotations.cds`, `app/team-dashboard/annotations.cds`, `app/hr-dashboard/annotations.cds`) — nu staan er nog Engelstalige labels als `TripID`, `ApprovalStatus`, etc.
- [ ] **[Naam]** KPI-tegels visueel opwaarderen in Travel Dashboard — gebruik `@UI.HeaderInfo` met subtitle die het totaal dynamisch toont, en zorg dat de tegel ook een icoontje heeft (bijv. `sap-icon://travel-expense`)
- [ ] **[Naam]** Lege-state melding toevoegen als er geen reizen zijn — Fiori Elements toont standaard een leeg scherm; voeg `@UI.MessagePage` toe of pas de `noDataText` aan in `manifest.json`
- [ ] **[Naam]** Loginpagina's (`app/travel-login.html`, `app/team-login.html`, `app/hr-login.html`) uniform stylen — controleer of alle drie er hetzelfde uitzien en of het PrimePath Travel-logo/naam consistent staat
- [ ] **[Naam]** Mobiele weergave controleren — Fiori Elements is responsive, maar check in BAS preview of de lijst- en detailpagina's correct schalen op een smaller scherm (niet verplicht, maar indrukwekkend tijdens demo)

---

## 🔵 Buiten scope voor demo (bewust niet gedaan)

- Globale cross-entiteit zoekbalk (FV-04) — Fiori Elements ondersteunt dit niet standaard
- Filter op bestemming (FV-12) — TripPin Trips heeft geen Destination-veld op rootniveau
- Doorklikken reisdetail → airline (FV-16) — vereist extra associaties in CDS
- Doorklikken airline → reizen (FV-19) — vereist extra associaties in CDS
- Doorklikken medewerker → specifieke reis (FV-10) — vereist People → TravelExtensions koppeling
- Visuele Gantt-tijdlijn (FV-23 visueel) — Fiori Elements heeft geen ingebouwde tijdlijnweergave
- CSV-exportfunctie HR-dashboard — de landingspagina vermeldt "exporteerbare rapportagedata" maar dit is niet geïmplementeerd
- Redis/HANA-gebaseerde cache voor airline-stats — in-memory cache werkt niet bij meerdere CF-instanties

---

*Laatste update: 3 juni 2026 | Contactpersoon: Tom*
