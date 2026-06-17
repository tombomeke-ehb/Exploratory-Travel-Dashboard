# Statuscontrole — FA/TA v4 vs. werkelijke code

**Exploratory Travel Dashboard · PrimePath Travel**
Opgesteld: 16 juni 2026 — Ismael · Lokaal getest tegen de draaiende app (`cds watch`, branch `dev`)
Demo: 19 juni 2026

> Doel: nagaan of de Functionele Analyse (FV01–FV30) en de Technische Analyse v4 **kloppen met wat er werkelijk in het project zit**. Drie delen: **wat af is**, **wat ontbreekt**, en **wat niet klopt** (tegenstrijdigheden in `TODO.md`).

---

## 1. Samenvatting

- De code is **ver gevorderd**: vrijwel de hele FA werkt en is lokaal geverifieerd.
- **Grootste openstaand punt: er staat nog niets in productie.** `dev` loopt **136 commits** vóór op `main`; de BTP-URL toont nog de oude (kapotte) versie.
- `TODO.md` bevat enkele **interne tegenstrijdigheden** (de controle-sectie spreekt latere resoluties tegen) die opgeschoond moeten worden.

---

## 2. Wat is af (klopt met de code)

### Functionele vereisten — lokaal getest (API)
| Dashboard | Werkend |
|-----------|---------|
| Travel | FV-01, FV-02, FV-03, FV-05, FV-06, FV-07, FV-08, FV-09, FV-11, FV-13, FV-14, FV-15, FV-17, FV-18, FV-20 |
| Team | FV-22, FV-23, FV-24, FV-25, FV-26 |
| HR | FV-27, FV-28, FV-29, FV-30 |

### Security & architectuur (TA)
- Eigen JWT-auth + httpOnly-cookie, bcrypt, **rate-limiting**, **hard-fail JWT_SECRET**, **auth-gate** op de UI, **401-redirect** (XHR-interceptor aanwezig).
- 4 services incl. `/admin`, gedeelde `shared.cds`, KPI-functies, `sap_horizon` + PrimePath-overlay, Nederlandse labels.
- Niveau-1 startschermen (`travel-/team-/hr-start.html`).

### Gerealiseerd deze sessie (16 juni)
- **FV-11** — Aankomstdatum (`EndsAt`) in de Reisextensies-lijst.
- **FV-13** — Datumbereik-filter (handler-side, want `StartsAt` is virtueel).
- **SDK v4** — `@sap-cloud-sdk` naar v4.7.0; TripPin-integratie geverifieerd.
- **Anti-cache-poisoning** — een leeg TripPin-resultaat wordt niet meer gecachet.

---

## 3. Wat ontbreekt (echt open)

| # | Item | Toelichting |
|---|------|-------------|
| 1 | 🔴 **Release naar productie** | 136 commits op `dev` niet op `main`. Productie (BTP) draait oude code. Nodig: PR `dev→main` + `mbt build` + `cf deploy` + `JWT_SECRET` (cf set-env) + destination `TripPinApi`. **Hoogste prioriteit vóór 19 juni.** |
| 2 | **TA §6.4 — beheerscherm gebruikers** | De `AdminService` (`/admin`) werkt (HTTP 200), maar er is **geen UI-scherm** om accounts te beheren. Bouwen of TA bijstellen. |
| 3 | **Beslissing FA-scope** | FA v4 lijst FV-04/10/12/16/19/23 nog als vereisten, maar ze staan buiten scope. Risico bij beoordeling. Kies: opnemen in FA §6.2 met motivering, óf expliciet als fase-2 benoemen in de demo. (Geen code.) |
| 4 | Design/UX & test | `index.html` visueel verbeteren; testen op productie-URL; KPI-tegels opwaarderen; lege-state-melding; mobiele weergave; TeamLead-flow handmatig testen. |
| 5 | Klein (los) | Expliciete `@UI.PresentationVariant` op HR Trips en Travel People/Trips. |

---

## 4. Wat niet klopt (tegenstrijdigheden in TODO.md)

1. **§6.2 401-redirect** — regel 314 zegt "nog open", maar regel 237 én de code (interceptor aanwezig) zeggen **GEDAAN**. → `[~]` op regel 314 is verouderd.
2. **Controle-sectie (regels 58–76) spreekt latere resoluties tegen:**
   - **§6.3 React `/dashboard`** — vermeld als gap, maar elders **VERVALLEN** (bewust verwijderd; `app/dashboard` leeg). Geen gap.
   - **§7.4 seed-data 2026** — vermeld als "rijen toevoegen", maar elders **NIET HAALBAAR** (reisdatums leven in TripPin 2014). Aanvaarde beperking, geen gap.
   - **FV-04/21** — staat al in "Buiten scope"; de controle-entry dupliceert dit.
3. **FV-11 dubbel uitgevoerd** — PR #116 (Tom) én PR #118 (Ismael). De code is **correct en niet gedupliceerd**, maar er zijn dubbele commits (bij de start niet gecontroleerd dat het al af was).
4. **`@UI.SelectionVariant #Upcoming` (regel 232)** stelt dat filteren op het virtuele `StartsAt` niet kan — maar **FV-13 bewijst dat het wél kan** via de handler. Verouderde bewering.
5. **SDK v4 + anti-cache (16 juni)** staan nog **niet** in `TODO.md`.

---

## 5. Aanbevolen volgorde

1. 🔴 **Release `dev → main` + deploy naar BTP** — zodat de demo-URL werkt (anders toont productie een wit scherm / fouten).
2. **TODO opschonen** — tegenstrijdigheden uit §4 wegwerken (1 docs-PR).
3. **Beslissing FA-scope** (§3.3) — samen met het team/Stijn.
4. **TA §6.4 beheerscherm** — bouwen als er tijd is, anders TA bijstellen.

---

*Bron: lokale controle op branch `dev` (16 juni 2026). FV-status geverifieerd via de OData-services `/travel`, `/team`, `/hr` en `/admin`.*
