// ─────────────────────────────────────────────────────────────────────────────
// Admin Service – beheer van lokale gebruikers (primepath.Users)
//
// Nodig zodat cds build de tabel primepath.Users genereert voor HANA-deployment.
// FA v4 §10.1: beheer van gebruikersaccounts door de Travel Coördinator.
// ─────────────────────────────────────────────────────────────────────────────

using { primepath } from '../db/schema';

@requires: 'TravelAdmin'
service AdminService @(path: '/admin') {
  entity Users as projection on primepath.Users;
}
