import test, { after } from "node:test";
import assert from "node:assert/strict";
import { dumpAllTables, IN_ZIP, postSave, startWorker, validSave } from "./worker-harness.mjs";
import { devPage } from "./dev-page.mjs";
import { simulatePage } from "./page-sim.mjs";

const { mf, db, outbound } = await startWorker();
after(() => mf.dispose());

const IP = "203.0.113.77"; // TEST-NET-3
const UA = "S17-Probe-Agent/1.0 (dummy)";
const PROTEIN = "187";
const CALORIES = "2913";

/** A value appears in a row when some column's value is it, or contains it as a whole number. */
const holds = (dump, value) =>
  Object.values(dump).some((table) =>
    table.some((row) => Object.values(row).some((v) => v !== null && new RegExp(`(^|\\D)${value}(\\D|$)`).test(String(v)))),
  );

test("S17: the IP, a user agent and calculator values are in no table and no request body", async () => {
  // The page: calculator filled, then a save — the body it sends is what reaches the Worker.
  const page = simulatePage(await devPage(), { hash: "#signature-14" });
  page.type("share-protein", PROTEIN);
  page.type("share-calories", CALORIES);
  assert.ok(page.el("share-targets").textContent.includes("187 g protein"), "control: the calculator took the values");
  page.type("save-email", "dummy-s17@example.com");
  page.type("save-zip", IN_ZIP);
  page.el("save-form").dispatch("submit");
  await page.settle();
  assert.equal(page.record.fetches.length, 1, "one request: the save");
  const sent = page.record.fetches[0].init.body;
  assert.deepEqual(Object.keys(JSON.parse(sent)).sort(), ["consent_marketing", "email", "event_id", "kind", "turnstile_token", "wording_version", "zip"]);
  for (const v of [PROTEIN, CALORIES, "2,913"]) assert.ok(!sent.includes(v), `the request body carries no ${v}`);

  const res = await postSave(mf, JSON.parse(sent), { ip: IP, headers: { "User-Agent": UA } });
  assert.equal(res.status, 200);
  const { tables, dump, text } = await dumpAllTables(db);
  assert.deepEqual(tables.sort(), ["save_contacts", "saves"], "the dump covers every table there is");
  assert.ok(text.includes("dummy-s17@example.com"), "control: the dump does contain what was stored");
  assert.ok(!text.includes(IP) && !text.includes("203.0.113"), "the IP (or its prefix) is in no table");
  assert.ok(!text.includes("S17-Probe-Agent"), "the user agent is in no table");
  for (const v of [PROTEIN, CALORIES]) assert.ok(!holds(dump, v), `no column holds ${v}`);
  const columns = Object.values(dump).flatMap((t) => Object.keys(t[0] ?? {}));
  assert.ok(!columns.some((c) => /(^|_)ip($|_)|agent|protein|calor|target|plan/i.test(c)), `no column for them: ${columns}`);

  const verify = outbound.filter((o) => /siteverify/.test(o.url));
  assert.equal(verify.length, 1);
  assert.ok(!verify[0].body.includes(IP) && !verify[0].body.includes(UA), "not sent to Turnstile either");
});

test("S17b: the IP is the rate-limit key — the sixth save in a minute from one IP gets 429", async () => {
  const ip = "203.0.113.200";
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await postSave(mf, validSave({ email: `dummy-s17-${i}@example.com` }), { ip })).status);
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
  assert.equal((await postSave(mf, validSave({ email: "dummy-s17-x@example.com" }), { ip: "203.0.113.201" })).status, 200, "another IP is unaffected");
});
