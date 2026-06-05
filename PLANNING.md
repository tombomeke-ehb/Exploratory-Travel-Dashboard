# Planning — Exploratory Travel Dashboard
**Demo: 19 juni 2026 · EhB Cloud Integration × Flexso**
**Team: Ismael · Hassan · Tom**

---

## Overzicht

We hebben 14 dagen tot de demo. Alle taken hieronder komen uit de 🔴 kritieke sectie van de TODO.
De planning is verdeeld in drie fases. Elke fase bouwt voort op de vorige.

---

## Fase 1 — Architectuur (5 t/m 11 juni)

Dit is de meest risicovolle fase. **V0.3 en V6 raken allebei `db/schema.cds`** — Ismael en Hassan moeten hun wijzigingen samenvoegen vóór het einde van deze fase, zodat Tom kan deployen met stabiele code.

### Ismael — V0.3: CDS-architectuur herstructureren
**Bestanden:** `srv/travel-service.cds` · `srv/team-service.cds` · `srv/hr-service.cds` · `db/schema.cds`

Op dit moment staan de entiteiten `People`, `Trips`, `Airlines` en `Airports` drie keer apart gedefinieerd — één keer per service. Dit is exact de feedback van Stijn. De oplossing is om deze gedeelde entiteiten één keer te definiëren en ze daarna te hergebruiken via `using` in elk van de drie services. Alleen wat echt per rol verschilt (zoals de ApprovalStatus-rechten van TravelAdmin of de teamfiltering van TeamLead) blijft in de rol-specifieke service staan.

**Schatting: 3 à 4 dagen**

---

### Hassan — V6: UserMapping vereenvoudigen
**Bestanden:** `db/schema.cds` · `srv/team-service.js`

De huidige UserMapping werkt met BTP login-IDs (e-mailadressen), wat de koppeling afhankelijk maakt van BTP-configuratie. Stijn raadt aan om puur met TripPin-data te werken: een lokale mapping die de TripPin `UserName` van een medewerker koppelt aan de TripPin `UserName` van zijn of haar TeamLead. Dit maakt de logica eenvoudiger en stabieler voor de demo.

⚠️ **Let op:** deze taak raakt ook `db/schema.cds`. Stemmen af met Ismael welke branch als basis dient om merge-conflicten te vermijden.

**Schatting: 2 à 3 dagen**

---

### Tom — BTP-omgeving voorbereiden

Controleer of de MTA-configuratie en CF-spaces klaarstaan voor de deploy van volgende week. Geen code, maar wel het fundament voor een vlotte deploy in Fase 3.

---

## Fase 2 — Features en security (11 t/m 13 juni)

Na het samenvoegen van Fase 1 werkt iedereen aan de overige kritieke taken.

### Ismael — FV-01 + FV-03: KPI-tegels zichtbaar maken
**Bestand:** `app/travel-dashboard/annotations.cds`

De functies `getActiveTripsCount` (totaal actieve reizen) en `getOnTravelCount` (medewerkers momenteel op reis) bestaan al in `srv/travel-service.js`. Wat nog ontbreekt is de visuele weergave als tegel op het startscherm van het Travel Dashboard. Controleren of de annotations kloppen en aanpassen waar nodig. Voor FV-03 geldt de definitie van Stijn: alleen medewerkers waarvoor geldt dat `StartsAt ≤ vandaag ≤ EndsAt`.

**Schatting: 1 à 2 dagen**

---

### Hassan — V3: TravelAdmin override op ApprovalStatus
**Bestand:** `srv/travel-service.js`

Als een TeamLead een reis heeft afgekeurd, moet de TravelAdmin dit alsnog kunnen overschrijven. Dit is niet om de beslissing van de TeamLead te betwisten, maar om opvolging te garanderen wanneer de lead niet beschikbaar is. In de praktijk betekent dit: extra UPDATE-rechten op `TravelExtensions.ApprovalStatus` voor de TravelAdmin-rol, ook als er al een beslissing is genomen.

**Schatting: 1 dag**

---

### Hassan — Security: drie losse taken
**Bestanden:** `server.js` · `srv/auth-strategy.js` · `srv/team-service.js`

1. **JWT_SECRET check bij opstarten** — Als `JWT_SECRET` ontbreekt of nog de standaardwaarde heeft in productie, moet de server direct crashen met een duidelijke foutmelding. Zo vermijd je dat de app stilletjes draait met een onveilige sleutel.

2. **Rate limiting op `/auth/login`** — Installeer `express-rate-limit` en beperk het inloggen tot maximaal 10 pogingen per 15 minuten per IP. Dit voorkomt brute-force aanvallen op de loginpagina.

3. **TripID eigenaarschapscheck** — De huidige check in `srv/team-service.js` (regels 122–138) verifieert alleen of de TeamLead überhaupt teamleden heeft, maar niet of het specifieke TripID daadwerkelijk toebehoort aan een teamlid van die TeamLead. Dit moet aangescherpt worden.

**Schatting: 1 dag**

---

### Tom — V0.1: Landingspagina herzien
**Bestand:** `app/index.html`

De huidige drie rolkaarten waarbij de gebruiker zelf zijn rol kiest zijn verwarrend voor de demo. De oplossing van Stijn: alle kaarten tonen, maar elk met een duidelijk label of badge die aangeeft welke rol er toegang toe heeft (bijv. *"Alleen voor Travel Coördinator"*). Zo hoeft er geen XSUAA-selectie nagebootst te worden tijdens de presentatie.

**Schatting: 1 dag**

---

## Fase 3 — UI, testen en deploy (13 t/m 19 juni)

### Ismael — FV-22 + FV-26: Team Dashboard UI
**Bestand:** `app/team-dashboard/annotations.cds`

- **FV-22:** In de teamledenlijst de datum en naam van de eerstvolgende reis per teamlid tonen, naast de bestaande statusbadge.
- **FV-26:** Een filterknop of preset "In behandeling" zichtbaar maken in het Team Dashboard. Stijn heeft bevestigd dat een visuele filter volstaat — geen e-mailnotificaties nodig.

**Schatting: 1 à 2 dagen**

---

### Hassan — Review en bugfixes

Alle wijzigingen van Fase 1 en 2 nalopen, testen en eventuele bugs oplossen voordat Tom deployt.

---

### Tom — Deploy op BTP + logs controleren

```bash
mbt build
cf deploy mta_archives/exploratory-travel-dashboard_1.0.0.mtar -f
cf logs exploratory-travel-dashboard-srv --recent
```

Na de deploy: controleer of alle services correct opstarten en of er fouten in de logs staan.

---

## Buffer en demo-voorbereiding (16 t/m 19 juni)

| Dag | Ismael | Hassan | Tom |
|-----|--------|--------|-----|
| 16–17 jun | Flow testen als TravelAdmin | Flow testen als TeamLead | Flow testen als HR |
| 17–18 jun | Bugfixes uit tests | Bugfixes uit tests | Demo-script schrijven |
| 19 jun | 🎯 Demo | 🎯 Demo | 🎯 Demo |

Het demo-script (max. 5 minuten per rol) valt bij Tom, omdat hij het beste overzicht heeft over de volledige omgeving na de deploy.

---

## Kritiek aandachtspunt

**Ismael en Hassan moeten hun wijzigingen aan `db/schema.cds` samenvoegen vóór 11 juni.**
Als dit niet op tijd gebeurt, kan Tom niet deployen en komen we in tijdnood voor de tests.

---

*Opgesteld op 5 juni 2026 · Contactpersoon: Tom*
