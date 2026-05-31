// ─────────────────────────────────────────────────────────────────────────────
// PrimePath – Custom JWT Auth Strategy voor SAP CDS 9
//
// Vervangt SAP XSUAA. Leest een httpOnly-cookie 'primepath_auth' die een
// gesigneerde JWT bevat. De JWT wordt bij /auth/login aangemaakt (zie server.js).
//
// CDS laadt dit bestand via:
//   cds.requires.auth.impl = "./srv/auth-strategy"  (in .cdsrc.json, productie)
//
// Interface:  module exporteert een factory-functie (< 3 parameters),
//             die CDS aanroept met de config-opties en die een Express-middleware
//             teruggeeft: async (req, res, next) => void.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = function primepath_auth_factory(_options) {
  const cds = require('@sap/cds')
  const jwt = require('jsonwebtoken')

  const JWT_SECRET = process.env.JWT_SECRET || 'primepath-dev-secret-CHANGE-IN-PRODUCTION'
  const COOKIE_NAME = 'primepath_auth'

  return async function primepath_auth(req, res, next) {
    const token = req.cookies?.[COOKIE_NAME]

    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET)
        const user = new cds.User({ id: payload.sub, roles: [payload.role] })
        // Stel gebruiker in op zowel cds.context als req (patroon van basic-auth.js)
        const ctx = cds.context
        ctx.user = req.user = user
      } catch {
        // Verlopen of ongeldig token → anonieme toegang, CDS blokkeert via @requires
      }
    }

    next()
  }
}
