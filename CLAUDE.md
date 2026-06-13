# CLAUDE.md

Richtlijnen voor Claude Code (en het team) bij het werken in deze repository.
Lees dit bestand vóór je begint. Houd het kort en actueel.

---

## 1. Wat is dit project?

**Exploratory Travel Dashboard – PrimePath Travel.**
Een centraal exploratief webdashboard voor PrimePath Travel, gebouwd op **SAP BTP** met
**CAP (Node.js)** als backend en **SAP Fiori Elements** als frontend.
Schoolproject EhB Cloud Integration in samenwerking met Flexso. **Demo: 19 juni 2026.**

Drie aparte Fiori-apps op één gedeelde CAP-backend:

| App | Doelgroep | Rol (`@requires`) | Service path |
|-----|-----------|-------------------|--------------|
| Travel Dashboard | Travel Coördinator | `TravelAdmin` | `/travel` |
| Team Dashboard | Team Lead | `TeamLead` | `/team` |
| HR Dashboard | HR / Administratie | `TravelViewer` | `/hr` |

Authenticatie loopt via een **eigen login-systeem** (lokale `Users`-tabel + bcrypt + JWT in een
httpOnly-cookie). **SAP XSUAA is bewust niet gebruikt.** Reisdata komt uit de externe
**TripPin OData V4**-service; PrimePath-specifieke velden (ProjectCode, ApprovalStatus,
InternalNote) leven lokaal in `TravelExtensions` en worden via `TripID` aan TripPin-reizen gekoppeld.

---

## 2. Repostructuur (oriëntatie)

```
app/                     Fiori Elements-apps (annotations) + login-/landingspagina's
  travel-dashboard/      Travel Coördinator
  team-dashboard/        Team Lead
  hr-dashboard/          HR / Administratie
  dashboard/             React demo-dashboard
  index.html             Landingspagina (rolbadges)
db/
  schema.cds             TravelExtensions, UserMapping, Users
  data/*.csv             Seed-data (demo-accounts, mappings, extensies)
srv/
  shared.cds             Gedeelde TripPin-projecties (People/Trips/Airlines/Airports)
  travel-service.cds/.js Travel Coördinator-service + KPI-functies
  team-service.cds/.js   Team Lead-service + teamcheck-autorisatie
  hr-service.cds/.js     HR-service (read-only) + statistieken
  auth-strategy.js       Custom CDS-auth: JWT-cookie -> cds.context.user
  external/TripPin.cds   Externe TripPin-servicedefinitie
server.js                Bootstrap: /auth/login, /auth/logout, statische pagina's
.cdsrc.json              Auth-profielen (dev/prod)
mta.yaml                 BTP/MTA-deployment (geen XSUAA)
TODO.md                  Takenlijst (leidend voor het werk)
PLANNING.md              Fasering en taakverdeling
```

---

## 3. Commando's

```bash
# Lokaal ontwikkelen (auto-reload, sqlite in-memory/lokaal)
npm run watch          # of: cds watch

# Starten zonder watch
npm start              # cds-serve

# Model valideren / compileren (doe dit na elke .cds-wijziging)
npx cds compile srv > /dev/null   # faalt = modelfout (CSN-compile)
# Let op: 'cds compile --to sql' / '--to edmx' faalt hier bewust door de remote
# TripPin-associaties (unmanaged, geen ON-conditie). Gebruik dus de CSN-compile hierboven.

# JS-syntax snel checken
node --check server.js

# Boot-smoketest (vangt JS-laadfouten in de service-handlers)
npx cds-serve   # verwacht: 'server listening on ...' zonder errors; daarna stoppen

# BTP-deploy (na alle fixes)
mbt build
cf deploy mta_archives/exploratory-travel-dashboard_1.0.0.mtar -f
cf logs exploratory-travel-dashboard-srv --recent
```

Er is (nog) geen geautomatiseerde testsuite. Valideer wijzigingen daarom met
`cds compile` (model) + `node --check` (JS) en, waar mogelijk, handmatig via `cds watch`.

---

## 4. Werkwijze — zo itereren we (BELANGRIJK)

We werken issue-gedreven met kleine, traceerbare stappen. **Eén TODO = één issue = één branch = één PR.**
Volg per TODO-item exact deze stappen:

1. **Kies één TODO-item** uit `TODO.md` (begin bij 🔴 Kritiek).
2. **Maak een GitHub-issue** voor dat item:
   ```bash
   gh issue create --title "<type>: <korte omschrijving>" --label "<label>" --body "..."
   ```
   Gebruik een passend label (`bug`, `enhancement`, `documentation`, …). Noteer het issuenummer.
3. **Maak een branch per TODO** vanaf een actuele `main`:
   ```bash
   git checkout main && git pull
   git checkout -b <type>/<korte-slug>
   ```
