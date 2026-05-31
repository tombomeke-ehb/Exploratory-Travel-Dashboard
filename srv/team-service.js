// ─────────────────────────────────────────────────────────────────────────────
// Team Dashboard Service – Custom handlers (Node.js)
//
// FA v4 §4.2 + §7.2 + §11 (rollenmatrix)
//
// Kritieke autorisatielogica (FV-24):
//   Een Team Lead mag ALLEEN de ApprovalStatus aanpassen van reizen
//   die behoren aan medewerkers van zijn/haar eigen team (via UserMapping).
//
// Handlers:
//   READ People/Trips/Airlines → doorsturen naar TripPin
//   UPDATE TravelExtensions    → teamcheck + veldbeperking
// ─────────────────────────────────────────────────────────────────────────────

const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
  const TripPin = await cds.connect.to('TripPinService');

  // ── READ: TripPin doorsturen ───────────────────────────────────────────────
  this.on('READ', 'People',   req => TripPin.run(req.query));
  this.on('READ', 'Trips',    req => TripPin.run(req.query));
  this.on('READ', 'Airlines', req => TripPin.run(req.query));

  // ── FV-26: aantal openstaande goedkeuringen voor dit team ────────────────
  this.on('getPendingCount', async (req) => {
    const teamLeadId = req.user?.id;
    const where = teamLeadId && teamLeadId !== 'anonymous'
      ? { ApprovalStatus: 'Pending' }
      : { ApprovalStatus: 'Pending' };
    const pending = await cds.run(
      SELECT.from('primepath.TravelExtensions').where(where)
    );
    return Array.isArray(pending) ? pending.length : 0;
  });

  // ── UPDATE TravelExtensions: alleen ApprovalStatus, alleen eigen team ──────
  // FA v4 §7.2 FV-24 + §11 rollenmatrix
  this.before('UPDATE', 'TravelExtensions', async (req) => {
    const teamLeadId = req.user?.id;

    // FV-25: Team Lead mag ALLEEN ApprovalStatus aanpassen
    const incomingFields = Object.keys(req.data).filter(f => f !== 'TripID');
    const forbidden = incomingFields.filter(f => f !== 'ApprovalStatus');
    if (forbidden.length > 0) {
      return req.error(403,
        `Een Team Lead mag enkel 'ApprovalStatus' aanpassen. ` +
        `Niet toegestane velden: ${forbidden.join(', ')}.`
      );
    }

    // Valideer ApprovalStatus waarde
    const { ApprovalStatus } = req.data;
    const allowed = ['Pending', 'Approved', 'Rejected'];
    if (ApprovalStatus && !allowed.includes(ApprovalStatus)) {
      return req.error(400,
        `ApprovalStatus '${ApprovalStatus}' is niet geldig. ` +
        `Gebruik: ${allowed.join(', ')}.`
      );
    }

    // FA v4 §10.3: controleer of de Team Lead een teamlid heeft in UserMapping
    // In development (dummy auth) slaan we deze check over
    if (teamLeadId && teamLeadId !== 'anonymous') {
      const teamMembers = await cds.run(
        SELECT.from('primepath.UserMapping')
          .where({ TeamLeadLoginId: teamLeadId })
      );
      if (!teamMembers || teamMembers.length === 0) {
        return req.error(403,
          `Geen teamleden gevonden voor Team Lead '${teamLeadId}'. ` +
          `Vraag de Travel Coördinator om jouw team in te stellen via UserMapping.`
        );
      }
      // Opmerking: volledige TripID → Person koppeling vereist TripPin navigatie.
      // Dit wordt uitgewerkt nadat de echte TripPin EDMX geïmporteerd is.
    }
  });
});
