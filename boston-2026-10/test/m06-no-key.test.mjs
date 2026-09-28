import test, { after } from "node:test";
import assert from "node:assert/strict";
import { AllowlistSender } from "../src/worker/allowlist.js";
import { chooseSender } from "../src/worker/choose-sender.js";
import { NullSender } from "../src/worker/senders.js";
import { dumpAllTables, startWorker } from "./worker-harness.mjs";
import { DUMMY_KEY, MAIL_FROM, MINUTE_MS, saveOffers } from "./rung5-fixture.mjs";

// No RESEND_API_KEY — but an allowlist that would allow the recipient, so only the missing key stops it.
const { mf, db, outbound } = await startWorker({
  bindings: { SEND_ALLOWLIST: "@example.com" },
  resend: () => Response.json({ id: "must-not-happen" }),
});
after(() => mf.dispose());

test("M6: no key -> NullSender is used; nothing requested", async () => {
  for (const env of [{}, { RESEND_API_KEY: "" }, { SEND_ALLOWLIST: "@example.com", MAIL_FROM }]) {
    assert.ok(chooseSender(env) instanceof NullSender, `no key in ${JSON.stringify(Object.keys(env))}`);
  }
  const chosen = chooseSender({ RESEND_API_KEY: DUMMY_KEY, MAIL_FROM, SEND_ALLOWLIST: "" });
  assert.ok(chosen instanceof AllowlistSender, "control: a key chooses Resend, behind the allowlist");
  assert.throws(() => chooseSender({ RESEND_API_KEY: DUMMY_KEY }), /MAIL_FROM/, "a key without a sender address fails loudly");

  const nowMs = await saveOffers(mf, db, ["dummy-m6@example.com"]);
  const before = await dumpAllTables(db);
  const worker = await mf.getWorker();
  const outcome = await worker.scheduled({ cron: "*/5 * * * *", scheduledTime: new Date(nowMs + MINUTE_MS) });
  assert.equal(outcome.outcome, "ok");
  assert.equal(outbound.length - outbound.filter((r) => r.url.includes("siteverify")).length, 0, "nothing requested");
  assert.equal((await dumpAllTables(db)).text, before.text, "every row as it was (rung 4's NullSender)");
});
