// Shared by the rung-4 cases (s*.test.mjs). Not a test file itself.
// Runs the Worker in Miniflare (local workerd) with an in-memory D1, the dev config's rate-limit bindings
// and vars, and a stubbed Turnstile. ⛔ No request leaves the machine: any outbound fetch other than
// Turnstile's siteverify gets a 599, and siteverify is answered here.
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build as esbuild } from "esbuild";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import events from "../data/events.json" with { type: "json" };
import saveConfig from "../data/save.json" with { type: "json" };
import { devConfig, ROOT } from "../build.mjs";
import { d1Adapter } from "../src/worker/d1-adapter.js";
import { OFFERS } from "../src/worker/offers.js";
import { sendDue } from "../src/worker/send-due.js";
import { SITEVERIFY_URL } from "../src/worker/turnstile.js";

export const WORKER_DIR = join(ROOT, "src", "worker");
export const TOKEN_THAT_FAILS = "fail-token";
export const TOKEN = "XXXX.DUMMY.TOKEN.XXXX"; // what Cloudflare's test sitekeys hand the page
export const EVENT_ID = events[0].id;
export const IN_ZIP = "02118";
export const NEAR_ZIP = "01602";
export const FAR_ZIP = "10001";
export const CODE_RE = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/;
export const ISO_RE = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
export const PAST_OFFER_ID = "event-past-placeholder";

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
      outbound.push({ url: request.url, body, headers: Object.fromEntries(request.headers) });
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
  return { mf, db, outbound, vars: cfg.vars };
}

let ipCounter = 0;
/** A fresh TEST-NET-2 address per call, so the rate limiter is not what a case measures. */
export const nextIp = () => `198.51.100.${(++ipCounter % 250) + 1}`;

export function validSave(overrides = {}) {
  return {
    kind: "offer",
    email: "dummy-s@example.com",
    zip: IN_ZIP,
    consent_marketing: false,
    event_id: EVENT_ID,
    wording_version: saveConfig.wording_version,
    turnstile_token: TOKEN,
    ...overrides,
  };
}

export async function postSave(mf, body, { ip = nextIp(), raw, headers = {} } = {}) {
  const res = await mf.dispatchFetch(`http://localhost${saveConfig.api_path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip, ...headers },
    body: raw ?? JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text, json: JSON.parse(text) };
}

/** GET or POST a Worker page (/confirm/…, /o/…). `form` makes it a form POST. */
export async function fetchPage(mf, path, { ip = nextIp(), form } = {}) {
  const init = { headers: { "CF-Connecting-IP": ip } };
  if (form) {
    init.method = "POST";
    init.headers["content-type"] = "application/x-www-form-urlencoded";
    init.body = new URLSearchParams(form).toString();
  }
  const res = await mf.dispatchFetch(`http://localhost${path}`, init);
  return { status: res.status, text: await res.text(), headers: Object.fromEntries(res.headers) };
}

export async function count(db, table) {
  return (await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first()).n;
}

export const rows = async (db, sql, ...params) => (await db.prepare(sql).bind(...params).all()).results;

/** Every user table's every row, as one JSON string (S9, S17 search it). */
export async function dumpAllTables(db) {
  const tables = (
    await db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'")
      .all()
  ).results.map((r) => r.name);
  const dump = {};
  for (const t of tables) dump[t] = (await db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()).results;
  return { tables, dump, text: JSON.stringify(dump) };
}

// ---- The scheduled step 1, with test doubles ----

/** Captures every message; accepts all (or answers `outcome`). SPEC-rung4 § 6's RecordingSender. */
export class RecordingSender {
  constructor(outcome = "sent") {
    this.outcome = outcome;
    this.messages = [];
  }
  async send(message) {
    this.messages.push(message);
    return this.outcome;
  }
}

/** Reports the given codes as redeemed, and records what it was asked. */
export class FixedRedemptions {
  constructor(redeemed = []) {
    this.redeemedCodes = new Set(redeemed);
    this.asked = [];
  }
  async redeemed(codes) {
    this.asked.push([...codes]);
    return codes.filter((c) => this.redeemedCodes.has(c));
  }
}

/** Run send-due against the Miniflare database as the cron would, at `nowMs`. */
export async function runSendDue(db, { nowMs, sender, redemptions }) {
  const { vars } = await devConfig();
  return sendDue(db, {
    now: new Date(nowMs).toISOString(),
    sender,
    redemptions,
    context: { offers: OFFERS, events, siteUrl: vars.SITE_URL, unconfirmedDays: saveConfig.unconfirmed_expansion_days },
  });
}

export const linkIn = (text, path) => {
  const m = new RegExp(`https?://[^\\s]+${path}([^\\s]+)`).exec(text);
  return m ? m[1] : null;
};

// ---- Mutants: COPIES of self-contained modules; the committed files are never written ----

/** A copy of src/worker/<file> with `from` replaced (exactly once) by `to`. Returns the copy's path. */
export async function writeMutant(file, from, to) {
  const source = await readFile(join(WORKER_DIR, file), "utf8");
  assert.equal(source.split(from).length - 1, 1, `the mutation site occurs exactly once in ${file}`);
  const dir = await mkdtemp(join(tmpdir(), "fitaf-mutant-"));
  const path = join(dir, file.replace(/\.js$/, ".mutant.js"));
  await writeFile(path, source.replace(from, to));
  return path;
}

export { d1Adapter };
