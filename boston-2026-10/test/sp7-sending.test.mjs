// SP7 (SPEC-save-offer-production.md § 4 item 4, § 5): sending in production is not allowlisted — the environment
// decides, by a var fitaf-infra sets for production only (SEND_WITHOUT_ALLOWLIST, "true"; wrangler.jsonc's top level
// mirrors it); development keeps the allowlist and, with none set, still sends nothing (SPEC-rung5-sending.md § 2).
// No request leaves the machine: Resend is a recording stub. The assertion is a function of chooseSender, so
// sp-mutants.test.mjs runs it on a mutant that sends production through the allowlist.
import test from "node:test";
import assert from "node:assert/strict";
import { devConfig } from "../build.mjs";
import { chooseSender } from "../src/worker/choose-sender.js";
import { RESEND_URL } from "../src/worker/resend-sender.js";
import { postSave, rows, startWorker, TEST_CONFIRM_TOKEN_KEY, validSave, NEAR_ZIP } from "./worker-harness.mjs";
import { DUMMY_KEY, MINUTE_MS, stubFetch } from "./rung5-fixture.mjs";
import { assertProductionSends, MESSAGE, productionVars } from "./sp-sending.mjs";

test("SP7: production's vars carry SEND_WITHOUT_ALLOWLIST; development's do not (control)", async () => {
  assert.equal((await productionVars()).SEND_WITHOUT_ALLOWLIST, "true");
  assert.ok(!("SEND_WITHOUT_ALLOWLIST" in (await devConfig()).vars), "development never sets it");
});

test("SP7: production with no allowlist sends (a recording sender)", async () => {
  await assertProductionSends(chooseSender);
});

test("SP7: development with no allowlist sends nothing; a value other than \"true\" keeps the allowlist", async () => {
  const dev = (await devConfig()).vars;
  for (const env of [dev, { ...dev, SEND_WITHOUT_ALLOWLIST: "yes" }, { ...dev, SEND_WITHOUT_ALLOWLIST: "TRUE" }, { ...dev, SEND_WITHOUT_ALLOWLIST: "" }]) {
    const { fetch, calls } = stubFetch(() => Response.json({ id: "must-not-happen" }));
    const sender = chooseSender({ ...env, RESEND_API_KEY: DUMMY_KEY, CONFIRM_TOKEN_KEY: TEST_CONFIRM_TOKEN_KEY }, { fetch });
    const outcome = await sender.send(MESSAGE);
    assert.equal(outcome, "held", `held (${JSON.stringify(env.SEND_WITHOUT_ALLOWLIST)})`);
    assert.equal(calls.length, 0, "nothing requested");
  }
});

test("SP7: the production Worker's cron, with the key and no allowlist, sends what is due (E-X at once)", async () => {
  const { mf, db, outbound, now } = await startWorker({
    worker: "production",
    bindings: { RESEND_API_KEY: DUMMY_KEY, CONFIRM_TOKEN_KEY: TEST_CONFIRM_TOKEN_KEY, MAIL_FROM: "Fit AF <offers-sp7@example.com>" },
    resend: () => Response.json({ id: "sp7-accepted" }),
  });
  try {
    const res = await postSave(mf, validSave({ kind: "expansion", email: "dummy-sp7-ex@example.com", zip: NEAR_ZIP }));
    assert.deepEqual(res.json, { ok: true });
    const worker = await mf.getWorker();
    const outcome = await worker.scheduled({ cron: "*/5 * * * *", scheduledTime: new Date(now + MINUTE_MS) }); // the Worker's clock, the harness's (§ 10.7)
    assert.equal(outcome.outcome, "ok");
    const sent = outbound.filter((r) => r.url === RESEND_URL);
    assert.equal(sent.length, 1, "one message to Resend");
    assert.deepEqual(JSON.parse(sent[0].body).to, ["dummy-sp7-ex@example.com"]);
    assert.deepEqual((await rows(db, "SELECT message_state FROM saves")).map((r) => r.message_state), ["sent"]);
  } finally {
    await mf.dispose();
  }
});
