// Shared by the rung-3 cases (c*.test.mjs). Not a test file itself.
// Runs the Worker in Miniflare (local workerd) with an in-memory D1, the dev config's rate-limit
// binding and vars, and a stubbed Turnstile. ⛔ No request leaves the machine: any outbound fetch
// other than Turnstile's siteverify gets a 599, and siteverify is answered here.
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build as esbuild } from "esbuild";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import { devConfig, ROOT } from "../build.mjs";
import { SITEVERIFY_URL } from "../src/worker/turnstile.js";

export const PURGE_PATH = join(ROOT, "src", "worker", "purge.js");
export const TOKEN_THAT_FAILS = "fail-token";
export const TOKEN = "XXXX.DUMMY.TOKEN.XXXX"; // what Cloudflare's test sitekeys hand the page

async function bundleWorker(main) {
  const out = await esbuild({ entryPoints: [main], bundle: true, format: "esm", write: false, logLevel: "silent" });
  return out.outputFiles[0].text;
}

/** SQL files -> statements. The migrations carry `--` comments and no string literal containing `--`. */
export function statements(sql) {
  return sql
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function applyMigrations(db, dir) {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    await db.batch(statements(await readFile(join(dir, f), "utf8")).map((s) => db.prepare(s)));
  }
  return files;
}

/** A fresh Worker + empty migrated D1. `outbound` records every outbound request the Worker made. */
export async function startWorker() {
  const cfg = await devConfig();
  const [d1] = cfg.d1_databases;
  const outbound = [];
  const worker = {
    name: cfg.name,
    modules: true,
    script: await bundleWorker(resolve(ROOT, cfg.main)),
    compatibilityDate: cfg.compatibility_date,
    d1Databases: { [d1.binding]: "test-d1" },
    ratelimits: Object.fromEntries(
      cfg.ratelimits.map((r) => [r.name, { namespace_id: r.namespace_id, simple: r.simple }]),
    ),
    bindings: cfg.vars,
    outboundService: async (request) => {
      const body = await request.clone().text();
      outbound.push({ url: request.url, body });
      if (request.url !== SITEVERIFY_URL) return new Response("no outbound in tests", { status: 599 });
      const form = await request.formData();
      const success =
        form.get("secret") === "1x0000000000000000000000000000000AA" && form.get("response") !== TOKEN_THAT_FAILS;
      return Response.json({ success });
    },
  };
  // Miniflare 5 takes a new options shape; wrangler itself converts from the V4 shape this way.
  const mf = new Miniflare(convertV4MiniflareOptions({ workers: [worker] }));
  const db = await mf.getD1Database(d1.binding, cfg.name);
  await applyMigrations(db, resolve(ROOT, d1.migrations_dir));
  return { mf, db, outbound };
}

let ipCounter = 0;
/** A fresh TEST-NET-2 address per call, so the rate limiter is not what a case measures. */
export const nextIp = () => `198.51.100.${(++ipCounter % 250) + 1}`;

export function validBody(overrides = {}) {
  return {
    first_name: "Dummy",
    email: "dummy-c@example.com",
    mobile: "",
    zip: "02118",
    plan: "signature",
    meals_per_week: 14,
    consent_email: false,
    consent_sms: false,
    wording_version: "v0.2-draft",
    turnstile_token: TOKEN,
    ...overrides,
  };
}

export async function postClaim(mf, body, { ip = nextIp(), raw } = {}) {
  const res = await mf.dispatchFetch("http://localhost/api/claim", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
    body: raw ?? JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text, json: JSON.parse(text) };
}

export async function count(db, table) {
  return (await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first()).n;
}

/** Every user table's every row, as one JSON string (C10 searches it). */
export async function dumpAllTables(db) {
  const tables = (
    await db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'")
      .all()
  ).results.map((r) => r.name);
  const dump = {};
  for (const t of tables) dump[t] = (await db.prepare(`SELECT * FROM ${t}`).all()).results;
  return { tables, text: JSON.stringify(dump) };
}

// ---- The purge: C8's assertion, callable on any purge module so C9 can run it against a mutant. ----

/** PURGE_MODULE may point at a mutant COPY, to show C8 failing (as PLANS_PATH does for T7). */
export const purgeModulePath = () => process.env.PURGE_MODULE || PURGE_PATH;

/** 3 exported + 3 pending claims, each with a contact. Returns their ids by state. */
export async function seedPurgeFixture(db) {
  const { dummyClaims } = await import("../scripts/dummy-claims.mjs");
  const claims = dummyClaims(6, { exported: 3 });
  const { INSERT_CLAIM_SQL, INSERT_CONTACT_SQL } = await import("../src/worker/claim-store.js");
  await db.batch(
    claims.flatMap(({ claimRow, contactRow }) => [
      db.prepare(INSERT_CLAIM_SQL).bind(...claimRow),
      db.prepare(INSERT_CONTACT_SQL).bind(...contactRow),
    ]),
  );
  const ids = (state) => claims.filter((c) => c.claimRow[6] === state).map((c) => c.claimRow[0]);
  return { exported: ids("exported"), pending: ids("pending") };
}

/** C8: exported claims lose their contacts row; claims rows remain as 'purged'; non-exported untouched. */
export async function assertPurgeIsCorrect(purgeModule, db) {
  const fixture = await seedPurgeFixture(db);
  const pendingContactsBefore = (
    await db.prepare("SELECT * FROM contacts WHERE claim_id IN (?, ?, ?) ORDER BY claim_id").bind(...fixture.pending).all()
  ).results;

  const result = await purgeModule.purge(purgeModule.d1Adapter(db), { dryRun: false });
  assert.deepEqual(result, { dry_run: false, exported_claims: 3, contacts_to_delete: 3 });

  assert.equal(await count(db, "claims"), 6, "every claims row remains");
  const state = async (id) =>
    (await db.prepare("SELECT export_state FROM claims WHERE claim_id = ?").bind(id).first())?.export_state;
  const contact = (id) => db.prepare("SELECT * FROM contacts WHERE claim_id = ?").bind(id).first();
  for (const id of fixture.exported) {
    assert.equal(await state(id), "purged", "an exported claim is marked purged");
    assert.equal(await contact(id), null, "an exported claim's contacts row is deleted");
  }
  for (const id of fixture.pending) assert.equal(await state(id), "pending", "a non-exported claim is untouched");
  const pendingContactsAfter = (
    await db.prepare("SELECT * FROM contacts WHERE claim_id IN (?, ?, ?) ORDER BY claim_id").bind(...fixture.pending).all()
  ).results;
  assert.deepEqual(pendingContactsAfter, pendingContactsBefore, "non-exported contacts are byte-identical");
}

/** C9's mutant: a COPY of purge.js whose DELETE targets `claims` instead of `contacts`. */
export async function writePurgeMutant(dir) {
  dir ??= await mkdtemp(join(tmpdir(), "fitaf-purge-mutant-"));
  const source = await readFile(PURGE_PATH, "utf8");
  const needle = '"DELETE FROM contacts WHERE claim_id IN';
  assert.equal(source.split(needle).length - 1, 1, "the mutation site occurs exactly once");
  const path = join(dir, "purge.mutant.js");
  await writeFile(path, source.replace(needle, '"DELETE FROM claims WHERE claim_id IN'));
  return path;
}
