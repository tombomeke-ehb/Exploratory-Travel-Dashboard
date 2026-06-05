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

> **Samenwerkings-tip:** Als je samenwerkt op één gedeelde omgeving, hoeft alleen de **Host** (de beheerder van de gedeelde omgeving) deze database-instance aan te maken. De overige teamleden kunnen deze stap overslaan.

> Als de aanmaak mislukt wegens een fout wachtwoord: verwijder de instance via het contextmenu en begin opnieuw. Er is geen "edit" optie.

---

## Stap 3 – SAP Business Application Studio (BAS) instellen

Je gaat nu SAP Business Application Studio (BAS) openen en een Dev Space aanmaken om in te kunnen werken.

1. Ga in de BTP Cockpit terug naar je **Subaccount: trial** (klik op **trial** in het broodkruimelpad bovenaan)
2. Navigeer in het linkermenu naar **Instances and Subscriptions**
3. Klik onder *Subscriptions* op **SAP Business Application Studio** om de applicatie te openen
4. Klik op **Create Dev Space**
5. Vul een naam in voor je Dev Space (bijv. `ExploratoryTravelDashboardDev`) en kies het type **SAP Fiori**
6. Klik onderaan op de knop **Create Dev Space**
7. Wacht tot de status van de Dev Space verandert naar **RUNNING** en klik op de naam van de Dev Space om deze te openen
8. Je bevindt je nu in de SAP BAS-omgeving waar je de volgende stappen kunt uitvoeren.

---

## Stap 4 – Samenwerken op één gedeelde BTP-omgeving (Aanbevolen)

Als team is het handiger om **samen te werken op één gedeelde BTP-omgeving**. Hierdoor delen jullie dezelfde database, destinations en deployen jullie naar dezelfde applicatie-URL.

Kies één teamlid als **Host** (bijv. degene met subaccount `a182fdf5trial`). Deze Host voert de volgende stappen uit in de BTP Cockpit om anderen toegang te geven:

1. **Teammate uitnodigen voor de Cloud Foundry Org:**
   - Ga naar het **Subaccount: trial** van de Host.
   - Klik in het linkermenu op **Cloud Foundry** → **Org Members**.
   - Klik op **Configure Members** → **Add Members** en vul het SAP BTP-e-mailadres van je teamgenoot in. Geef hen de rol **Org Manager** (of Org User).
2. **Teammate toegang geven tot de Space:**
   - Klik in het linkermenu op **Cloud Foundry** → **Spaces**.
   - Klik op de space **dev**.
   - Klik op **Members** (of Space Members) → **Configure Members** → **Add Members** en voeg je teamgenoot toe met de rol **Space Developer**.

*De teamgenoot kan nu in de volgende stappen direct inloggen op de Org van de Host.*

---

## Stap 5 – CF CLI instellen

Open een terminal (PowerShell of BAS terminal) en log in op Cloud Foundry:

```bash
cf login -a https://api.cf.us10-001.hana.ondemand.com
```

Voer je BTP-emailadres en wachtwoord in. Selecteer daarna:
- **Org:** De Org van de **Host** (bijv. `a182fdf5trial`)
- **Space:** `dev`

Controleer of je correct op de gedeelde omgeving bent ingelogd:

```bash
cf target
```

---

## Stap 6 – TripPin Destination controleren (Eenmalig per subaccount)

De app haalt externe OData-reisdata op via een BTP Destination. De **Host** moet controleren of deze eenmalig is aangemaakt op de gedeelde omgeving:

1. Ga in de BTP Cockpit naar het **Subaccount** van de Host → **Connectivity** → **Destinations**.
2. Controleer of er al een destination staat met de naam `TripPinApi`.
3. Als deze er nog niet staat (of als je toch op een eigen/apart trial subaccount werkt), klik dan op **New Destination** en vul in:

| Veld | Waarde |
|------|--------|
| Name | `TripPinApi` |
| Type | HTTP |
| URL | `https://services.odata.org/V4/TripPinServiceRW` |
| Proxy Type | Internet |
| Authentication | NoAuthentication |

4. Klik **Save** en daarna **Check Connection** — je zou een groene status moeten zien.

---

## Stap 7 – Repository klonen en dependencies installeren

```bash
git clone https://github.com/tombomeke-ehb/Exploratory-Travel-Dashboard.git
cd Exploratory-Travel-Dashboard
npm install --legacy-peer-deps
```

---

## Stap 8 – Bouwen en deployen

