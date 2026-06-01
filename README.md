# Exploratory Travel Dashboard – PrimePath Travel

**Cloud Integration · SAP BTP & CAP · Erasmushogeschool Brussel · In samenwerking met Flexso**

---

## Overzicht

Centraal exploratief webdashboard voor PrimePath Travel, gebouwd op SAP BTP met CAP (Node.js) en SAP Fiori Elements.

**3 aparte Fiori-apps, 1 gedeelde CAP-backend:**

| App | Doelgroep | Service path |
|-----|-----------|------|
| Travel Dashboard | Travel Coördinator | `/travel` |
| Team Dashboard | Team Lead | `/team` |
| HR Dashboard | HR / Administratie | `/hr` |

Authenticatie verloopt via een eigen login-systeem (database + JWT). SAP XSUAA is **niet** vereist.

**Productie-URL:** https://a182fdf5trial-dev-exploratory-travel-dashboard-srv.cfapps.us10-001.hana.ondemand.com/

---

## Projectstructuur

```
/
├── app/
│   ├── travel-dashboard/    # Fiori app – Travel Coördinator (annotations)
│   ├── team-dashboard/      # Fiori app – Team Lead (annotations)
│   ├── hr-dashboard/        # Fiori app – HR / Administratie (annotations)
│   ├── index.html           # Landingspagina (rolkeuze)
│   ├── travel-login.html    # Loginpagina Travel Coördinator
│   ├── team-login.html      # Loginpagina Team Lead
│   └── hr-login.html        # Loginpagina HR / Administratie
├── db/
│   ├── schema.cds           # TravelExtensions + UserMapping + Users
│   └── data/
│       ├── primepath-Users.csv           # Demo-accounts (bcrypt-hashes)
│       ├── primepath-UserMapping.csv
│       └── primepath-TravelExtensions.csv
├── srv/
│   ├── external/TripPin.cds # Externe service stub
│   ├── auth-strategy.js     # CDS 9 custom auth (JWT-cookie → cds.context.user)
│   ├── travel-service.cds/.js
│   ├── team-service.cds/.js
│   └── hr-service.cds/.js
├── server.js                # Bootstrap: login/logout routes + cookie-parser
├── .cdsrc.json              # Auth: dummy (dev) / custom JWT (prod)
├── mta.yaml                 # BTP deployment (geen XSUAA)
└── package.json
```

---

## Lokaal starten

### 1. Installeer dependencies

```bash
npm install
```

### 2. Initialiseer de lokale database (éénmalig, en bij schema-wijzigingen)

```bash
npx cds deploy --to sqlite:db.sqlite
```

> Dit maakt `db.sqlite` aan met het volledige schema én laadt de CSV-seeddata (inclusief demo-accounts).
> Herhaal dit commando elke keer als je iets wijzigt in `db/schema.cds` of de CSV-bestanden.

### 3. Start de development server

```bash
cds watch
```

Server start op `http://localhost:4004`.

In development-modus is auth uitgeschakeld (`dummy`) — je hebt geen login nodig.
De login-endpoints werken wél (handig om de flow te testen).

### Demo-accounts

| Gebruikersnaam | Wachtwoord   | Rol           | Dashboard         |
|----------------|--------------|---------------|-------------------|
| `traveladmin`  | `Admin1234!` | TravelAdmin   | Travel Dashboard  |
| `teamlead`     | `Lead1234!`  | TeamLead      | Team Dashboard    |
| `hrviewer`     | `HR1234!`    | TravelViewer  | HR Dashboard      |

> Wachtwoorden zijn opgeslagen als bcrypt-hash (factor 10) in `db/data/primepath-Users.csv`.

---

## Deployen naar SAP BTP (Cloud Foundry)

### Vereisten

- CF CLI geïnstalleerd en ingelogd (`cf login`)
- MTA Build Tool geïnstalleerd (`mbt --version`)
- HANA Cloud instance beschikbaar in je CF space
- BTP Destination `TripPinApi` geconfigureerd (zie [Externe databron](#externe-databron))

### Stap 1 – Build

```bash
mbt build
```

Dit genereert een `.mtar`-bestand in de `mta_archives/`-map.

### Stap 2 – Deploy

```bash
cf deploy mta_archives/exploratory-travel-dashboard_1.0.0.mtar
```

> De HANA-database wordt automatisch aangemaakt en gevuld met de CSV-seeddata (inclusief demo-accounts en `primepath-Users`).

### Stap 3 – JWT-geheim instellen ⚠️ VERPLICHT

Na de eerste deployment moet je een sterk JWT-geheim instellen. Zonder dit gebruikt de app een onveilig standaardgeheim.

```bash
cf set-env exploratory-travel-dashboard-srv JWT_SECRET <vervang-door-sterk-willekeurig-geheim>
cf restage exploratory-travel-dashboard-srv
```

**Genereer een veilig geheim (voorbeeld):**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> Het JWT-geheim overleeft volgende deployments — je hoeft dit **niet** opnieuw in te stellen bij een update, tenzij je het geheim wilt rouleren.

### Stap 4 – Controleer de deployment

```bash
cf apps
cf logs exploratory-travel-dashboard-srv --recent
```

De app is bereikbaar via de CF-url die je ziet bij `cf apps`.

---

## Authenticatie

Gebruikers worden opgeslagen in de HANA-tabel `primepath_Users`. Er is geen XSUAA vereist.

| Rol            | Toegang                                              |
|----------------|------------------------------------------------------|
| `TravelAdmin`  | Volledig lezen + schrijven — Travel Dashboard        |
| `TeamLead`     | Lezen + ApprovalStatus eigen team — Team Dashboard   |
| `TravelViewer` | Alleen lezen — HR Dashboard                          |

**Login-flow:**
1. Gebruiker opent de landingspagina en klikt op een dashboard
2. Loginpagina toont een formulier (gebruikersnaam + wachtwoord)
3. `POST /auth/login` valideert tegen de database (bcrypt) en zet een httpOnly JWT-cookie
4. Browser stuurt de cookie automatisch mee bij alle Fiori OData-requests
5. `srv/auth-strategy.js` valideert het cookie bij elke request en stelt `cds.context.user` in
6. CAP's `@requires` blokkeert requests zonder de juiste rol (HTTP 403)

**Uitloggen:** `POST /auth/logout` wist het cookie.

---

## Externe databron

**TripPin OData V4:** `https://services.odata.org/V4/TripPinServiceRW`

In productie via een BTP Destination genaamd `TripPinApi`:

1. Ga in BTP Cockpit naar je CF space → **Destinations**
2. Maak een nieuwe destination aan:
   - **Name:** `TripPinApi`
   - **Type:** HTTP
   - **URL:** `https://services.odata.org/V4/TripPinServiceRW`
   - **Authentication:** NoAuthentication

---

## Gebruikersbeheer

De Travel Coördinator kan gebruikers beheren via de entiteit `Users` in de HANA-database. Voor nu gaat dit rechtstreeks via SQL of via een toekomstig admin-scherm.

**Nieuw wachtwoord hashen (Node.js):**
```bash
node -e "const b=require('bcryptjs'); console.log(b.hashSync('NieuwWachtwoord1!', 10))"
```

Zet de hash dan in de `primepath_Users`-tabel.

---

*EhB Cloud Integration · In samenwerking met Flexso · Demo: 19 juni 2026*
