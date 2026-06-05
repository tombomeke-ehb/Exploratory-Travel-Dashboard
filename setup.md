# Setup Gids – Exploratory Travel Dashboard

---

## Lokaal ontwikkelen (iedereen)

### Vereisten

- Node.js 18+ — [nodejs.org](https://nodejs.org)
- Git

### Stap 1 — Repository klonen

```bash
git clone https://github.com/tombomeke-ehb/Exploratory-Travel-Dashboard.git
cd Exploratory-Travel-Dashboard
npm install --legacy-peer-deps
```

### Stap 2 — Lokaal starten

```bash
npm install -g @sap/cds-dk
```

```bash
npx cds watch
```

> Gebruik `npx cds watch` in plaats van `cds watch` als je `@sap/cds-dk` niet globaal geïnstalleerd hebt.

De app draait nu op **http://localhost:4004**. Je ziet daar de OData-endpoints en kun je de services testen.

De drie dashboards open je via:
- http://localhost:4004/travel-dashboard/index.html
- http://localhost:4004/team-dashboard/index.html
- http://localhost:4004/hr-dashboard/index.html

Log in met de demo-accounts:

| Gebruikersnaam | Wachtwoord | Rol |
|----------------|------------|-----|
| `traveladmin` | `Admin1234!` | Travel Coördinator |
| `teamlead` | `Lead1234!` | Team Lead |
| `hrviewer` | `HR1234!` | HR / Admin |

### Stap 3 — Wijzigingen pushen

```bash
git add .
git commit -m "feat: korte beschrijving van de wijziging"
git push
```

Kleine commits, na elke wijziging pushen. Gebruik `fix:`, `feat:` of `chore:` als prefix.

---

## Deployen naar BTP (alleen Tom)

### Vereisten

- CF CLI — [docs.cloudfoundry.org/cf-cli](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html)
- MTA Build Tool: `npm install -g mbt`

### Inloggen op Cloud Foundry

```bash
cf login -a https://api.cf.us10-001.hana.ondemand.com
```

Kies org `a182fdf5trial`, space `dev`.

### Bouwen en deployen

```bash
git pull
npm install --legacy-peer-deps
npx cds build --production
mbt build
cf deploy mta_archives/exploratory-travel-dashboard_1.0.0.mtar -f
```

Controleer na de deploy:

```bash
cf apps
cf logs exploratory-travel-dashboard-srv --recent
```

`exploratory-travel-dashboard-srv` moet **Started** zijn. `db-deployer` zal **Stopped** zijn — normaal.

### Productie-URL

```
https://a182fdf5trial-dev-exploratory-travel-dashboard-srv.cfapps.us10-001.hana.ondemand.com/
```

### JWT Secret (eenmalig, al ingesteld)

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
cf set-env exploratory-travel-dashboard-srv JWT_SECRET <gegenereerd-geheim>
cf restage exploratory-travel-dashboard-srv
```

Hoeft niet opnieuw bij volgende deploys — blijft bewaard in CF-omgevingsvariabelen.

---

## Problemen oplossen

**`cds` not recognized** — gebruik `npx cds watch` in plaats van `cds watch`.

**`Cannot GET /`** — `mta.yaml` mist de build-stap `cp app/index.html gen/srv/index.html`. Controleer de `before-all` sectie.

**`Unauthorized` (401)** — JWT Secret niet ingesteld. Voer het JWT-blok hierboven opnieuw uit.

**`Authentication has expired` tijdens deploy** — CF-sessie verlopen. Opnieuw inloggen met `cf login`.

**Trial verlopen** — BTP Cockpit → **Extend Trial** (elke 30 dagen).

**`Trips/@UI.LineItem` leeg op detailpagina** — `People → Trips` navigatieproperty ontbreekt. Controleer of `srv/travel-service.cds` en `srv/team-service.cds` bevatten:
```cds
Trips: redirected to Trips
```
Daarna opnieuw builden en deployen.

---

*EhB Cloud Integration · In samenwerking met Flexso · Demo: 19 juni 2026*
