// SP8 (SPEC-save-offer-production.md § 4 item 5, § 5): the erase CLI reaches production — `scripts/erase.mjs --env
// prod`, a dry run unless `--apply`, run by the operator with the d1 token, never by the page. Its database is the
// production binding's, fitaf-leads-prod, and any other name is refused; development's stays fitaf-leads-dev. The CLI's
// wrangler commands are never run here (no wrangler in the cases): its arguments are checked, and the erase itself (the
// same module, src/worker/erase.js) is run as S16 runs it, on the production Worker's database in Miniflare.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { devConfig, ROOT } from "../build.mjs";
import { databaseFor, eraseArgs, ERASE_DATABASES, productionConfig, wranglerD1Args } from "../scripts/d1-cli.mjs";
import { erase } from "../src/worker/erase.js";
import { validateSave } from "../src/worker/validate-save.js";
import { insertRows, saveRows } from "../scripts/dummy-saves.mjs";
import { d1Adapter, dumpAllTables, rows, startWorker, validSave } from "./worker-harness.mjs";

test("SP8: the database of each environment: production's binding is fitaf-leads-prod, development's fitaf-leads-dev", async () => {
  assert.deepEqual(ERASE_DATABASES, { dev: "fitaf-leads-dev", prod: "fitaf-leads-prod" });
  assert.equal(databaseFor("prod", await productionConfig()), "fitaf-leads-prod");
  assert.equal(databaseFor("dev", await devConfig()), "fitaf-leads-dev");
});

test("SP8: any other database name, environment or binding is refused", () => {
  const named = (name) => ({ d1_databases: name ? [{ binding: "DB", database_name: name }] : [] });
  assert.throws(() => databaseFor("prod", named("fitaf-leads-dev")), /refusing: the prod D1 binding is fitaf-leads-dev, not fitaf-leads-prod/);
  assert.throws(() => databaseFor("dev", named("fitaf-leads-prod")), /refusing: the dev D1 binding is fitaf-leads-prod, not fitaf-leads-dev/);
  assert.throws(() => databaseFor("prod", named("anything-else")), /refusing/);
  assert.throws(() => databaseFor("prod", named(null)), /refusing: the prod D1 binding is undefined/);
  assert.throws(() => databaseFor("staging", named("fitaf-leads-prod")), /refusing: unknown --env staging \(dev or prod\)/);
});

test("SP8: the wrangler command — production has no --env, development --env dev; the target as given", () => {
  assert.deepEqual(wranglerD1Args("prod", "fitaf-leads-prod", "--remote", ["--json", "--command", "SELECT 1"]), ["d1", "execute", "fitaf-leads-prod", "--remote", "--json", "--command", "SELECT 1"]);
  assert.deepEqual(wranglerD1Args("dev", "fitaf-leads-dev", "--local", ["--json"]), ["d1", "execute", "fitaf-leads-dev", "--env", "dev", "--local", "--json"]);
});

test("SP8: the arguments — a dry run unless --apply; --env dev by default; --env prod by name", () => {
  assert.deepEqual(eraseArgs(["--env", "prod", "--email", "dummy@example.com", "--remote"]), { env: "prod", email: "dummy@example.com", dryRun: true, target: "--remote" });
  assert.deepEqual(eraseArgs(["--env", "prod", "--email", "dummy@example.com", "--remote", "--apply"]).dryRun, false);
  assert.equal(eraseArgs(["--email", "dummy@example.com"]).env, "dev", "development by default, as before");
  assert.throws(() => eraseArgs(["--env"]), /--env needs dev or prod/);
  assert.throws(() => eraseArgs(["--apply", "--dry-run"]), /pass --dry-run or --apply, not both/);
});

test("SP8: the CLI refuses before any database is touched — no --email, an unknown --env", () => {
  for (const [args, message] of [
    [["--env", "prod", "--remote"], /erase needs --email <address>/],
    [["--env", "staging", "--email", "dummy@example.com"], /unknown --env staging/],
  ]) {
    const res = spawnSync(process.execPath, [join(ROOT, "scripts", "erase.mjs"), ...args], { encoding: "utf8" });
    assert.notEqual(res.status, 0, args.join(" "));
    assert.match(res.stderr, message);
    assert.doesNotMatch(res.stdout + res.stderr, /d1 execute/);
  }
});

test("SP8: erase on the production Worker's database — a dry run counts only; --apply as S16", async () => {
  const { mf, db } = await startWorker({ worker: "production" });
  try {
    const target = saveRows(validateSave(validSave({ email: "dummy-sp8@example.com" })));
    const bystander = saveRows(validateSave(validSave({ email: "dummy-sp8-other@example.com" })));
    await insertRows(db, [target, bystander]);
    const before = await dumpAllTables(db);
    assert.deepEqual(await erase(d1Adapter(db), { email: "dummy-sp8@example.com" }), { dry_run: true, contacts: 1, messages_to_cancel: 1 });
    assert.equal((await dumpAllTables(db)).text, before.text, "a dry run changes nothing");
    const now = "2026-10-21T16:00:00.000Z";
    assert.deepEqual(await erase(d1Adapter(db), { email: "DUMMY-SP8@example.com", dryRun: false, now }), { dry_run: false, contacts: 1, messages_to_cancel: 1 });
    const [save] = await rows(db, "SELECT message_state, state, state_at FROM saves WHERE save_id = ?", target.saveRow.save_id);
    assert.deepEqual(save, { message_state: "cancelled", state: "erased", state_at: now });
    assert.equal((await rows(db, "SELECT * FROM save_contacts WHERE save_id = ?", target.saveRow.save_id)).length, 0, "the contact is gone");
    assert.equal((await rows(db, "SELECT * FROM save_contacts WHERE email = 'dummy-sp8-other@example.com'")).length, 1, "a bystander untouched");
  } finally {
    await mf.dispose();
  }
});
