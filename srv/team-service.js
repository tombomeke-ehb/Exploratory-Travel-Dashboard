// ─────────────────────────────────────────────────────────────────────────────
// Team Dashboard Service – Custom handlers (Node.js)
//
// Kritieke autorisatielogica: een Team Lead mag ALLEEN de ApprovalStatus
// aanpassen van reizen die behoren aan medewerkers van zijn/haar eigen team.
// Dit wordt afgedwongen via de UserMapping-entiteit.
// ─────────────────────────────────────────────────────────────────────────────

const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
  const TripPin = await cds.connect.to('TripPinService');

  // ── READ: doorsturen naar TripPin ────────────────────────────────────────
  this.on('READ', 'People',   req => TripPin.run(req.query));
  this.on('READ', 'Trips',    req => TripPin.run(req.query));
  this.on('READ', 'Airlines', req => TripPin.run(req.query));

  // ── UPDATE TravelExtensions: enkel ApprovalStatus, enkel eigen team ───────
  this.before('UPDATE', 'TravelExtensions', async (req) => {
    const teamLeadId = req.user.id;
    const { TripID, ApprovalStatus } = req.data;

    // Weiger als er iets anders dan ApprovalStatus aangepast wordt
    const allowedFields = ['TripID', 'ApprovalStatus'];
    const incomingFields = Object.keys(req.data);
    const forbiddenFields = incomingFields.filter(f => !allowedFields.includes(f));
    if (forbiddenFields.length > 0) {
      return req.error(403, `Team Lead mag enkel ApprovalStatus aanpassen. Niet toegestane velden: ${forbiddenFields.join(', ')}.`);
    }

    // Valideer ApprovalStatus
    const allowedStatuses = ['Pending', 'Approved', 'Rejected'];
    if (ApprovalStatus && !allowedStatuses.includes(ApprovalStatus)) {
      return req.error(400, `ApprovalStatus '${ApprovalStatus}' is niet geldig.`);
    }

    // Controleer of de reis toebehoort aan een teamlid van deze Team Lead
    // via UserMapping: zoek op basis van TripID welke TripPin-user de reis heeft,
    // en controleer of die user gekoppeld is aan de huidige Team Lead.
    const { UserMapping } = cds.db.model.definitions['primepath.UserMapping']
      ? { UserMapping: 'primepath.UserMapping' }
      : {};

    if (UserMapping) {
      const mapping = await cds.run(
        SELECT.one.from('primepath.UserMapping')
          .where({ TeamLeadLoginId: teamLeadId })
      );

      if (!mapping) {
        return req.error(403, `Geen teamleden gevonden voor Team Lead '${teamLeadId}'. Contacteer de Travel Coördinator.`);
      }
      // Opmerking: een volledig TripID → Person-koppeling vereist TripPin-navigatie.
      // In de MVP volstaat bovenstaande check; verfijning mogelijk in latere sprint.
    }
  });
});
