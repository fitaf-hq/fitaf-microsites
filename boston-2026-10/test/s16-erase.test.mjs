import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { erase } from "../src/worker/erase.js";
import { validateSave } from "../src/worker/validate-save.js";
import { insertRows, saveRows } from "../scripts/dummy-saves.mjs";
import { d1Adapter, dumpAllTables, NEAR_ZIP, rows, startWorker, validSave } from "./worker-harness.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

test("S16: erase — a dry run gives counts only; --apply deletes the contact, cancels the unsent message, sets `erased`", async () => {
  const mk = (body, opts) => saveRows(validateSave(validSave(body)), opts);
  const target = [
    mk({ email: "dummy-e1@example.com" }), // unsent: its message is cancelled
    mk({ email: "Dummy-E1@example.com", kind: "expansion", zip: NEAR_ZIP }, { state: "messaged", saveOverrides: { message_state: "sent" } }),
  ];
  const bystander = mk({ email: "dummy-e2@example.com" });
  await insertRows(db, [...target, bystander]);
  const before = await dumpAllTables(db);

  const dry = await erase(d1Adapter(db), { email: "dummy-e1@example.com" });
  assert.deepEqual(dry, { dry_run: true, contacts: 2, messages_to_cancel: 1 }, "counts only");
  assert.ok(!JSON.stringify(dry).includes("dummy-e1"), "the result carries no address");
  assert.equal((await dumpAllTables(db)).text, before.text, "a dry run changes nothing");

  const now = "2026-09-27T16:00:00.000Z";
  const applied = await erase(d1Adapter(db), { email: "DUMMY-E1@EXAMPLE.COM", dryRun: false, now });
  assert.deepEqual(applied, { dry_run: false, contacts: 2, messages_to_cancel: 1 });
  const [unsent, sent] = target.map((t) => t.saveRow.save_id);
  assert.equal((await rows(db, "SELECT * FROM save_contacts WHERE save_id IN (?, ?)", unsent, sent)).length, 0, "contacts gone");
  const saves = Object.fromEntries((await rows(db, "SELECT * FROM saves WHERE save_id IN (?, ?)", unsent, sent)).map((s) => [s.save_id, s]));
  assert.deepEqual([saves[unsent].message_state, saves[unsent].state, saves[unsent].state_at], ["cancelled", "erased", now]);
  assert.deepEqual([saves[sent].message_state, saves[sent].state], ["sent", "erased"], "a sent message stays sent");
  assert.equal(saves[unsent].offer_code, target[0].saveRow.offer_code, "the save row (code, event, dates) remains");

  const other = before.dump.save_contacts.find((c) => c.email === "dummy-e2@example.com");
  assert.deepEqual((await rows(db, "SELECT * FROM save_contacts WHERE email = 'dummy-e2@example.com'"))[0], other, "a bystander untouched");
  assert.deepEqual(await erase(d1Adapter(db), { email: "dummy-e1@example.com" }), { dry_run: true, contacts: 0, messages_to_cancel: 0 });
});

test("S16: the erase CLI refuses to run without --email, before touching any database", () => {
  const res = spawnSync(process.execPath, [join(ROOT, "scripts", "erase.mjs"), "--local"], { encoding: "utf8" });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /erase needs --email <address>/);
  assert.doesNotMatch(res.stdout + res.stderr, /d1 execute/);
});
