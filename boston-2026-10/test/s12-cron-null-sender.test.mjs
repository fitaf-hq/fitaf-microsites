import test, { after } from "node:test";
import assert from "node:assert/strict";
import { runSchedule } from "../src/worker/scheduled.js";
import { NullRedemptions, NullSender } from "../src/worker/senders.js";
import { dumpAllTables, NEAR_ZIP, postSave, rows, startWorker, validSave } from "./worker-harness.mjs";

const { mf, db, outbound, vars } = await startWorker();
after(() => mf.dispose());

/** Every leaf of a result is a count (or the dry-run flag): no address, code, id or token. */
function assertCountsOnly(value, path = "result") {
  if (typeof value === "number") return assert.ok(Number.isInteger(value) && value >= 0, path);
  if (typeof value === "boolean") return;
  assert.equal(typeof value, "object", `${path} is a count, not ${JSON.stringify(value)}`);
  for (const [k, v] of Object.entries(value)) assertCountsOnly(v, `${path}.${k}`);
}

test("S12: the cron with NullSender -> nothing sent; each message stays `scheduled`; counts only", async () => {
  await postSave(mf, validSave({ email: "dummy-n1@example.com", consent_marketing: true }));
  await postSave(mf, validSave({ email: "dummy-n2@example.com" }));
  await postSave(mf, validSave({ kind: "expansion", email: "dummy-n3@example.com", zip: NEAR_ZIP }));
  const latest = Math.max(...(await rows(db, "SELECT send_at FROM saves")).map((r) => Date.parse(r.send_at)));
  const before = await dumpAllTables(db);
  const outboundBefore = outbound.length;

  // The real scheduled() handler, as Cloudflare's cron calls it, after every message is due.
  const worker = await mf.getWorker();
  const outcome = await worker.scheduled({ cron: "*/5 * * * *", scheduledTime: new Date(latest + 60_000) });
  assert.equal(outcome.outcome, "ok");
  assert.equal(outbound.length, outboundBefore, "no request left the Worker");
  const afterDump = await dumpAllTables(db);
  assert.deepEqual(afterDump.dump, before.dump, "every row as it was: scheduled, saved, no token minted");
  assert.deepEqual([...new Set(afterDump.dump.saves.map((s) => s.message_state))], ["scheduled"]);

  // The same steps, called directly, to read what the handler reports.
  const result = await runSchedule({ DB: db, SITE_URL: vars.SITE_URL }, {
    nowMs: latest + 60_000,
    sender: new NullSender(),
    redemptions: new NullRedemptions(),
  });
  assertCountsOnly(result);
  assert.deepEqual(result.send, { due: 3, suppressed: 0, sent: 0, failed: 0, deferred: 3, held: 0, retrying: 0, inflight: 0 });
  assert.equal((await dumpAllTables(db)).text, before.text);
});
