import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as allowlist from "../src/worker/allowlist.js";
import { rows, startWorker, TEST_CONFIRM_TOKEN_KEY } from "./worker-harness.mjs";
import { assertHeld, DUMMY_KEY, MINUTE_MS, saveOffers } from "./rung5-fixture.mjs";

const direct = await startWorker();
// The real scheduled() handler with the key set and NO allowlist: nothing may be requested.
const unset = await startWorker({
  bindings: { RESEND_API_KEY: DUMMY_KEY, CONFIRM_TOKEN_KEY: TEST_CONFIRM_TOKEN_KEY },
  resend: () => Response.json({ id: "x" }),
});
after(() => Promise.all([direct.mf.dispose(), unset.mf.dispose()]));

test("M4: a recipient not on the allowlist, or the allowlist unset or empty -> held: no request, stays `scheduled`", async () => {
  await assertHeld(allowlist, direct);

  const nowMs = await saveOffers(unset.mf, unset.db, ["dummy-m4-a@example.com", "dummy-m4-b@example.com"]);
  const worker = await unset.mf.getWorker();
  await worker.scheduled({ cron: "*/5 * * * *", scheduledTime: new Date(nowMs + MINUTE_MS) });
  assert.equal(unset.outbound.filter((r) => !r.url.includes("siteverify")).length, 0, "no request left the Worker");
  assert.ok(unset.outbound.length > 0, "control: the harness records outbound requests (the saves' Turnstile checks)");
  const states = await rows(unset.db, "SELECT message_state, send_attempts, send_lease_until FROM saves");
  assert.deepEqual(states, [0, 1].map(() => ({ message_state: "scheduled", send_attempts: 0, send_lease_until: null })));
});

test("M4b: the allowlist's own rules — exact addresses and @domain, case-insensitive, no subdomain", () => {
  const entries = allowlist.parseAllowlist(" Delivered@Resend.dev , @example.org ,, ");
  assert.deepEqual(entries, ["delivered@resend.dev", "@example.org"]);
  const allows = (a) => allowlist.allowlistAllows(entries, a);
  assert.ok(allows("delivered@resend.dev"));
  assert.ok(allows("DELIVERED@resend.DEV"));
  assert.ok(allows("anyone@example.org"));
  assert.ok(!allows("anyone@sub.example.org"), "@domain is that domain, not its subdomains");
  assert.ok(!allows("bounced@resend.dev"), "an exact entry allows only itself");
  assert.ok(!allows("example.org"));
  assert.ok(!allows("x@example.org.evil.test"));
  assert.ok(!allows(undefined));
  for (const unsetValue of [undefined, null, "", " ", ","]) {
    assert.deepEqual(allowlist.parseAllowlist(unsetValue), [], "unset or empty allows nothing");
  }
});
