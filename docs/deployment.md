# Deployment

## Lokaal ontwikkelen

### Vereisten

- Node.js 18+
- Git
- SAP CDS Development Kit (`npm i -g @sap/cds-dk`)

### Starten

```bash
git clone https://github.com/tombomeke-ehb/Exploratory-Travel-Dashboard.git
cd Exploratory-Travel-Dashboard
npm install --legacy-peer-deps
npx cds watch
```

Open http://localhost:4004

> `cds watch` gebruikt een in-memory SQLite-database die bij elke herstart vers wordt opgebouwd met seed-data.

### Validatie

```bash
# CDS-model controleren
npx cds compile srv > /dev/null

# JavaScript-syntax controleren
node --check server.js
node --check srv/travel-service.js
node --check srv/team-service.js
node --check srv/hr-service.js

# Boot-smoketest (verwacht: 'server listening on ...')
npx cds-serve
```

### Persistente database (optioneel)

```bash
npx cds deploy    # genereert db.sqlite met seed-data
npx cds-serve     # gebruikt het persistente db.sqlite-bestand
```

> Na een schemawijziging moet `npx cds deploy` opnieuw gedraaid worden, anders krijg je `no such column`-fouten.

---

## Productie-deploy (SAP BTP)

### Vereisten

- Cloud Foundry CLI (`cf`)
- MBT Build Tool (`npm i -g mbt`)
- Een SAP BTP-account met:
  - HANA Cloud (hdi-shared)
  - Destination service (lite)

### Stappen

```bash
# 1. Merge dev → main (als dat nog niet gedaan is)
git checkout main && git pull
git merge dev --no-ff -m "release: <beschrijving>"
git push origin main

# 2. Bouwen
mbt build

# 3. Deployen
cf deploy mta_archives/exploratory-travel-dashboard_1.0.0.mtar -f

# 4. JWT_SECRET instellen (eenmalig, of na elke restage)
cf set-env exploratory-travel-dashboard-srv JWT_SECRET "<sterk-geheim>"
cf restage exploratory-travel-dashboard-srv

# 5. Logs controleren
cf logs exploratory-travel-dashboard-srv --recent
```

### MTA-structuur

Het `mta.yaml`-bestand definieert:

| Module | Type | Beschrijving |
|--------|------|-------------|
| `exploratory-travel-dashboard-srv` | nodejs | CAP-server + statische HTML/Fiori-apps |
| `exploratory-travel-dashboard-db-deployer` | hdb | HANA-schemamigratie |

| Resource | Service | Beschrijving |
|----------|---------|-------------|
| `exploratory-travel-dashboard-db` | hana (hdi-shared) | HANA Cloud database |
| `exploratory-travel-dashboard-destination` | destination (lite) | TripPin-verbinding |

### Build-proces

Het build-proces (`mta.yaml` → `before-all`):
1. `npm install --legacy-peer-deps`
2. `npx cds build --production` → genereert `gen/srv` en `gen/db`
3. Kopieert de statische HTML-pagina's naar `gen/srv/`
4. Kopieert de Fiori-apps (`webapp/`) naar `gen/srv/app/`

### Omgevingsvariabelen

| Variabele | Vereist | Beschrijving |
|-----------|---------|-------------|
| `JWT_SECRET` | Ja (productie) | Geheim voor JWT-signing. Moet gezet zijn en niet de default-waarde |
| `NODE_ENV` | Automatisch | Gezet op `production` via mta.yaml |

### Troubleshooting

| Probleem | Oorzaak | Oplossing |
|----------|---------|----------|
| 500 bij login | JWT_SECRET niet gezet | `cf set-env ... JWT_SECRET <geheim> && cf restage ...` |
| Witte pagina | UI5-CDN niet bereikbaar | Check of `sapui5.hana.ondemand.com` bereikbaar is |
| `no such column` | Schema gewijzigd na deploy | Herdeploy de db-deployer module |
| TripPin-data leeg | TripPin-service onbereikbaar | Check de destination-configuratie in BTP cockpit |
