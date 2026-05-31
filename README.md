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

---

## Projectstructuur

```
/
├── app/
│   ├── travel-dashboard/    # Fiori app – Travel Coördinator
│   ├── team-dashboard/      # Fiori app – Team Lead
│   └── hr-dashboard/        # Fiori app – HR / Administratie
├── db/
│   ├── schema.cds           # TravelExtensions + UserMapping
│   └── data/                # Initiële CSV-data
├── srv/
│   ├── external/TripPin.cds # Externe service stub
│   ├── travel-service.cds/.js
│   ├── team-service.cds/.js
│   └── hr-service.cds
├── xs-security.json         # XSUAA rollen
├── .cdsrc.json
└── package.json
```

---

## Lokaal starten

```bash
npm install
cds watch
```

Server start op `http://localhost:4004`.  
In development-modus is auth uitgeschakeld (`dummy`).

---

## Volgende stappen

1. `cds import TripPin.xml` – EDMX importeren van https://services.odata.org/V4/TripPinServiceRW/$metadata
2. Fiori-apps genereren via SAP Business Application Studio of `cds add fiori-app`
3. `cds add xsuaa` – XSUAA toevoegen voor productie
4. `cds add mta` – MTA configuratie voor BTP deployment
5. `cds add hana` – HANA als productiedatabase
6. `cds up` – Bouwen en deployen naar Cloud Foundry

---

## Autorisatie

| Rol | XSUAA scope | Rechten |
|-----|-------------|---------|
| TravelAdmin | `$XSAPPNAME.TravelAdmin` | Lezen + schrijven (alle eigen velden) |
| TeamLead | `$XSAPPNAME.TeamLead` | Lezen + ApprovalStatus eigen team |
| TravelViewer | `$XSAPPNAME.TravelViewer` | Alleen lezen |

---

## Externe databron

**TripPin OData V4:** https://services.odata.org/V4/TripPinServiceRW  
Read-only. In productie via BTP Destination `TripPinApi`.

---

*EhB Cloud Integration · In samenwerking met Flexso · Demo: 19 juni 2026*
