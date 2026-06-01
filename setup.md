# BTP Deployment – Stappenplan

## Vereisten (éénmalig installeren)

```bash
npm install -g mbt
npm install -g @sap/cf-tools
cf install-plugin multiapps
```

---

## Elke deployment

```bash
git pull
npm install --legacy-peer-deps
mbt build
cf deploy mta_archives/exploratory-travel-dashboard_1.0.0.mtar -f
```

---

## Eerste deployment ooit ⚠️

Na de **allereerste** `cf deploy`, één keer het JWT-geheim instellen:

```bash
cf set-env exploratory-travel-dashboard-srv JWT_SECRET $(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
cf restage exploratory-travel-dashboard-srv
```

> Dit is **éénmalig** — het geheim overleeft volgende deployments.

---

## App-URL opzoeken

```bash
cf apps
```

De URL staat in de kolom `urls`.

---

## Demo-accounts

| Gebruikersnaam | Wachtwoord   | Dashboard                    |
|----------------|--------------|------------------------------|
| `traveladmin`  | `Admin1234!` | Travel Dashboard (coördinator) |
| `teamlead`     | `Lead1234!`  | Team Dashboard               |
| `hrviewer`     | `HR1234!`    | HR Dashboard                 |

---

## Problemen?

```bash
cf logs exploratory-travel-dashboard-srv --recent
```
