import test, { after } from "node:test";
import assert from "node:assert/strict";
import { sendDue } from "../src/worker/send-due.js";
import { tokenHash } from "../src/worker/token.js";
import { linkIn, startWorker } from "./worker-harness.mjs";
import { callSendDue, DELIVERED, idempotentResend, MINUTE_MS, resendSender, saveOffers, saveRow } from "./rung5-fixture.mjs";
import { SEND_LEASE_MS } from "../src/worker/send-due.js";

const { mf, db } = await startWorker();
after(() => mf.dispose());

/** The D1 binding, except that its first batch — the `sent` write — is lost. */
function losingFirstBatch(d1) {
  let lost = false;
  return {
    prepare: (...args) => d1.prepare(...args),
    batch: async (statements) => {
      if (!lost) {
        lost = true;
        throw new Error("simulated: the write after an accepted send is lost");
      }
      return d1.batch(statements);
    },
  };
}

test("M11: an accepted send whose database write is lost, then a retry -> the replayed response marks it `sent`", async () => {
  const to = DELIVERED.replace("@", "+m11@");
  const nowMs = await saveOffers(mf, db, [to], { consent_marketing: true });
  const resend = idempotentResend();
  const sender = resendSender(resend.fetch);

  await assert.rejects(() => callSendDue(sendDue, losingFirstBatch(db), nowMs, sender), /write after an accepted send is lost/);
  const lost = await saveRow(db, to);
  assert.equal(resend.delivered(), 1, "control: Resend accepted (and delivered) the first request");
  assert.equal(lost.message_state, "scheduled", "control: the database never heard");
  assert.equal(lost.confirm_token_hash, null);
  assert.notEqual(lost.send_lease_until, null, "the claim is left behind");

  // Within the lease a run leaves it alone; after it, the retry goes out under the same key and body.
  assert.equal((await callSendDue(sendDue, db, nowMs + 5 * MINUTE_MS, sender)).inflight, 1);
  const retry = await callSendDue(sendDue, db, nowMs + SEND_LEASE_MS + MINUTE_MS, sender);
  assert.equal(retry.sent, 1, "the replayed response is an acceptance");
  assert.equal(retry.failed, 0, "not a 409");
  assert.equal(resend.calls.length, 2, "two requests");
  assert.equal(resend.delivered(), 1, "one email");

  const row = await saveRow(db, to);
  assert.equal(row.message_state, "sent");
  assert.equal(row.provider_message_id, "m11-1", "the FIRST request's id, replayed");
  const token = linkIn(resend.calls[0].body.text, "/confirm/");
  assert.equal(row.confirm_token_hash, await tokenHash(token), "the delivered email's link works: its token's hash is stored");
});
