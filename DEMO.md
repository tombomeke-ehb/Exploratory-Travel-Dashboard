# Demo-script — Exploratory Travel Dashboard

Voor de demo bij EhB & Flexso (**19 juni 2026**). ~5 minuten per rol.
Volgorde: **Travel Coördinator → Team Lead → HR**. Zie `TESTPLAN.md` voor verwachte waarden.

---

## Voorbereiding (vóór de demo)

```bash
cds watch        # in-memory, verse seed-data
```
- Open **http://localhost:4004**.
- **Tip:** log één keer per rol kort in vóór de demo, zodat de caches **warm** zijn
  (de eerste airline-grafiek-load duurt ~8s; daarna instant).
- Accounts: `traveladmin`/`Admin1234!`, `teamlead`/`Lead1234!`, `hrviewer`/`HR1234!`.
- Korte kadering vooraf: *"Drie Fiori-apps op één gedeelde CAP-backend; data uit de
  externe TripPin OData-service; PrimePath-velden lokaal. Eigen login (JWT), geen XSUAA."*

---

## 1. Travel Coördinator (≈5 min)

1. **Landingspagina** (`/`): toon de drie rolkaarten met badges. Klik **Travel Dashboard**.
2. **Login** als `traveladmin` → je landt op het **KPI-startscherm** (niveau 1).
   - Wijs de KPI-tegels aan: **actieve reizen, op reis, komende reizen**.
   - Wijs **Airlinegebruik (top 5)** met boekingen + budget en **meest gebruikte airline**.
   - *Vermeld:* de datums in TripPin zijn 2014, daarom tonen sommige KPI's bewuste
     demo-fallbackwaarden — de logica is correct.
3. Klik door naar **Reizen & extensies** (lijst, niveau 2):
   - Wijs de **gekleurde goedkeuringsstatus-badge** (groen/oranje/rood).
   - Open een reis (niveau 3): toon de secties **Reisgegevens / PrimePath / Wijzigingshistoriek**.
4. Ga naar **Medewerkers**: wijs de **e-mail**-kolom; open een medewerker → **Reisoverzicht**
   toont enkel diens eigen reizen.
5. Toon **Airlines** (kolom *Boekingen*) en **Luchthavens** (kolom *Stad*).
6. Klik rechtsboven **← Overzicht** (terug naar startscherm) — toon de navigatie.

## 2. Team Lead (≈5 min)

1. Klik **Afmelden** (of open `/`) → **Team Dashboard** → login als `teamlead`.
2. **Startscherm**: wijs **Openstaande goedkeuringen** (KPI) + teamleden op reis/beschikbaar.
3. Open **Reisgoedkeuringen** → filter/toon een **In behandeling**-aanvraag van het eigen team.
4. Open die aanvraag → klik **Goedkeuren** (groene knop) → status wordt **Approved**.
   - Open de sectie **Wijzigingshistoriek**: toon `modifiedBy = teamlead` (audit).
5. *Vermeld de beveiliging:* een Team Lead kan **alleen** reizen van **eigen teamleden**
   beslissen — een reis buiten het team geeft een 403 (autorisatie in de service-laag).
6. Toon kort de **Teamleden**-lijst (statusbadge).

## 3. HR / Administratie (≈5 min)

1. **Afmelden** → **HR Dashboard** → login als `hrviewer`.
2. **Startscherm**: wijs het **airlinegebruik-overzicht** (staafvisualisatie + budget) en de KPI's.
3. Open **Reizen** → toon de **datumfilter** (van–tot bereik) op de reislijst.
4. Toon **Medewerkers** en **Airlines** (read-only).
5. *Vermeld:* HR is **volledig read-only** — geen wijzig-knoppen (rollenmatrix).

---

## Afsluiting — architectuur-praatpunten (1–2 min)

- **Eén gedeelde CAP-backend**, drie Fiori Elements-apps; gedeelde TripPin-projecties
  één keer gedefinieerd (`srv/shared.cds`).
- **Autorisatie in de service-laag** (TeamLead-teamcheck, HR read-only, TravelAdmin-override).
- **Eigen authenticatie** (bcrypt + JWT-cookie), rate limiting, en een **auth-gate** op de UI;
  automatische redirect naar login bij een verlopen sessie.
- **Robuustheid/performance**: in-memory caches met pre-warm bij boot, parallelle
  TripPin-traversals, graceful degradatie bij remote-fouten.

## Bewust te benoemen (geen bug)
- KPI-fallbacks + lege "op reis"/"eerstvolgende reis": TripPin-data is 2014 (onveranderlijk).
- Eerste airline-grafiek ~8s als de cache koud is (vandaar de warm-up-tip hierboven).
- Console-meldingen in dev (preload/i18n/lrep 404) zijn onschadelijk; productie (`cds build`)
  bundelt de app.
