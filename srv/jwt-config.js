// ─────────────────────────────────────────────────────────────────────────────
// PrimePath – Gedeelde JWT-secret-configuratie
//
// Eén plek voor het resolven én valideren van de JWT-secret.
// In productie mag de app NIET draaien met een ontbrekende of nog-default secret:
// dan zou de JWT met een publiek bekende sleutel gesigneerd zijn en dus vervalsbaar.
// Daarom faalt deze module dan hard bij het laden (FA v4 §8.4).
//
// Gebruikt door:
//   - server.js              (JWT aanmaken bij /auth/login)
//   - srv/auth-strategy.js   (JWT verifiëren bij elke request)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_SECRET = 'primepath-dev-secret-CHANGE-IN-PRODUCTION'
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET

if (process.env.NODE_ENV === 'production' && JWT_SECRET === DEFAULT_SECRET) {
  throw new Error(
    'JWT_SECRET is niet ingesteld of is nog de standaardwaarde! ' +
    'Stel in productie een sterke, unieke JWT_SECRET in als omgevingsvariabele.'
  )
}

module.exports = { JWT_SECRET, DEFAULT_SECRET }
