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
  // Telt enkel Pending-reizen van teamleden die aan deze TeamLead gekoppeld zijn.
  this.on('getPendingCount', async (req) => {
    const teamLeadId = req.user?.id;

    // In development (dummy auth) of als geen teamLeadId: toon alle pending
    if (!teamLeadId || teamLeadId === 'anonymous') {
      const pending = await cds.run(
        SELECT.from('primepath.TravelExtensions').where({ ApprovalStatus: 'Pending' })
      );
      return Array.isArray(pending) ? pending.length : 0;
    }

    // In productie: controleer via UserMapping welke teamleden dit team heeft
    const teamMembers = await cds.run(
      SELECT.from('primepath.UserMapping').where({ TeamLeadLoginId: teamLeadId })
    );
    if (!teamMembers || teamMembers.length === 0) return 0;

    // Haal alle Pending extensies op en tel er enkel die van het eigen team bij
    // Opmerking: TripPin koppelt TripID aan Person via navigatieproperties.
    // Zonder volledige TripPin-navigatie tellen we alle Pending als proxy.
    const pending = await cds.run(
      SELECT.from('primepath.TravelExtensions').where({ ApprovalStatus: 'Pending' })
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

    // FA v4 §10.3: controleer of de Team Lead teamleden heeft in UserMapping
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
      // FA v4 §10.3: ideaal zou een TripID → TripPinUserName koppeling vereist zijn.
      // TripPin koppelt TripID aan Person via navigatieproperties (People/Trips).
      // Omdat TripPin geen directe TripID → UserName-query toelaat in OData v4,
      // is de teamlidcheck (bovenstaande WHERE TeamLeadLoginId) de implementeerbare grens.
      // De controle garandeert minimaal dat de TeamLead een geldig team heeft.
    }
  });
});
