# BTP Setup Gids – Exploratory Travel Dashboard

> Voor nieuwe developers die de app willen deployen op hun eigen SAP BTP trial account.

---

## Vereisten

- SAP BTP Trial account → [account.hanatrial.ondemand.com](https://account.hanatrial.ondemand.com)
- Node.js 18+ geïnstalleerd
- CF CLI geïnstalleerd → [docs.cloudfoundry.org/cf-cli](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html)
- MTA Build Tool → `npm install -g mbt`
- SAP CDS DK → `npm install -g @sap/cds-dk`

---

## Stap 1 – BTP Trial aanmaken

1. Ga naar [account.hanatrial.ondemand.com](https://account.hanatrial.ondemand.com) en log in
2. Klik op **Start your free trial** (als je nog geen trial hebt)
3. Kies regio **US East (VA) – us10** (aanbevolen voor HANA Cloud beschikbaarheid)
4. Wacht tot de trial-omgeving klaar is — dit duurt enkele minuten

> De trial is 90 dagen geldig en moet elke 30 dagen verlengd worden via de knop **Extend Trial** in de cockpit.

---

## Stap 2 – HANA Cloud instance aanmaken

HANA Cloud is de productiedatabase. Dit doe je éénmalig.

1. Ga in de BTP Cockpit naar je **Subaccount** → **Cloud Foundry** → **Spaces** → **dev**
2. Klik op **SAP HANA Cloud** in het linkermenu (of zoek via Service Marketplace)
3. Klik op **Create** → kies plan **hana-free**
4. Vul in:
   - **Instance Name:** `exploratory-travel-dashboard-db`
   - **Administrator Password:** kies een sterk wachtwoord en onthoud het
5. Klik **Create** en wacht — dit kan 10–15 minuten duren
6. Controleer of de status **Running** toont voor je verdergaat

> Als de aanmaak mislukt wegens een fout wachtwoord: verwijder de instance via het contextmenu en begin opnieuw. Er is geen "edit" optie.

---

## Stap 3 – CF CLI instellen

Open een terminal (PowerShell of BAS terminal) en log in op Cloud Foundry:

```bash
cf login -a https://api.cf.us10-001.hana.ondemand.com
```

Voer je BTP-emailadres en wachtwoord in. Selecteer daarna:
- **Org:** `<jouw-gebruiker>trial` (bijv. `a182fdf5trial`)
- **Space:** `dev`

Controleer of je correct ingelogd bent:

```bash
cf target
```

---

## Stap 4 – TripPin Destination aanmaken

De app haalt reisdata op via een BTP Destination.

1. Ga in de BTP Cockpit naar je **Subaccount** (niet de space) → **Connectivity** → **Destinations**
2. Klik op **New Destination** en vul in:

| Veld | Waarde |
|------|--------|
| Name | `TripPinApi` |
| Type | HTTP |
| URL | `https://services.odata.org/V4/TripPinServiceRW` |
| Proxy Type | Internet |
| Authentication | NoAuthentication |

3. Klik **Save** en daarna **Check Connection** — je zou een groene status moeten zien

---

## Stap 5 – Repository klonen en dependencies installeren

```bash
git clone https://github.com/tombomeke-ehb/Exploratory-Travel-Dashboard.git
cd Exploratory-Travel-Dashboard
npm install --legacy-peer-deps
```

---

## Stap 6 – Bouwen en deployen

```bash
mbt build
cf deploy mta_archives/exploratory-travel-dashboard_1.0.0.mtar -f
```

De deploy doet automatisch:
- CAP service deployen naar Cloud Foundry
- HANA-tabellen aanmaken via de db-deployer
- Demo-gebruikers laden vanuit de CSV-seeddata

Controleer de status na de deploy:

```bash
cf apps
```

Je zou `exploratory-travel-dashboard-srv` met status **Started** moeten zien. De `db-deployer` zal **Stopped** zijn — dat is normaal (eenmalige job).

---

## Stap 7 – JWT Secret instellen (verplicht)

Zonder dit werkt de login niet correct in productie:

```bash
# Genereer een veilig geheim
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Stel het in op de app
cf set-env exploratory-travel-dashboard-srv JWT_SECRET <geheim-dat-je-net-genereerde>
cf restage exploratory-travel-dashboard-srv
```

> Je hoeft dit maar één keer te doen. Het geheim blijft bewaard bij volgende deploys.

---

## Stap 8 – App testen

**Productie-URL (PrimePath trial):**
https://a182fdf5trial-dev-exploratory-travel-dashboard-srv.cfapps.us10-001.hana.ondemand.com/

Voor andere accounts, zoek de URL op via:
```bash
cf apps
```

Open de URL in de browser. Je ziet de landingspagina met 3 dashboards. Klik op een dashboard en log in met de demo-accounts:

| Gebruikersnaam | Wachtwoord | Dashboard |
|----------------|------------|-----------|
| `traveladmin` | `Admin1234!` | Travel Dashboard |
| `teamlead` | `Lead1234!` | Team Dashboard |
| `hrviewer` | `HR1234!` | HR Dashboard |

---

## Updates deployen

Bij wijzigingen aan de code:

```bash
git pull
mbt build
cf deploy mta_archives/exploratory-travel-dashboard_1.0.0.mtar -f
```

Het JWT Secret hoef je niet opnieuw in te stellen.

---

## Problemen oplossen

**`Cannot GET /`** — de `server.js` kan `index.html` niet vinden. Controleer of de `mta.yaml` build-stap `cp app/index.html gen/srv/index.html` bevat.

**`Unauthorized` (401)** — het JWT Secret is niet ingesteld. Voer Stap 7 opnieuw uit.

**HANA aanmaak mislukt** — verwijder de instance en maak opnieuw aan met een geldig wachtwoord (min. 8 tekens, hoofdletter, cijfer, speciaal teken).

**`mbt build` mislukt met npm-fout** — voer `npm install --legacy-peer-deps` opnieuw uit in BAS (Linux-omgeving) en probeer opnieuw.

**Trial verlopen** — ga naar de BTP Cockpit en klik op **Extend Trial**. Dit moet elke 30 dagen.

**`Authentication has expired` tijdens `cf deploy`** — je CF-sessie is verlopen (dit gebeurt na enkele uren inactiviteit). Log opnieuw in:

```bash
cf login -a https://api.cf.us10-001.hana.ondemand.com
```

Voer je BTP-email en wachtwoord in, kies org en space `dev`. Daarna herhaal je het `cf deploy`-commando. Je kunt ook via de BAS Command Palette inloggen: `Ctrl+Shift+P` → **CF: Login to Cloud Foundry**.

---

*EhB Cloud Integration · In samenwerking met Flexso · Demo: 19 juni 2026*
