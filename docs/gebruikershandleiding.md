# Gebruikershandleiding

## Inloggen

1. Ga naar de landingspagina (http://localhost:4004 of de productie-URL)
2. Kies het dashboard voor jouw rol
3. Log in met de juiste credentials

| Rol | Account | Wachtwoord |
|-----|---------|-----------|
| Travel Coördinator | `traveladmin` | `Admin1234!` |
| Team Lead (team 1) | `teamlead` | `Lead1234!` |
| Team Lead (team 2) | `teamlead2` | `teamlead2` |
| HR / Administratie | `hrviewer` | `HR1234!` |

---

## Travel Dashboard (Travel Coördinator)

### Startscherm (niveau 1)

Het startscherm toont vier KPI-tegels:
- **Actieve reizen** — aantal reizen die vandaag lopen
- **Medewerkers op reis** — aantal unieke personen momenteel onderweg
- **Komende reizen** — reizen die binnen 14 dagen starten
- **Meest gebruikte airline** — op basis van boekingsaantallen

Daaronder een **airlinegebruik-grafiek** (top 5 met boekingen en budget).

Navigatiekaarten leiden naar de Fiori-lijsten (niveau 2).

### Reisextensies (niveau 2)

De hoofdlijst van het Travel Dashboard. Elke rij is een PrimePath-reisextensie gekoppeld aan een TripPin-reis.

**Kolommen:** Trip ID, Vertrekdatum, Aankomstdatum, Projectcode, Goedkeuringsstatus (gekleurde badge), Interne notitie.

**Filters:** ApprovalStatus (dropdown), Vertrekdatum, Aankomstdatum.

**Acties (op de detailpagina):**
- **Goedkeuren** — zet status op "Goedgekeurd" (groen)
- **Afkeuren** — zet status op "Afgekeurd" (rood)
- **Terugzetten** — zet status terug naar "In behandeling" (oranje)
- **Notitie bewerken** — wijzig projectcode en/of interne notitie

### Medewerkers

Lijst van alle TripPin-medewerkers met statusbadge (op reis / beschikbaar).

Klik op een medewerker voor de detailpagina met persoonsgegevens en een reisoverzicht.

### Airlines & Luchthavens

Overzichtslijsten met navigatie naar detailpagina's.

---

## Team Dashboard (Team Lead)

### Startscherm (niveau 1)

Toont:
- **Openstaande goedkeuringen** — aantal reizen met status "In behandeling" van jouw team
- **Teamleden op reis / beschikbaar** — overzicht van je teamleden
- Navigatiekaarten naar goedkeuringen, teamleden en reizen

### Mijn team (niveau 2)

Lijst van **alleen jouw teamleden** (gefilterd op basis van UserMapping).

**Kolommen:** Gebruikersnaam, Voornaam, Familienaam, Eerstvolgende reis (datum + naam), Status (op reis / beschikbaar).

Klik op een teamlid voor de detailpagina met reistijdlijn.

### Reisgoedkeuringen

Lijst van reisextensies van **alleen jouw teamleden**.

**Filters:** ApprovalStatus (dropdown), Projectcode.

**Acties (op de detailpagina):**
- **Goedkeuren** — zet status op "Goedgekeurd"
- **Afkeuren** — zet status op "Afgekeurd"
- **Terugzetten** — zet status terug naar "In behandeling"

> Je kunt **alleen** reizen van jouw eigen teamleden aanpassen. Reizen van andere teams zijn niet zichtbaar en geven een 403-fout bij een poging tot wijziging.

### Autorisatiedemo

Log in als `teamlead` (team 1: Russell, Scott, Ronald, Javier) en als `teamlead2` (team 2: Vincent, Clyde, Sallie). Elk account ziet alleen de reizen van het eigen team.

---

## HR Dashboard (HR / Administratie)

### Startscherm (niveau 1)

Toont:
- **Totaal reizen** — alle reizen in de TripPin-databron
- **Medewerkers** — aantal geregistreerde medewerkers
- **Meest gebruikte airline** — op basis van boekingen
- **Airlinegebruik-grafiek** (top 5 met boekingen en budget)

### Reizen

Overzicht van alle reizen (read-only). Filters op vertrek- en aankomstdatum.

### Medewerkers

Lijst van alle medewerkers. Klik voor de detailpagina met reisoverzicht.

### Reisextensies

Read-only overzicht van alle PrimePath-reisextensies met statusbadge.

**Filters:** ApprovalStatus (dropdown), Projectcode.

### Airlines & Luchthavens

Overzichtslijsten met boekingsaantallen (airlines) en stad (luchthavens).

---

## Weergave-instellingen

Op elke tabel kun je via het **tandwiel-icoon** (⚙) de weergave aanpassen:

- **Kolommen** — kolommen toevoegen, verwijderen of herschikken
- **Sorteren** — sorteervolgorde wijzigen
- **Filteren** — extra filters toevoegen
- **Groeperen** — rijen groeperen op een kolom

Wijzigingen worden opgeslagen in de browser (localStorage) en blijven behouden tot je de browserdata wist.

---

## Afmelden

Klik op **Afmelden** in de bovenste balk. Dit wist het JWT-cookie en brengt je terug naar de landingspagina.
