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

## 4. Branch-model & werkwijze (BELANGRIJK)

We werken issue-gedreven met kleine, traceerbare stappen, en met een vaste branch-structuur:

```
feature/* ──PR──▶ dev ──release-PR──▶ main
  (werk)       (integratie)        (stabiel / gedeployed)
```

- **`main`** — altijd stabiel en deploybaar. Hier komt code **alleen via een release-PR vanuit `dev`**.
- **`dev`** — integratiebranch. Alle feature-PR's mergen hier eerst, zodat `dev` de "volgende release" is.
- **`feature/*`** — één branch per TODO-item, vertakt vanaf `dev`.

> **Let op — auto-close van issues:** GitHub sluit een issue via `Closes #N` pas wanneer dat op de
> **default branch (`main`)** landt. Feature-PR's gaan naar `dev`, dus de issues sluiten pas bij de
> **release-PR `dev → main`**. Gebruik in feature-PR's gerust `Closes #N`, en **herhaal die regels in
> de release-PR** zodat de issues effectief sluiten bij de merge naar `main`.

**Eén TODO = één issue = één branch = één PR.** Volg per TODO-item exact deze stappen:

1. **Kies één TODO-item** uit `TODO.md` (begin bij 🔴 Kritiek).
2. **Maak een GitHub-issue:**
   ```bash
   gh issue create --title "<type>: <korte omschrijving>" --label "<label>" --body "..."
   ```
   Gebruik een passend label (`bug`, `enhancement`, `documentation`, `security`, `chore`, `tech-debt`).
3. **Maak een branch per TODO vanaf een actuele `dev`:**
   ```bash
   git checkout dev && git pull
   git checkout -b <type>/<korte-slug>
   ```
4. **Implementeer met kleine, logische commits** — niet één grote eindcommit.
   Splits per deelstap (bijv. eerst de code, dan de seed-data, dan de docs). Gebruik
   [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat(travel): getUpcomingTripsCount toevoegen
   fix(team): TripID-eigenaarschap controleren bij UPDATE
   docs(readme): UserMapping-veldnaam rechtzetten
   ```
   > De Claude-auteursattributie staat uit via `.claude/settings.json` (`attribution`), dus voeg
   > **geen** `Co-Authored-By`-trailer toe aan commits of PR's.
5. **Vink het TODO-item af** in `TODO.md` (`[ ]` → `[x]`, en `[Naam]` → wie het oppakte) als losse
   `docs(todo): …`-commit binnen dezelfde branch.
6. **Push en open een PR naar `dev`:**
   ```bash
   git push -u origin <branch>
   gh pr create --base dev --title "<type>: <omschrijving>" --body "Closes #<nr>

   <wat & waarom, kort + validatie>"
   ```
7. **Valideer** (`cds compile`, `node --check`, boot-smoketest) — pas mergen als het groen is.
8. **Merge de PR in `dev`** (merge-commit, zodat de kleine commits zichtbaar blijven) en ruim de branch op:
   ```bash
   gh pr merge <PR#> --merge --delete-branch
   ```
9. **Ga door:**
   ```bash
   git checkout dev && git pull
   ```
   Terug naar stap 1 voor het volgende TODO-item.

### Release: `dev → main`
Wanneer een set features af en getest is, geef je `dev` vrij naar `main`:
```bash
gh pr create --base main --head dev --title "release: <korte omschrijving>" \
  --body "Closes #<nr1>
Closes #<nr2>
..."
gh pr merge <PR#> --merge
```
De merge naar `main` sluit alle vermelde issues automatisch. **Deploy gebeurt vanaf `main`.**

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
- **Verouderde lokale `db.sqlite`.** `cds-serve` gebruikt het persistente `db.sqlite`-bestand. Na een
  schemawijziging (bijv. een nieuwe kolom) is dat bestand verouderd → fouten als
  `no such column: …` (login geeft dan 500). Oplossing: `npx cds deploy` (regenereert `db.sqlite`
  met seed-data) of gebruik `cds watch` (in-memory, herdeployt elke start). `db.sqlite` is gitignored.

---

## 7. Definition of Done (per TODO)

- [ ] Issue aangemaakt en gelinkt via `Closes #N` in de PR
- [ ] Eigen feature-branch (vanaf `dev`) met kleine, beschrijvende commits
- [ ] Model compileert (`cds compile`), JS geldig (`node --check`) en boot-smoketest groen
- [ ] TODO-item afgevinkt in `TODO.md`
- [ ] PR gemerged in `dev`; issue sluit automatisch bij de release-PR `dev → main`
