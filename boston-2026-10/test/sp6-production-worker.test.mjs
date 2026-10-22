// SP6 (SPEC-save-offer-production.md § 4 items 2-3, § 5): the production Worker (wrangler.jsonc's top level: its `main`,
// src/worker/site.js, its D1, rate limits and vars) with `production` true serves rung 4's routes and its cron as the
// development Worker does: S1-S17's cases run against it (worker-harness.mjs's `worker: "production"`, set for their
// files by BOSTON_SAVE_WORKER=production in a child `node --test`); with false, /api/save is not served (the assets
// answer it, as before this contract) and the database is never touched. § 4.3's interface: the binding DB to
// fitaf-leads-prod, the two rate limiters as development's, the cron every 5 minutes, the vars SITE_URL (eatfitaf.com),
// MAIL_FROM and TURNSTILE_SITE_KEY; the secrets are not in the file.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { devConfig, ROOT } from "../build.mjs";
import { count, postSave, startWorker, validSave } from "./worker-harness.mjs";

async function productionConfig() {
  const { unstable_readConfig } = await import("wrangler");
  return unstable_readConfig({ config: join(ROOT, "wrangler.jsonc") }, { hideWarnings: true });
}

test("SP6 (§ 4.3): wrangler.jsonc's production mirror — the interface names with fitaf-infra", async () => {
  const prod = await productionConfig();
  const dev = await devConfig();
  assert.equal(relative(ROOT, prod.main), "src/worker/site.js", "production's entry is unchanged");
  assert.deepEqual(prod.d1_databases.map((d) => [d.binding, d.database_name, d.migrations_dir]), [["DB", "fitaf-leads-prod", "migrations"]]);
  const limits = (cfg) => cfg.ratelimits.map((r) => [r.name, r.simple]);
  assert.deepEqual(limits(prod), limits(dev), "the rate-limit bindings as development's");
  assert.deepEqual(prod.triggers.crons, ["*/5 * * * *"], "the cron every 5 minutes, as development's");
  assert.deepEqual(dev.triggers.crons, prod.triggers.crons);
  assert.equal(prod.vars.SITE_URL, "https://eatfitaf.com");
  for (const name of ["MAIL_FROM", "TURNSTILE_SITE_KEY"]) assert.ok(name in prod.vars, `vars.${name}`);
  for (const secret of ["RESEND_API_KEY", "CONFIRM_TOKEN_KEY", "TURNSTILE_SECRET_KEY", "SEND_ALLOWLIST"]) {
    assert.ok(!(secret in prod.vars), `${secret} is a secret, never in the file`);
  }
  assert.deepEqual(prod.observability, { enabled: false }, "observability off, as development's (rung 4 § 7)");
});

test("SP6: production true — a save is served by the production Worker, and stored in its DB", async () => {
  const { mf, db, main } = await startWorker({ worker: "production" });
  try {
    assert.equal(main, "src/worker/site.js", "control: production's entry");
    const res = await postSave(mf, validSave({ email: "dummy-sp6@example.com" }));
    assert.equal(res.status, 200);
    assert.deepEqual(res.json, { ok: true });
    assert.equal(await count(db, "saves"), 1);
  } finally {
    await mf.dispose();
  }
});

test("SP6: production false — /api/save, /confirm and /o are not served: the assets answer, the database is untouched", async () => {
  const { mf, db, assetRequests } = await startWorker({ worker: "production", production: false });
  try {
    const res = await mf.dispatchFetch("http://localhost/api/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(validSave()) });
    assert.equal(res.status, 404, "the assets' answer");
    await res.arrayBuffer();
    for (const path of ["/confirm/abc", "/o/ABCD2345"]) {
      const r = await mf.dispatchFetch(`http://localhost${path}`);
      assert.equal(r.status, 404, path);
      await r.arrayBuffer();
    }
    assert.deepEqual(assetRequests, ["POST /api/save", "GET /confirm/abc", "GET /o/ABCD2345"], "each request handed to the assets");
    assert.equal(await count(db, "saves"), 0);
  } finally {
    await mf.dispose();
  }
});

test("SP6: S1-S17's cases, run against the production Worker with production true — all pass", async () => {
  const files = (await readdir(join(ROOT, "test"))).filter((f) => /^s(0[1-9]|1[0-7])[a-z]?-.*\.test\.mjs$/.test(f)).sort();
  assert.equal(files.length, 18, "S1-S17 (and S14b)");
  const dir = await mkdtemp(join(tmpdir(), "boston-sp6-"));
  const log = join(dir, "workers.jsonl");
  try {
    // A child `node --test` of its own: without this runner's NODE_TEST_CONTEXT, reporting TAP.
    const { NODE_TEST_CONTEXT, ...env } = process.env;
    const r = spawnSync(process.execPath, ["--test", "--test-reporter=tap", "--test-concurrency=1", ...files.map((f) => join(ROOT, "test", f))], {
      env: { ...env, BOSTON_SAVE_WORKER: "production", BOSTON_SAVE_WORKER_LOG: log },
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    const tally = (name) => Number(new RegExp(`^# ${name} (\\d+)$`, "m").exec(r.stdout)?.[1]);
    assert.equal(r.status, 0, `the S cases against production: ${r.stdout.split("\n").filter((l) => /^not ok|# fail/.test(l)).join("; ")}`);
    assert.equal(tally("fail"), 0);
    // 38: S1-S17's cases as the development Worker runs them (all 18 files, measured 2026-10-21); none skipped here. 39
    // since SPEC-save-offer-production § 10.5 added S17c (its control).
    assert.equal(tally("tests"), 39, "every case ran");
    assert.equal(tally("pass"), 39, "every case passed");
    const started = (await readFile(log, "utf8")).trim().split("\n").map((l) => JSON.parse(l));
    assert.ok(started.length >= 17, `a production Worker started for each file that starts one (${started.length})`);
    for (const w of started) assert.deepEqual(w, { main: "src/worker/site.js", database: "fitaf-leads-prod", production: true });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
