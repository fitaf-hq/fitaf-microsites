import test, { after } from "node:test";
import assert from "node:assert/strict";
import { MAX_SEND_ATTEMPTS } from "../src/worker/send-due.js";
import { startWorker } from "./worker-harness.mjs";
import { MINUTE_MS, resendSender, saveOffers, saveRow, send, status, stubFetch } from "./rung5-fixture.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

const TEMPORARY = {
  429: status(429, "rate_limit_exceeded"),
  500: status(500, "application_error"),
  "network error": () => {
    throw new TypeError("fetch failed: dummy-m3-network@example.com unreachable"); // text must not travel
  },
  "409 concurrent": status(409, "concurrent_idempotent_requests"),
};

test("M3: 429 · 500 · a network error -> stays `scheduled`, attempts + 1; the fifth -> `failed`", async () => {
  assert.equal(MAX_SEND_ATTEMPTS, 5, "the contract's five");
  for (const [label, respond] of Object.entries(TEMPORARY)) {
    const email = `dummy-m3-${label.replace(/\W+/g, "-")}@example.com`;
    const nowMs = await saveOffers(mf, db, [email]);
    const stub = stubFetch(respond);
    const sender = resendSender(stub.fetch);
    for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
      const counts = await send(db, nowMs + attempt * 5 * MINUTE_MS, sender);
      const row = await saveRow(db, email);
      assert.equal(row.send_attempts, attempt, `${label}: attempt ${attempt} counted`);
      assert.equal(row.send_lease_until, null, `${label}: claim released`);
      if (attempt < MAX_SEND_ATTEMPTS) {
        assert.equal(counts.retrying, 1, `${label}: attempt ${attempt} retrying`);
        assert.equal(row.message_state, "scheduled", `${label}: still scheduled after ${attempt}`);
        assert.equal(row.state, "saved");
      } else {
        assert.equal(counts.failed, 1, `${label}: the fifth fails`);
        assert.equal(counts.retrying, 0);
        assert.equal(row.message_state, "failed");
        assert.equal(row.state, "messaged");
      }
      assert.equal(row.confirm_token_hash, null);
    }
    assert.equal(stub.calls.length, MAX_SEND_ATTEMPTS, `${label}: five requests`);
    await send(db, nowMs + 60 * MINUTE_MS, sender);
    assert.equal(stub.calls.length, MAX_SEND_ATTEMPTS, `${label}: no sixth`);
    // A retry is the same message: one idempotency key across every attempt.
    assert.equal(new Set(stub.calls.map((c) => c.headers["Idempotency-Key"])).size, 1);
  }
});

test("M3b: a temporary failure, then acceptance -> `sent` with the attempts it took", async () => {
  const email = "dummy-m3-recovers@example.com";
  const nowMs = await saveOffers(mf, db, [email]);
  const stub = stubFetch((call, n) => (n === 1 ? status(503, "service_unavailable")() : Response.json({ id: "m3b-id" })));
  const sender = resendSender(stub.fetch);
  assert.equal((await send(db, nowMs, sender)).retrying, 1);
  assert.equal((await send(db, nowMs + 5 * MINUTE_MS, sender)).sent, 1);
  const row = await saveRow(db, email);
  assert.equal(row.message_state, "sent");
  assert.equal(row.send_attempts, 2);
  assert.equal(row.provider_message_id, "m3b-id");
});
