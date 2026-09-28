import test, { after } from "node:test";
import assert from "node:assert/strict";
import { chooseSender } from "../src/worker/choose-sender.js";
import { confirmToken } from "../src/worker/confirm-token.js";
import { TOKEN_RE } from "../src/worker/token.js";
import { dumpAllTables, startWorker, TEST_CONFIRM_TOKEN_KEY } from "./worker-harness.mjs";
import { DUMMY_KEY, MAIL_FROM, MINUTE_MS, saveOffers } from "./rung5-fixture.mjs";

// The Resend key and an allowlist admitting the recipient — but no CONFIRM_TOKEN_KEY.
const { mf, db, outbound } = await startWorker({
  bindings: { RESEND_API_KEY: DUMMY_KEY, SEND_ALLOWLIST: "@resend.dev" },
  resend: () => Response.json({ id: "must-not-happen" }),
});
after(() => mf.dispose());

test("M13: no CONFIRM_TOKEN_KEY -> the sender refuses to start (as without MAIL_FROM)", async () => {
  const env = { RESEND_API_KEY: DUMMY_KEY, MAIL_FROM, SEND_ALLOWLIST: "@resend.dev" };
  for (const CONFIRM_TOKEN_KEY of [undefined, "", "too-short"]) {
    assert.throws(() => chooseSender({ ...env, CONFIRM_TOKEN_KEY }), /CONFIRM_TOKEN_KEY/, `refused: ${JSON.stringify(CONFIRM_TOKEN_KEY)}`);
  }
  assert.ok(chooseSender({ ...env, CONFIRM_TOKEN_KEY: TEST_CONFIRM_TOKEN_KEY }), "control: with the key it starts");
  assert.ok(chooseSender({ CONFIRM_TOKEN_KEY: undefined }), "no Resend key: NullSender needs no token key");

  // The token itself: derived, stable, 43 base64url characters, different per save and per key.
  const t = await confirmToken(TEST_CONFIRM_TOKEN_KEY, "save-a");
  assert.match(t, TOKEN_RE);
  assert.equal(await confirmToken(TEST_CONFIRM_TOKEN_KEY, "save-a"), t);
  assert.notEqual(await confirmToken(TEST_CONFIRM_TOKEN_KEY, "save-b"), t);
  assert.notEqual(await confirmToken(`${TEST_CONFIRM_TOKEN_KEY}x`, "save-a"), t);

  // The real scheduled() handler: it fails, and nothing is requested or changed.
  const nowMs = await saveOffers(mf, db, ["delivered+m13@resend.dev"], { consent_marketing: true });
  const before = await dumpAllTables(db);
  const worker = await mf.getWorker();
  const outcome = await worker.scheduled({ cron: "*/5 * * * *", scheduledTime: new Date(nowMs + MINUTE_MS) }).catch((e) => ({ outcome: "exception", e }));
  assert.notEqual(outcome.outcome, "ok", "the cron run refuses");
  assert.equal(outbound.filter((r) => !r.url.includes("siteverify")).length, 0, "nothing requested");
  assert.equal((await dumpAllTables(db)).text, before.text, "nothing changed");
});
