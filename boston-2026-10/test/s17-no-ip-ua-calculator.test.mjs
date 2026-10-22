import test, { after } from "node:test";
import assert from "node:assert/strict";
import { OFFER_CODE_ALPHABET } from "../src/worker/offer-code.js";
import { dumpAllTables, IN_ZIP, ISO_RE, postSave, startWorker, validSave } from "./worker-harness.mjs";
import { devPage } from "./dev-page.mjs";
import { simulatePage } from "./page-sim.mjs";

const { mf, db, outbound } = await startWorker();
after(() => mf.dispose());

const IP = "203.0.113.77"; // TEST-NET-3
const UA = "S17-Probe-Agent/1.0 (dummy)";
const PROTEIN = "187";
const CALORIES = "2913";

// SPEC-save-offer-production § 10.5 (2026-10-22): the columns the system fills with machine values, each with its exact
// shape. A digit run in one is chance, not a stored value: a UUID's "…-a187b…", an instant's ".187Z" (measured: over 60
// runs these five columns, and no other, held a three-digit whole number, about 2.3 distinct numbers a run, so 187 about
// once in 400 runs). `holds` therefore does not search them; instead each must be EXACTLY its shape (`offShape`), which
// leaves no room in it for an IP, a user agent or a calculator value. Every other column is searched as before.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MACHINE_COLUMNS = {
  "saves.save_id": UUID_RE,
  "saves.reissued_from": UUID_RE,
  "save_contacts.save_id": UUID_RE,
  "saves.offer_code": new RegExp(`^[${OFFER_CODE_ALPHABET}]{8}$`),
  "save_contacts.confirm_token_hash": /^[0-9a-f]{64}$/,
  "saves.created_at": ISO_RE,
  "saves.send_at": ISO_RE,
  "saves.state_at": ISO_RE,
  "saves.send_lease_until": ISO_RE,
  "save_contacts.consent_at": ISO_RE,
  "save_contacts.confirmed_at": ISO_RE,
  "save_contacts.withdrawn_at": ISO_RE,
};
const cells = (dump) =>
  Object.entries(dump).flatMap(([table, rows]) => rows.flatMap((row) => Object.entries(row).map(([column, v]) => ({ name: `${table}.${column}`, v }))));

/** A value appears in a row when some column's value is it, or contains it as a whole number: every column but the
 *  machine columns, which `offShape` holds to their shapes instead. */
const holds = (dump, value) =>
  cells(dump).some(({ name, v }) => v !== null && !(name in MACHINE_COLUMNS) && new RegExp(`(^|\\D)${value}(\\D|$)`).test(String(v)));
/** The machine columns whose value is not exactly its shape. */
const offShape = (dump) => cells(dump).filter(({ name, v }) => v !== null && name in MACHINE_COLUMNS && !MACHINE_COLUMNS[name].test(String(v))).map(({ name }) => name);

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
  const names = new Set(cells(dump).map(({ name }) => name));
  for (const name of Object.keys(MACHINE_COLUMNS)) assert.ok(names.has(name), `control: ${name} is a column of the dump`);
  assert.deepEqual(offShape(dump), [], "every machine column exactly its shape");
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

test("S17c (control, § 10.5): the check still fails on 187 planted in a real column, and on a machine column off its shape; a chance 187 in a machine value is not a finding", async () => {
  await postSave(mf, validSave({ email: "dummy-s17c@example.com" }), { ip: "203.0.113.150" });
  const { dump } = await dumpAllTables(db);
  const clean = () => JSON.parse(JSON.stringify(dump));
  const row = (d, table) => d[table].find((r) => r.save_id === d.saves.find((s) => s.kind === "offer").save_id);
  assert.ok(!holds(dump, PROTEIN) && offShape(dump).length === 0, "control: the dump as stored passes");
  for (const [table, column, value] of [
    ["save_contacts", "wording_version", `v${PROTEIN}-draft`],
    ["save_contacts", "email", `dummy-${PROTEIN}@example.com`],
    ["saves", "event_id", PROTEIN],
    ["saves", "provider_message_id", `msg-${PROTEIN}`],
  ]) {
    const d = clean();
    row(d, table)[column] = value;
    assert.ok(holds(d, PROTEIN), `187 planted in ${table}.${column}: found`);
  }
  for (const [table, column, value] of [
    ["saves", "created_at", PROTEIN],
    ["saves", "save_id", `${PROTEIN}`],
    ["save_contacts", "consent_at", `2026-10-22T13:01:02.000Z ${PROTEIN}`],
  ]) {
    const d = clean();
    row(d, table)[column] = value;
    assert.deepEqual(offShape(d), [`${table}.${column}`], `187 planted in ${table}.${column}: off its shape`);
  }
  // The cause: a machine value that holds 187 by chance, in its exact shape. The check before § 10.5 found it (and failed
  // S17 with "no column holds 187"); the check now does not, and the value is its shape.
  const d = clean();
  row(d, "saves").created_at = "2026-10-22T13:01:02.187Z";
  row(d, "saves").save_id = "0f3c2d1e-a187-4b6c-9d0e-1f2a3b4c5d6e";
  const before = cells(d).some(({ v }) => v !== null && new RegExp(`(^|\\D)${PROTEIN}(\\D|$)`).test(String(v)));
  assert.ok(before, "control: the check before § 10.5 reads a chance 187 as a finding");
  assert.ok(!holds(d, PROTEIN), "a chance 187 in a machine column is not a finding");
  assert.deepEqual(offShape(d), [], "and those values are their shapes");
});
