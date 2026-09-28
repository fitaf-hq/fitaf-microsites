// Step 1 of the scheduled Worker (SPEC-rung4 § 6; the outcomes of SPEC-rung5 § 1): send what is due.
// Codes already redeemed are suppressed; the rest go to the Sender. A /confirm token is minted per message
// that carries a confirmation link, and its hash is stored only once the Sender accepts the message.
//
// Each due message is first CLAIMED (a lease in `send_lease_until`), and every outcome clears the claim.
// A run that finds a message already claimed skips it (`inflight`): a message whose request is in flight
// in an earlier run is never requested twice (SPEC-rung5 M9).
//
// Outcomes: sent -> `sent`, Resend's id kept · failed (permanent) -> `failed` · retry (temporary) ->
// attempts + 1, still `scheduled`, and at MAX_SEND_ATTEMPTS -> `failed` · held (not on the allowlist) and
// deferred (NullSender) -> untouched, still `scheduled`. ⛔ A `failed` or `sent` message is never selected
// again, so it can never be re-sent (to any address). Returns counts only.
import { e1, ex } from "./messages.js";
import { tokenHash, newToken } from "./token.js";

export const MAX_SEND_ATTEMPTS = 5;
export const SEND_LEASE_MS = 15 * 60 * 1000; // longer than a cron interval (5 min) and a request's timeout

export const DUE_SQL =
  "SELECT s.save_id, s.kind, s.event_id, s.offer_code, s.offer_id, c.email, c.zip, c.consent_marketing " +
  "FROM saves s JOIN save_contacts c ON c.save_id = s.save_id " +
  "WHERE s.message_state = 'scheduled' AND s.send_at <= ? ORDER BY s.send_at, s.save_id";

const CLAIM_SQL =
  "UPDATE saves SET send_lease_until = ?1 WHERE save_id = ?2 AND message_state = 'scheduled' " +
  "AND (send_lease_until IS NULL OR send_lease_until <= ?3)";
const RELEASE_SQL = "UPDATE saves SET send_lease_until = NULL WHERE save_id = ?1";

const MESSAGED = "state = CASE WHEN state = 'saved' THEN 'messaged' ELSE state END";
const SET_OUTCOME_SQL =
  `UPDATE saves SET message_state = ?1, ${MESSAGED}, state_at = ?2, send_attempts = send_attempts + ?4, ` +
  "provider_message_id = ?5, send_lease_until = NULL WHERE save_id = ?3 AND message_state = 'scheduled'";
// SQLite evaluates every right-hand side against the row's OLD values, so `send_attempts + 1` is the new count.
const GAVE_UP = "send_attempts + 1 >= ?3";
const SET_RETRY_SQL =
  "UPDATE saves SET send_attempts = send_attempts + 1, send_lease_until = NULL, " +
  `message_state = CASE WHEN ${GAVE_UP} THEN 'failed' ELSE message_state END, ` +
  `state = CASE WHEN ${GAVE_UP} AND state = 'saved' THEN 'messaged' ELSE state END, ` +
  `state_at = CASE WHEN ${GAVE_UP} THEN ?2 ELSE state_at END ` +
  "WHERE save_id = ?1 AND message_state = 'scheduled' RETURNING message_state";
const SET_TOKEN_SQL = "UPDATE save_contacts SET confirm_token_hash = ?1 WHERE save_id = ?2";

function messageFor(row, token, { offers, events, siteUrl, unconfirmedDays }) {
  if (row.kind === "expansion") return ex({ to: row.email, zip: row.zip, siteUrl, token, unconfirmedDays });
  const offer = offers.find((o) => o.id === row.offer_id);
  const event = events.find((e) => e.id === row.event_id);
  return e1({ to: row.email, code: row.offer_code, offer, event, siteUrl, token });
}

/** A Sender's answer as { outcome, providerMessageId }: rung 4's senders answer a bare string. */
const normalise = (answer) => (typeof answer === "string" ? { outcome: answer, providerMessageId: null } : answer);

const setOutcome = (db, state, now, row, attempts, providerMessageId = null) =>
  db.prepare(SET_OUTCOME_SQL).bind(state, now, row.save_id, attempts, providerMessageId);

async function claim(db, row, now, nowMs) {
  const lease = new Date(nowMs + SEND_LEASE_MS).toISOString();
  const { meta } = await db.prepare(CLAIM_SQL).bind(lease, row.save_id, now).run();
  return meta.changes === 1;
}

/** Send one claimed message; returns the name of the count it adds to. */
async function sendOne(db, row, { now, sender, context }) {
  const token = row.kind === "expansion" || row.consent_marketing === 1 ? newToken() : null;
  const { outcome, providerMessageId } = normalise(
    await sender.send({ ...messageFor(row, token, context), saveId: row.save_id }),
  );
  if (outcome === "sent") {
    const stmts = [setOutcome(db, "sent", now, row, 1, providerMessageId ?? null)];
    if (token) stmts.push(db.prepare(SET_TOKEN_SQL).bind(await tokenHash(token), row.save_id));
    await db.batch(stmts);
    return "sent";
  }
  if (outcome === "failed") {
    await setOutcome(db, "failed", now, row, 1).run();
    return "failed";
  }
  if (outcome === "retry") {
    const after = await db.prepare(SET_RETRY_SQL).bind(row.save_id, now, MAX_SEND_ATTEMPTS).first();
    return after?.message_state === "failed" ? "failed" : "retrying";
  }
  await db.prepare(RELEASE_SQL).bind(row.save_id).run(); // no request was made: nothing changes
  if (outcome === "held" || outcome === "deferred") return outcome;
  throw new Error(`a Sender answered an unknown outcome`); // the value is not echoed
}

/**
 * `db` is a D1 binding; `now` an ISO UTC string. `context` = { offers, events, siteUrl, unconfirmedDays }.
 */
export async function sendDue(db, { now, sender, redemptions, context }) {
  const nowMs = Date.parse(now);
  const due = (await db.prepare(DUE_SQL).bind(now).all()).results;
  const codes = due.filter((r) => r.kind === "offer").map((r) => r.offer_code);
  const redeemed = new Set(codes.length ? await redemptions.redeemed(codes) : []);
  const counts = { due: due.length, suppressed: 0, sent: 0, failed: 0, deferred: 0, held: 0, retrying: 0, inflight: 0 };

  for (const row of due) {
    if (!(await claim(db, row, now, nowMs))) {
      counts.inflight++; // another run holds it
      continue;
    }
    if (row.kind === "offer" && redeemed.has(row.offer_code)) {
      await setOutcome(db, "suppressed", now, row, 0).run();
      counts.suppressed++;
      continue;
    }
    counts[await sendOne(db, row, { now, sender, context })]++;
  }
  return counts;
}
