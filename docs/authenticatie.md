# Authenticatie & Autorisatie

## Overzicht

Het project gebruikt een **eigen authenticatiesysteem** in plaats van SAP XSUAA:
- Wachtwoorden: **bcrypt** (saltfactor 10)
- Sessies: **JWT** in een httpOnly-cookie (8 uur geldig)
- Autorisatie: CDS `@requires` per service + custom teamcheck

---

## Loginflow

```
Browser                          Server (server.js)
  │                                    │
  ├─POST /auth/login──────────────────►│
  │ { username, password }             │
  │                                    ├── Zoek user in primepath.Users
  │                                    ├── bcrypt.compare(password, hash)
  │                                    ├── jwt.sign({ sub, role, name })
  │◄───── Set-Cookie: primepath_auth ──┤
  │       (httpOnly, sameSite=lax)     │
  │                                    │
  ├─GET /travel/People────────────────►│
  │ Cookie: primepath_auth=<JWT>       │
  │                                    ├── auth-strategy.js:
  │                                    │   jwt.verify(token, JWT_SECRET)
  │                                    │   cds.context.user = { id, roles }
  │                                    ├── CDS @requires check
  │◄───── 200 + data ─────────────────┤
```

## Route-guard (server.js)

Statische pagina's en Fiori-apps worden beschermd vóór de CDS-middleware:

| URL-patroon | Vereiste rol | Redirect bij fout |
|-------------|-------------|-------------------|
| `/travel-dashboard/*`, `/travel-start.html` | TravelAdmin | `/travel-login.html` |
| `/team-dashboard/*`, `/team-start.html` | TeamLead | `/team-login.html` |
| `/hr-dashboard/*`, `/hr-start.html` | TravelViewer | `/hr-login.html` |

De guard controleert:
1. Is er een geldige JWT-cookie? (niet verlopen, correct gesigneerd)
2. Heeft de JWT-rol dezelfde waarde als de vereiste rol voor het dashboard?

Bij falen → 302 redirect naar de juiste loginpagina.

## XHR-interceptor (webapp/index.html)

Aanvullend op de route-guard: elke Fiori-app heeft een XHR-interceptor die bij een 401/403-respons automatisch doorverwijst naar de loginpagina. Dit vangt het geval op waar een sessie verloopt **tijdens** het gebruik van de app.

## Rollen & rechten

| Rol | Service | Lezen | Schrijven |
|-----|---------|-------|-----------|
| `TravelAdmin` | `/travel` | Alles | TravelExtensions (CRUD), UserMapping (CRUD) |
| `TravelAdmin` | `/admin` | Users (zonder passwordHash) | Users (CRUD) |
| `TeamLead` | `/team` | Eigen team | Alleen ApprovalStatus van eigen teamreizen |
| `TravelViewer` | `/hr` | Alles | Niets (volledig read-only) |

## Teamcheck (team-service.js)

De TeamLead mag alleen reizen van eigen teamleden aanpassen. De check verloopt als volgt:

```
1. Wie ben ik?
   Users.username → Users.tripPinUserName
   bijv. "teamlead" → "angelhuffman"

2. Wie zit er in mijn team?
   UserMapping WHERE TeamLeadUserName = "angelhuffman"
   → ["russellwhyte", "scottketchum", "ronaldmundy", "javieralfred"]

3. Welke reizen horen bij mijn team?
   Per teamlid: TripPin People('x')/Trips → verzamel TripIDs
   → Set { 0, 1, 2, 3, 1001, 1002, 1003, 1007 }

4. Mag ik deze reis aanpassen?
   TripID in de set? Ja → doorgaan. Nee → 403.
```

## Rate limiting

`/auth/login` is beschermd met `express-rate-limit`:
- Max **10 pogingen** per **15 minuten** per IP
- `trust proxy: 1` voor correcte IP-detectie achter Cloud Foundry

## JWT-configuratie

| Parameter | Waarde |
|-----------|--------|
| Algoritme | HS256 (standaard jsonwebtoken) |
| Verlooptijd | 8 uur |
| Cookie-naam | `primepath_auth` |
| Cookie-flags | httpOnly, sameSite=lax, secure (alleen in productie) |

**Productie-hardfail:** als `JWT_SECRET` niet gezet is of nog de default-waarde heeft, crasht de applicatie bij opstarten (`srv/jwt-config.js`).

## Beveiligingsmaatregelen

| Maatregel | Implementatie |
|-----------|--------------|
| Wachtwoorden | bcrypt hash (nooit plaintext) |
| passwordHash | Uitgesloten uit AdminService API-responses |
| JWT-cookie | httpOnly (niet toegankelijk via JavaScript) |
| Rate limiting | Max 10 login-pogingen per 15 min per IP |
| Rolcontrole | Server-side via CDS `@requires` + custom route-guard |
| Teamcheck | Server-side eigenaarschapscontrole per TripID |
| CSRF | Niet nodig: httpOnly cookie + sameSite=lax |
