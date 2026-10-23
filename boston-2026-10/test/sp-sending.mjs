// Shared by SP7 and its mutant (SPEC-save-offer-production.md § 4 item 4). Not a test file itself.
import assert from "node:assert/strict";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { RESEND_URL } from "../src/worker/resend-sender.js";
import { DUMMY_KEY, stubFetch } from "./rung5-fixture.mjs";
import { TEST_CONFIRM_TOKEN_KEY } from "./worker-harness.mjs";

/** wrangler.jsonc's top-level (production) vars, as wrangler reads them. */
export async function productionVars() {
  const { unstable_readConfig } = await import("wrangler");
  return unstable_readConfig({ config: join(ROOT, "wrangler.jsonc") }, { hideWarnings: true }).vars;
}

/** A message as send-due.js hands a Sender one (a dummy address). */
export const MESSAGE = Object.freeze({ to: "dummy-sp7@example.com", subject: "s", html: "<p>h</p>", text: "t", saveId: "sp7-save", template: "E1" });

/** SP7: with production's vars, the key and NO allowlist, `chooseSender` gives a sender that sends: one request to
 *  Resend, for the message's address, accepted. */
export async function assertProductionSends(chooseSender) {
  const vars = await productionVars();
  const { fetch, calls } = stubFetch(() => Response.json({ id: "sp7-accepted" }));
  const env = { ...vars, MAIL_FROM: "Fit AF <offers-sp7@example.com>", RESEND_API_KEY: DUMMY_KEY, CONFIRM_TOKEN_KEY: TEST_CONFIRM_TOKEN_KEY };
  assert.ok(!("SEND_ALLOWLIST" in env), "control: no allowlist");
  const outcome = await chooseSender(env, { fetch }).send(MESSAGE);
  assert.equal(calls.length, 1, "production sends: one request");
  assert.equal(calls[0].url, RESEND_URL);
  assert.deepEqual(calls[0].body.to, [MESSAGE.to]);
  assert.deepEqual(outcome, { outcome: "sent", providerMessageId: "sp7-accepted" });
}
