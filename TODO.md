# TODO — Exploratory Travel Dashboard
**Demo: 19 juni 2026 | EhB Cloud Integration × Flexso**

> Vink af met [x] als een taak klaar is. Vermeld je naam tussen haakjes bij elke taak die je oppakt.

---

## Klaar (niet aanraken)

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

## Kritiek voor demo (moet af vóór 19 juni)

- [ ] **[Naam]** Testen of de People ObjectPage daadwerkelijk Trips toont na de navigatiefix — open Travel Dashboard → klik op een medewerker → controleer of reizen zichtbaar zijn (`app/travel-dashboard/annotations.cds`)
- [ ] **[Naam]** Testen of TeamLead-login correct werkt: log in als `teamlead`, pas ApprovalStatus aan van een eigen teamlid, controleer dat andere teamleden geblokkeerd zijn (`srv/team-service.js`)
- [ ] **[Naam]** Volledige deploy uitvoeren op BTP na alle fixes: `mbt build && cf deploy mta_archives/exploratory-travel-dashboard_1.0.0.mtar -f`
- [ ] **[Naam]** Na deploy: controleer cf logs op fouten — `cf logs exploratory-travel-dashboard-srv --recent`
- [ ] **[Naam]** Demo-script schrijven: welke flow laat je zien per rol? (TravelAdmin → TeamLead → HR) — maximaal 5 minuten per rol

---

## Gewenst voor demo (nice-to-have)

- [ ] **[Naam]** Statusbadge 'Op reis'/'Beschikbaar' zichtbaar maken — vereist dat `OnTravel` berekend wordt op basis van echte of mock-reisdatums in 2026 in de TravelExtensions CSV (`db/data/primepath-TravelExtensions.csv`)
- [ ] **[Naam]** Mock-reisdata toevoegen met datums in 2026 zodat KPI-tegels echte waarden tonen in plaats van fallbackwaarden — update `db/data/primepath-TravelExtensions.csv`
- [ ] **[Naam]** Filter 'In behandeling' testen in Team Dashboard (FV-26) — controleer of de knop zichtbaar is en correct filtert
- [ ] **[Naam]** HR-grafiek testen: opent `getAirlineStats` correct? Worden de airlines getoond? (`srv/hr-service.js`)
- [ ] **[Naam]** Landingspagina (`app/index.html`) testen in productie-URL

---

## Buiten scope voor demo (bewust niet gedaan)

- [ ] Globale cross-entiteit zoekbalk (FV-04) — Fiori Elements ondersteunt dit niet standaard
- [ ] Filter op bestemming (FV-12) — TripPin Trips heeft geen Destination-veld op rootniveau
- [ ] Doorklikken reisdetail → airline (FV-16) — vereist extra associaties
- [ ] Doorklikken airline → reizen (FV-19) — vereist extra associaties
- [ ] Doorklikken medewerker → specifieke reis (FV-10) — vereist People → TravelExtensions koppeling
- [ ] Visuele Gantt-tijdlijn (FV-23 visueel) — Fiori Elements heeft geen ingebouwde tijdlijnweergave

---

## Technische schuld (na demo)

- [ ] TripPin-data vervangen door echte productiedata of een mock-server met 2026-datums
- [ ] `gen/`-map volledig uitsluiten van git (`.gitignore` updaten)
- [ ] JWT_SECRET rouleren na de demo
- [ ] HANA trial verlengen vóór 19 juni (trial verloopt elke 30 dagen)

---

*Laatste update: 3 juni 2026 | Contactpersoon: Tom*