4. **Implementeer met kleine, logische commits** — niet één grote eindcommit.
   Splits gerust per deelstap (bijv. eerst de code, dan de seed-data, dan de docs).
   Gebruik [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat(travel): getUpcomingTripsCount toevoegen
   fix(team): TripID-eigenaarschap controleren bij UPDATE
   docs(readme): UserMapping-veldnaam rechtzetten
   chore(repo): sqlite-WAL-bestanden uit versiebeheer halen
   ```
   Eindig commit messages met:
   ```
   Co-Authored-By: Claude <noreply@anthropic.com>
   ```
5. **Vink het TODO-item af** in `TODO.md` (`[ ]` → `[x]`), vervang `[Naam]` door wie het oppakte,
   en commit dat als losse `docs(todo): ...`-commit binnen dezelfde branch.
6. **Push en open een PR** die de issue linkt zodat die automatisch sluit bij merge op `main`:
   ```bash
   git push -u origin <branch>
   gh pr create --title "<zelfde type>: <omschrijving>" \
     --body "Closes #<issuenummer>

   <wat & waarom, kort>"
   ```
   > `Closes #N` (of `Fixes #N`) in de PR-body zorgt dat GitHub de issue **automatisch sluit**
   > zodra de PR op `main` gemerged is.
7. **Valideer** (`cds compile`, `node --check`, evt. `cds watch`) — pas mergen als het groen is.
8. **Merge de PR** (merge-commit, zodat de kleine commits zichtbaar blijven):
   ```bash
   gh pr merge <PR#> --merge
   ```
9. **Ruim op en ga door:**
   ```bash
   git checkout main && git pull
   git branch -d <branch>        # lokaal opruimen na merge
   ```
   Daarna terug naar stap 1 voor het volgende TODO-item.

### Branch-naamgeving
`feat/…` (nieuwe functionaliteit) · `fix/…` (bugfix) · `docs/…` (documentatie) ·
`chore/…` (onderhoud/tooling) · `refactor/…` (herstructurering zonder gedragswijziging).

---

## 5. Conventies & afspraken

- **Taal:** UI-teksten, labels, commit messages, issues en docs in het **Nederlands**.
  Code-identifiers en CAP/Fiori-conventies blijven Engels.
- **Eén bron van waarheid:** gedeelde TripPin-entiteiten staan één keer in `srv/shared.cds`
  en worden via `using` hergebruikt. Definieer People/Trips/Airlines/Airports **niet** opnieuw per service.
- **Autorisatie zit in de service-laag** (`srv/*.js`), niet in de UI. De Team Lead-teamcheck
  (`srv/team-service.js`) is veiligheidskritisch — wijzig die alleen bewust.
- **Mapping is puur TripPin-gebaseerd:** `UserMapping.TripPinUserName` → `UserMapping.TeamLeadUserName`,
  en `Users.tripPinUserName` koppelt een login-account aan zijn TripPin-identiteit. Geen BTP-login-IDs meer.
- **Geheimen nooit committen.** `JWT_SECRET` hoort in een omgevingsvariabele; in productie mag de
  default-waarde niet gebruikt worden (de app hoort hard te falen als dat toch gebeurt).
- `TODO.md` is leidend; `PLANNING.md` beschrijft de fasering. Houd `TODO.md` actueel bij elke merge.

---

## 6. Goed om te weten (valkuilen)

- **TripPin-data is van 2014.** KPI's zoals "actieve reizen vandaag" geven daardoor live 0 terug;
  daarom zitten er bewuste **demo-fallbackwaarden** in `srv/travel-service.js`
  (`getActiveTripsCount`, `getOnTravelCount`). Houd hier rekening mee bij het testen.
- **Diepe TripPin-navigatie** (People → Trips → PlanItems) kan niet via één CDS-`SELECT`;
  gebruik `TripPin.send({ method, path })` met een ruwe OData-path (zie bestaande handlers).
- **SQLite WAL-bestanden** (`db.sqlite-shm`, `db.sqlite-wal`) en `cds-test.log` horen **niet** in
  versiebeheer (zie `.gitignore`).
- **Dev vs prod auth:** lokaal kan dummy-auth gelden; autorisatiechecks slaan `anonymous` over.
  Test rol-specifiek gedrag bewust met een ingelogde gebruiker.

---

## 7. Definition of Done (per TODO)

- [ ] Issue aangemaakt en gelinkt via `Closes #N` in de PR
- [ ] Eigen branch met kleine, beschrijvende commits
- [ ] Model compileert (`cds compile`) en JS is syntactisch geldig (`node --check`)
- [ ] TODO-item afgevinkt in `TODO.md`
- [ ] PR gemerged op `main`; issue automatisch gesloten
