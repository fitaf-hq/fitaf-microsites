// Step 1 of the scheduled Worker (SPEC-rung4 § 6): send what is due. Codes already redeemed are
// suppressed; the rest go to the Sender. A /confirm token is minted per message that carries a
// confirmation link, and its hash is stored only once the Sender accepts the message.
// Returns counts only.
import { e1, ex } from "./messages.js";
import { tokenHash, newToken } from "./token.js";

export const DUE_SQL =
  "SELECT s.save_id, s.kind, s.event_id, s.offer_code, s.offer_id, c.email, c.zip, c.consent_marketing " +
  "FROM saves s JOIN save_contacts c ON c.save_id = s.save_id " +
  "WHERE s.message_state = 'scheduled' AND s.send_at <= ? ORDER BY s.send_at, s.save_id";

const MESSAGED = "state = CASE WHEN state = 'saved' THEN 'messaged' ELSE state END";
const SET_OUTCOME_SQL =
  `UPDATE saves SET message_state = ?1, ${MESSAGED}, state_at = ?2 ` +
  "WHERE save_id = ?3 AND message_state = 'scheduled'";
const SET_TOKEN_SQL = "UPDATE save_contacts SET confirm_token_hash = ?1 WHERE save_id = ?2";

function messageFor(row, token, { offers, events, siteUrl, unconfirmedDays }) {
  if (row.kind === "expansion") return ex({ to: row.email, zip: row.zip, siteUrl, token, unconfirmedDays });
  const offer = offers.find((o) => o.id === row.offer_id);
  const event = events.find((e) => e.id === row.event_id);
  return e1({ to: row.email, code: row.offer_code, offer, event, siteUrl, token });
}

/**
 * `db` is a D1 binding; `now` an ISO UTC string. `context` = { offers, events, siteUrl, unconfirmedDays }.
 */
export async function sendDue(db, { now, sender, redemptions, context }) {
  const due = (await db.prepare(DUE_SQL).bind(now).all()).results;
  const codes = due.filter((r) => r.kind === "offer").map((r) => r.offer_code);
  const redeemed = new Set(codes.length ? await redemptions.redeemed(codes) : []);
  const counts = { due: due.length, suppressed: 0, sent: 0, failed: 0, deferred: 0 };

  for (const row of due) {
    if (row.kind === "offer" && redeemed.has(row.offer_code)) {
      await db.prepare(SET_OUTCOME_SQL).bind("suppressed", now, row.save_id).run();
      counts.suppressed++;
      continue;
    }
    const token = row.kind === "expansion" || row.consent_marketing === 1 ? newToken() : null;
    const outcome = await sender.send(messageFor(row, token, context));
    if (outcome === "sent") {
      const stmts = [db.prepare(SET_OUTCOME_SQL).bind("sent", now, row.save_id)];
      if (token) stmts.push(db.prepare(SET_TOKEN_SQL).bind(await tokenHash(token), row.save_id));
      await db.batch(stmts);
      counts.sent++;
    } else if (outcome === "failed") {
      await db.prepare(SET_OUTCOME_SQL).bind("failed", now, row.save_id).run();
      counts.failed++;
    } else {
      counts.deferred++; // left `scheduled`: the next run tries again
    }
  }
  return counts;
}
