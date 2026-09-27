// Writing one claim: a `claims` row and its `contacts` row, in one D1 batch (atomic).
// Shared by the Worker and the dummy-data seeder so both write the same shape.
import { newOfferCode } from "./offer-code.js";

export const INSERT_CLAIM_SQL =
  "INSERT INTO claims (claim_id, event_id, plan, meals_per_week, offer_code, created_at, export_state) " +
  "VALUES (?, ?, ?, ?, ?, ?, ?)";
export const INSERT_CONTACT_SQL =
  "INSERT INTO contacts (claim_id, email, mobile_e164, first_name, zip, consent_email, consent_sms, " +
  "consent_wording_version, consent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

const MAX_CODE_ATTEMPTS = 5;

/** A validated claim -> the two rows' parameter lists. `now` is an ISO UTC string. */
export function claimRows(claim, { eventId, now, claimId, offerCode, exportState = "pending" }) {
  const claimRow = [claimId, eventId, claim.plan, claim.meals_per_week, offerCode, now, exportState];
  const contactRow = [
    claimId,
    claim.email,
    claim.mobile_e164,
    claim.first_name,
    claim.zip,
    claim.consent_email ? 1 : 0,
    claim.consent_sms ? 1 : 0,
    claim.wording_version,
    now,
  ];
  return { claimRow, contactRow };
}

const isCodeCollision = (err) => /UNIQUE constraint failed: claims\.offer_code/.test(String(err?.message));

/** Insert through a D1 binding; a code collision (1 in 2^40 per pair) draws a new code. */
export async function insertClaim(db, claim, { eventId, now = new Date().toISOString() }) {
  const claimId = crypto.randomUUID();
  for (let attempt = 1; ; attempt++) {
    const { claimRow, contactRow } = claimRows(claim, { eventId, now, claimId, offerCode: newOfferCode() });
    try {
      await db.batch([
        db.prepare(INSERT_CLAIM_SQL).bind(...claimRow),
        db.prepare(INSERT_CONTACT_SQL).bind(...contactRow),
      ]);
      return;
    } catch (err) {
      if (!isCodeCollision(err) || attempt >= MAX_CODE_ATTEMPTS) throw err;
    }
  }
}
