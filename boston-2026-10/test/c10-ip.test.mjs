import test, { after } from "node:test";
import assert from "node:assert/strict";
import { dumpAllTables, postClaim, startWorker, validBody } from "./worker-harness.mjs";

const { mf, db, outbound } = await startWorker();
after(() => mf.dispose());

const IP = "203.0.113.77"; // TEST-NET-3

test("C10: the IP appears in no table (and is not sent to Turnstile)", async () => {
  const res = await postClaim(mf, validBody({ mobile: "617-555-0177" }), { ip: IP });
  assert.equal(res.status, 200);
  const { tables, text } = await dumpAllTables(db);
  assert.deepEqual(tables.sort(), ["claims", "contacts"], "the dump covers every table there is");
  assert.ok(text.includes("dummy-c@example.com"), "control: the dump does contain what was stored");
  assert.ok(!text.includes(IP), "the IP is in no table");
  assert.ok(!text.includes("203.0.113"), "not even its prefix");
  assert.equal(outbound.length, 1, "one outbound call: siteverify");
  assert.ok(!outbound[0].body.includes(IP), "the IP is not sent to siteverify");
});

test("C10b: the IP is the rate-limit key — the sixth claim in a minute from one IP gets 429", async () => {
  const ip = "203.0.113.200";
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await postClaim(mf, validBody(), { ip })).status);
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
  assert.equal((await postClaim(mf, validBody(), { ip: "203.0.113.201" })).status, 200, "another IP is unaffected");
});