```bash
mbt build
cf deploy mta_archives/exploratory-travel-dashboard_1.0.0.mtar -f
```

De deploy doet automatisch:
- CAP service deployen naar Cloud Foundry van de Host
- HANA-tabellen aanmaken via de db-deployer
- Demo-gebruikers laden vanuit de CSV-seeddata

Controleer de status na de deploy:

```bash
cf apps
```

Je zou `exploratory-travel-dashboard-srv` met status **Started** moeten zien. De `db-deployer` zal **Stopped** zijn — dat is normaal (eenmalige job).

---

## Stap 9 – JWT Secret instellen (Eenmalig per deploy-omgeving)

Zonder dit werkt de login niet correct in productie. Dit hoeft maar **één keer** op de gedeelde app te gebeuren (door de Host of de Teammate):

```bash
# Genereer een veilig geheim
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Stel het in op de app
cf set-env exploratory-travel-dashboard-srv JWT_SECRET <geheim-dat-je-net-genereerde>
cf restage exploratory-travel-dashboard-srv
```

> Het JWT-geheim hoeft niet opnieuw te worden ingesteld bij volgende updates — het blijft bewaard in de CF-omgevingsvariabelen.

---

## Stap 10 – App testen

**Productie-URL (Gedeelde app):**
https://<host-org-naam>-dev-exploratory-travel-dashboard-srv.cfapps.us10-001.hana.ondemand.com/

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

## Updates deployen na codewijzigingen

Bij wijzigingen aan de code voer je de volgende stappen volledig uit:

```bash
# 1. Zorg dat je ingelogd bent op CF (op de gedeelde Org en Space)
cf login -a https://api.cf.us10-001.hana.ondemand.com

# 2. Pull de laatste wijzigingen
git pull

# 3. Installeer eventuele nieuwe dependencies
npm install --legacy-peer-deps

# 4. Build de MTA
mbt build

# 5. Deploy naar BTP
cf deploy mta_archives/exploratory-travel-dashboard_1.0.0.mtar -f

# 6. Controleer de logs
cf logs exploratory-travel-dashboard-srv --recent
```

> Het JWT Secret hoef je **niet** opnieuw in te stellen bij updates — het blijft bewaard in de CF-omgevingsvariabelen.

> Na CDS-wijzigingen (bijv. in `.cds`-bestanden): voer altijd `npx cds build --production` uit vóór `mbt build` om zeker te zijn dat de gegenereerde bestanden actueel zijn.

---

## Problemen oplossen

**`Cannot GET /`** — de `server.js` kan `index.html` niet vinden. Controleer of de `mta.yaml` build-stap `cp app/index.html gen/srv/index.html` bevat.

**`Unauthorized` (401)** — het JWT Secret is niet ingesteld. Voer Stap 9 opnieuw uit.

**HANA aanmaak mislukt** — verwijder de instance en maak opnieuw aan met een geldig wachtwoord (min. 8 tekens, hoofdletter, cijfer, speciaal teken).

**`mbt build` mislukt met npm-fout** — voer `npm install --legacy-peer-deps` opnieuw uit in BAS (Linux-omgeving) en probeer opnieuw.

**Trial verlopen** — ga naar de BTP Cockpit en klik op **Extend Trial**. Dit moet elke 30 dagen.

**`Authentication has expired` tijdens `cf deploy`** — je CF-sessie is verlopen (dit gebeurt na enkele uren inactiviteit). Log opnieuw in:

```bash
cf login -a https://api.cf.us10-001.hana.ondemand.com
```

Voer je BTP-email en wachtwoord in, kies org (van de Host) en space `dev`. Daarna herhaal je het `cf deploy`-commando. Je kunt ook via de BAS Command Palette inloggen: `Ctrl+Shift+P` → **CF: Login to Cloud Foundry**.

**`Trips/@UI.LineItem` toont leeg op de medewerkerdetailpagina** — de `People → Trips` navigatieproperty ontbreekt in de CDS-service. Controleer of `srv/travel-service.cds` en `srv/team-service.cds` de volgende regel bevatten in de `People`-projectie:

```cds
Trips: redirected to Trips
```

Voer na elke CDS-wijziging opnieuw uit:
```bash
npx cds build --production
mbt build
cf deploy mta_archives/exploratory-travel-dashboard_1.0.0.mtar -f
```

---

*EhB Cloud Integration · In samenwerking met Flexso · Demo: 19 juni 2026*
