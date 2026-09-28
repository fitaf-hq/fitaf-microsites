// Writing a save (SPEC-rung4 §§ 3–4): a `saves` row and its `save_contacts` row, or — if this
// (event_id, kind, lower(email)) already has a live save — an update of that one. One D1 batch, which
// D1 runs as one transaction, so two concurrent saves of one address cannot both insert.
//
// ⭐ A repeat never draws a second code. A new tick becomes pending; an untick withdraws nothing.
import { newOfferCode } from "./offer-code.js";

const MAX_CODE_ATTEMPTS = 5;

/** The live save an address already has for an event and kind (its contact still exists), as a
 *  subquery over numbered parameters: `?e` the event id, `?k` the kind, `?m` the email. */
const match = (e, k, m) =>
  "SELECT s.save_id FROM saves s JOIN save_contacts c ON c.save_id = s.save_id " +
  `WHERE s.event_id = ?${e} AND s.kind = ?${k} AND lower(c.email) = lower(?${m})`;

// A repeat: the ZIP (and for an expansion save its ring) follow the latest save. A tick given now —
// where there was none, or it had been withdrawn — is a NEW consent: pending, at this wording.
const NEW_TICK = "?2 = 1 AND (consent_marketing = 0 OR withdrawn_at IS NOT NULL)";
export const UPDATE_CONTACT_SQL =
  "UPDATE save_contacts SET zip = ?1, " +
  `consent_at = CASE WHEN ${NEW_TICK} THEN ?3 ELSE consent_at END, ` +
  `wording_version = CASE WHEN ${NEW_TICK} THEN ?4 ELSE wording_version END, ` +
  "confirmed_at = CASE WHEN ?2 = 1 AND withdrawn_at IS NOT NULL THEN NULL ELSE confirmed_at END, " +
  "withdrawn_at = CASE WHEN ?2 = 1 THEN NULL ELSE withdrawn_at END, " +
  "consent_marketing = MAX(consent_marketing, ?2) " +
  `WHERE save_id IN (${match(5, 6, 7)})`;

export const UPDATE_RING_SQL = `UPDATE saves SET ring = ?1 WHERE save_id IN (${match(2, 3, 4)})`;

export const INSERT_SAVE_SQL =
  "INSERT INTO saves (save_id, event_id, kind, offer_code, offer_id, ring, reissued_from, created_at, send_at, " +
  "message_state, state, state_at) SELECT ?1, ?2, ?3, ?4, ?5, ?6, NULL, ?7, ?8, 'scheduled', 'saved', ?7 " +
  `WHERE NOT EXISTS (${match(2, 3, 9)})`;

export const INSERT_CONTACT_SQL =
  "INSERT INTO save_contacts (save_id, email, zip, consent_marketing, consent_expansion, wording_version, consent_at) " +
  "SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7 WHERE EXISTS (SELECT 1 FROM saves WHERE save_id = ?1)";

/**
 * The parameters of the four statements for one validated save. `now` is an ISO UTC string; `sendAt`
 * is the ISO UTC instant the message goes (next morning for an offer, now for an expansion).
 */
export function saveStatements(save, { saveId, offerCode, offerId, now, sendAt }) {
  const consent = save.consent_marketing ? 1 : 0;
  return [
    [UPDATE_CONTACT_SQL, [save.zip, consent, now, save.wording_version, save.event_id, save.kind, save.email]],
    [UPDATE_RING_SQL, [save.ring, save.event_id, save.kind, save.email]],
    [INSERT_SAVE_SQL, [saveId, save.event_id, save.kind, offerCode, offerId, save.ring, now, sendAt, save.email]],
    [
      INSERT_CONTACT_SQL,
      [saveId, save.email, save.zip, consent, save.kind === "expansion" ? 1 : 0, save.wording_version, now],
    ],
  ];
}

const isCodeCollision = (err) => /UNIQUE constraint failed: saves\.offer_code/.test(String(err?.message));

/** Insert or update through a D1 binding; an offer-code collision (1 in 2^40 per pair) draws again. */
export async function upsertSave(db, save, { offerId, now, sendAt }) {
  const saveId = crypto.randomUUID();
  for (let attempt = 1; ; attempt++) {
    const offerCode = save.kind === "offer" ? newOfferCode() : null;
    const stmts = saveStatements(save, { saveId, offerCode, offerId: save.kind === "offer" ? offerId : null, now, sendAt });
    try {
      await db.batch(stmts.map(([sql, params]) => db.prepare(sql).bind(...params)));
      return;
    } catch (err) {
      if (!isCodeCollision(err) || attempt >= MAX_CODE_ATTEMPTS) throw err;
    }
  }
}
