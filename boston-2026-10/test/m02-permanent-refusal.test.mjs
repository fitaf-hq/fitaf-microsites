import test, { after } from "node:test";
import assert from "node:assert/strict";
import { startWorker } from "./worker-harness.mjs";
import { BOUNCED, MINUTE_MS, resendSender, saveOffers, saveRow, send, status, stubFetch } from "./rung5-fixture.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

test("M2: 422 -> `failed` at once; no retry, and never re-sent to a different address", async () => {
  const to = BOUNCED.replace("@", "+m2@");
  const nowMs = await saveOffers(mf, db, [to]);
  const stub = stubFetch(status(422, "missing_required_field"));
  const sender = resendSender(stub.fetch);

  const counts = await send(db, nowMs, sender);
  assert.equal(stub.calls.length, 1);
  assert.equal(counts.failed, 1);
  assert.equal(counts.retrying, 0);
  const row = await saveRow(db, to);
  assert.equal(row.message_state, "failed");
  assert.equal(row.send_attempts, 1);
  assert.equal(row.provider_message_id, null);
  assert.equal(row.confirm_token_hash, null);
  assert.equal(row.send_lease_until, null);

  // No retry on later runs — even with the contact's address changed to another one on the list.
  await db.prepare("UPDATE save_contacts SET email = ? WHERE save_id = ?").bind("delivered+m2@resend.dev", row.save_id).run();
  for (let i = 1; i <= 3; i++) {
    const later = await send(db, nowMs + i * 5 * MINUTE_MS, sender);
    assert.equal(later.due, 0);
  }
  assert.equal(stub.calls.length, 1, "no second request, to any address");

  // Every other permanent 4xx the documentation lists for this endpoint behaves the same.
  for (const [code, name] of [[400, "validation_error"], [401, "missing_api_key"], [403, "validation_error"], [409, "invalid_idempotent_request"]]) {
    const email = `dummy-m2-${code}@example.com`;
    const at = await saveOffers(mf, db, [email]);
    const s = stubFetch(status(code, name));
    const c = await send(db, at, resendSender(s.fetch));
    assert.equal(c.failed, 1, `${code} ${name} -> failed`);
    assert.equal((await saveRow(db, email)).message_state, "failed");
  }
});
