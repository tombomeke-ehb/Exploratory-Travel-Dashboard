// ─────────────────────────────────────────────────────────────────────────────
// PrimePath – Custom server bootstrap
//
// Voegt toe:
//   1. cookie-parser vóór de CDS auth-middleware (zodat req.cookies beschikbaar is)
//   2. POST /auth/login  – valideert credentials, zet httpOnly JWT-cookie
//   3. POST /auth/logout – wist het JWT-cookie
//   4. GET  /            – serveert de landingspagina (index.html)
// ─────────────────────────────────────────────────────────────────────────────

const cds          = require('@sap/cds')
const path         = require('path')
const fs           = require('fs')
const express      = require('express')
const cookieParser = require('cookie-parser')
const jwt          = require('jsonwebtoken')
const bcrypt       = require('bcryptjs')
const { rateLimit } = require('express-rate-limit')

const { JWT_SECRET } = require('./srv/jwt-config')
const JWT_EXPIRES = '8h'
const COOKIE_NAME = 'primepath_auth'

// ── Rate limiting voor /auth/login ──────────────────────────────────────────
// FA v4 §8.4: brute-force afremmen. Max 10 pogingen per 15 minuten per IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minuten
  max:      10,               // max 10 pogingen per IP per venster
  standardHeaders: true,      // voeg RateLimit-* headers toe
  legacyHeaders:   false,
  message: { error: 'Te veel inlogpogingen. Probeer het over 15 minuten opnieuw.' },
})

// ── Voeg cookie-parser toe VOOR de CDS auth-middleware ──────────────────────
// cds.middlewares.before = [context, trace, auth, ctx_model]
// We plaatsen cookie-parser vóór 'auth' zodat req.cookies al geparsed is
// wanneer auth-strategy.js draait.
cds.middlewares.add(cookieParser(), { before: 'auth' })

cds.on('bootstrap', (app) => {

  // Achter de Cloud Foundry-router: vertrouw 1 proxy-hop zodat express-rate-limit
  // het echte client-IP uit X-Forwarded-For haalt (i.p.v. het router-IP).
  app.set('trust proxy', 1)

  // ── Statische HTML-pagina's (landingspagina + loginpagina's) ──────────────
  // In productie staan de HTML-bestanden naast server.js (gekopieerd via mta.yaml).
  // In development worden ze direct gelezen vanuit app/.
  function serveHtml (filename, route) {
    const prodPath = path.join(__dirname, filename)
    const devPath  = path.join(__dirname, 'app', filename)
    const filePath = fs.existsSync(prodPath) ? prodPath : devPath
    if (fs.existsSync(filePath)) app.get(route, (_req, res) => res.sendFile(filePath))
  }

  serveHtml('index.html',          '/')
  serveHtml('travel-login.html',   '/travel-login.html')
  serveHtml('team-login.html',     '/team-login.html')
  serveHtml('hr-login.html',       '/hr-login.html')

  // Unified React dashboard — serve all static files from app/dashboard/
  const dashDir = path.join(__dirname, 'app', 'dashboard')
  if (fs.existsSync(dashDir)) {
    app.use('/dashboard', express.static(dashDir))
    app.get('/dashboard', (_req, res) => res.sendFile(path.join(dashDir, 'index.html')))
  }

  // ── JSON body-parser voor auth-endpoints ──────────────────────────────────
  app.use('/auth', express.json())

  // ── POST /auth/login ──────────────────────────────────────────────────────
  // Body: { username: string, password: string }
  // Succes: zet httpOnly-cookie, geeft { role, name } terug
  // Fout:   401 of 400
  app.post('/auth/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body || {}

    if (!username || !password) {
      return res.status(400).json({ error: 'Gebruikersnaam en wachtwoord zijn verplicht.' })
    }

    try {
      const db   = await cds.connect.to('db')
      const user = await db.run(SELECT.one.from('primepath.Users').where({ username }))

      if (!user) {
        return res.status(401).json({ error: 'Ongeldige gebruikersnaam of wachtwoord.' })
      }

      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) {
        return res.status(401).json({ error: 'Ongeldige gebruikersnaam of wachtwoord.' })
      }

      const token = jwt.sign(
        { sub: user.username, role: user.role, name: user.displayName },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
      )

      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure:   process.env.NODE_ENV === 'production',
        maxAge:   8 * 60 * 60 * 1000   // 8 uur in ms
      })

      return res.json({ role: user.role, name: user.displayName })

    } catch (err) {
      cds.log('auth').error('Login error:', err)
      return res.status(500).json({ error: 'Interne serverfout.' })
    }
  })

  // ── POST /auth/logout ─────────────────────────────────────────────────────
  app.post('/auth/logout', (_req, res) => {
    res.clearCookie(COOKIE_NAME)
    res.json({ ok: true })
  })
})

module.exports = cds.server
