// Shared by the rung-4 cases (s*.test.mjs). Not a test file itself.
// Runs the Worker in Miniflare (local workerd) with an in-memory D1, the dev config's rate-limit bindings
// and vars, and a stubbed Turnstile. ⛔ No request leaves the machine: any outbound fetch other than
// Turnstile's siteverify gets a 599, and siteverify is answered here.
// SPEC-save-offer-production.md SP6: with `worker: "production"` (or BOSTON_SAVE_WORKER=production in the environment,
// which SP6 sets to run S1-S17 against it) the Worker is PRODUCTION's: wrangler.jsonc's top level (its `main`,
// src/worker/site.js; its D1, rate limits and vars), bundled with data/save.json's `production` set to `production`
// (true unless given), the Turnstile secret the test key (production's is a secret, never in the config), and an ASSETS
// binding that answers 404 and records each request. Each production Worker started is appended to the file
// BOSTON_SAVE_WORKER_LOG names, if set, so SP6 can see the cases ran against it.
import assert from "node:assert/strict";
import { appendFile, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { build as esbuild } from "esbuild";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import events from "../data/events.json" with { type: "json" };
import saveConfig from "../data/save.json" with { type: "json" };
import { devConfig, ROOT } from "../build.mjs";
import { tokenMinter } from "../src/worker/confirm-token.js";
import { d1Adapter } from "../src/worker/d1-adapter.js";
import offersFile from "../data/offers.json" with { type: "json" };
import { OFFERS } from "../src/worker/offers.js";
import { sendDue } from "../src/worker/send-due.js";
import { RESEND_URL } from "../src/worker/resend-sender.js";
import { SITEVERIFY_URL } from "../src/worker/turnstile.js";

export const WORKER_DIR = join(ROOT, "src", "worker");
export const TOKEN_THAT_FAILS = "fail-token";
export const TOKEN = "XXXX.DUMMY.TOKEN.XXXX"; // what Cloudflare's test sitekeys hand the page
export const EVENT_ID = events[0].id;
export const IN_ZIP = "02118";
// SPEC-save-offer-production § 10 item 5: 01602 (Worcester) is on the store's official list, so the near ring's case is a
// code in its (mock) 030 that the list does not hold: Manchester, NH.
export const NEAR_ZIP = "03101";
export const FAR_ZIP = "10001";
export const CODE_RE = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/;
export const ISO_RE = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
/** § 10.7: data/offers.json holds one offer, the Boston offer, so an offer that ended before TEST_NOW_MS is a fixture: a
 *  case that needs one starts its Worker with `offers: withPastOffer()` (the committed offers and this one). */
export const PAST_OFFER = Object.freeze({
  id: "event-past-fixture",
  label: "Fixture: an offer that ended",
  applies_to: "event",
  valid_from: "2026-01-01",
  valid_to: "2026-06-30",
  code_mode: "none",
});
export const PAST_OFFER_ID = PAST_OFFER.id;
/** The committed offers file with PAST_OFFER added (a fixture's; never written). */
export const withPastOffer = () => ({ ...offersFile, offers: [PAST_OFFER, ...offersFile.offers] });
/**
 * SPEC-save-offer-production § 10.7: the Worker's clock in the cases. The offers end (the Boston offer, every visitor's,
 * is held until 2026-10-29, and none follows it), so a case that saves through the Worker would depend on the day it
 * runs. Every Worker started here reads this instant as now (its Date.now(), frozen there), unless a case gives its own
 * `now`: noon in New York on 2026-10-24, a day of the Boston offer.
 */
export const TEST_NOW_MS = Date.parse("2026-10-24T16:00:00.000Z");
/** The bundle's first statement: the Worker's Date.now() reads `now`. Only the cases' bundles carry it. */
const clockBanner = (now) => `Date.now = () => ${Number(now)}; // test clock (worker-harness.mjs TEST_NOW_MS)`;
/** Rung 5 § 8: a CONFIRM_TOKEN_KEY for tests only — public, and nothing real is keyed with it. */
export const TEST_CONFIRM_TOKEN_KEY = "test-only-confirm-token-key-0000000000000";

async function bundleWorker(main, { save, offers, now = TEST_NOW_MS } = {}) {
  // `save`: data/save.json's contents as the bundle sees them (the production flag), the file itself never written; and
  // `offers` (§ 10.7) data/offers.json's, likewise.
  const json = (name, file, contents) => ({
    name,
    setup: (b) => b.onLoad({ filter: new RegExp(`[\\\\/]data[\\\\/]${file.replace(".", "\\.")}$`) }, () => ({ contents: JSON.stringify(contents), loader: "json" })),
  });
  const plugins = [...(save ? [json("save-json", "save.json", save)] : []), ...(offers ? [json("offers-json", "offers.json", offers)] : [])];
  // Production's entry also exports its helpers by name (site.js: WEEK_OBJECT, PAGE_CACHE_CONTROL, …), which workerd
  // would read as entrypoints; the bundle exports its default alone, as wc-harness's wrapper does.
  const out = await esbuild({
    stdin: { contents: `export { default } from ${JSON.stringify(main)};`, resolveDir: ROOT, loader: "js" },
    banner: { js: clockBanner(now) },
    bundle: true,
    format: "esm",
    write: false,
    logLevel: "silent",
    plugins,
  });
  return out.outputFiles[0].text;
}

/** wrangler.jsonc's top level (production), as wrangler reads it. */
async function productionWranglerConfig() {
  const { unstable_readConfig } = await import("wrangler");
  return unstable_readConfig({ config: join(ROOT, "wrangler.jsonc") }, { hideWarnings: true });
}
/** The Turnstile secret the stub accepts: Cloudflare's published test secret, as the dev vars carry it. */
const TEST_TURNSTILE_SECRET = "1x0000000000000000000000000000000AA";

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

/**
 * A fresh Worker + empty migrated D1. `outbound` records every outbound request the Worker made.
 * Rung 5: `bindings` adds to (or overrides) the dev vars — e.g. a DUMMY RESEND_API_KEY, SEND_ALLOWLIST —
 * and `resend(request)` answers requests to Resend's API in place of the network (else they get the 599).
 */
/**
 * `assets` (SPEC-save-offer-production § 9.2, SP11): the Worker's ASSETS, as a path -> HTML table answered as the assets
 * would answer it ("/x/" serves the table's "/x/"; anything else 404), for either Worker; without it, production's
 * ASSETS answers 404 to everything and development's has none (its assets come first in wrangler's router).
 */
export async function startWorker({ bindings = {}, resend, worker: which = process.env.BOSTON_SAVE_WORKER ?? "development", production = true, assets, now = TEST_NOW_MS, offers } = {}) {
  const isProduction = which === "production";
  const cfg = isProduction ? await productionWranglerConfig() : await devConfig();
  const [d1] = cfg.d1_databases;
  assert.ok(d1, `wrangler.jsonc gives the ${which} Worker a D1 binding`);
  const outbound = [];
  const assetRequests = [];
  const worker = {
    name: cfg.name,
    modules: true,
    script: await bundleWorker(resolve(ROOT, cfg.main), { now, offers, ...(isProduction ? { save: { ...saveConfig, production } } : {}) }),
    compatibilityDate: cfg.compatibility_date,
    d1Databases: { [d1.binding]: "test-d1" },
    ratelimits: Object.fromEntries(
      cfg.ratelimits.map((r) => [r.name, { namespace_id: r.namespace_id, simple: r.simple }]),
    ),
    bindings: { ...cfg.vars, ...(isProduction ? { TURNSTILE_SECRET_KEY: TEST_TURNSTILE_SECRET } : {}), ...bindings },
    ...(isProduction || assets
      ? {
          serviceBindings: {
            ASSETS: async (request) => {
              const { pathname } = new URL(request.url);
              assetRequests.push(`${request.method} ${pathname}`);
              const html = assets?.[pathname];
              return html === undefined
                ? new Response(null, { status: 404 })
                : new Response(request.method === "HEAD" ? null : html, { headers: { "content-type": "text/html; charset=utf-8" } });
            },
          },
        }
      : {}),
    outboundService: async (request) => {
      const body = await request.clone().text();
      outbound.push({ url: request.url, body, headers: Object.fromEntries(request.headers) });
      if (resend && request.url === RESEND_URL) return resend(request);
      if (request.url !== SITEVERIFY_URL) return new Response("no outbound in tests", { status: 599 });
      const form = await request.formData();
      const success =
        form.get("secret") === "1x0000000000000000000000000000000AA" && form.get("response") !== TOKEN_THAT_FAILS;
      return Response.json({ success });
    },
  };
  // Miniflare 5 takes a new options shape; wrangler itself converts from the V4 shape this way.
  // cf: false: Miniflare's own placeholder request.cf, never https://workers.cloudflare.com/cf.json (SPEC-analytics § 10.1).
  const mf = new Miniflare(convertV4MiniflareOptions({ cf: false, workers: [worker] }));
  let db;
  try {
    db = await mf.getD1Database(d1.binding, cfg.name);
    await applyMigrations(db, resolve(ROOT, d1.migrations_dir));
  } catch (err) {
    await mf.dispose(); // a workerd left running keeps the test file's process from ever exiting
    throw err;
  }
  if (isProduction && process.env.BOSTON_SAVE_WORKER_LOG) {
    await appendFile(process.env.BOSTON_SAVE_WORKER_LOG, `${JSON.stringify({ main: relative(ROOT, resolve(ROOT, cfg.main)), database: d1.database_name, production })}\n`);
  }
  return { mf, db, outbound, vars: cfg.vars, main: relative(ROOT, resolve(ROOT, cfg.main)), assetRequests, now };
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

/** Run send-due against the Miniflare database as the cron would, at `nowMs`, with the vars of the Worker the cases run
 *  against (production's under BOSTON_SAVE_WORKER=production, so its links name production's SITE_URL). */
export async function runSendDue(db, { nowMs, sender, redemptions }) {
  const { vars } = process.env.BOSTON_SAVE_WORKER === "production" ? await productionWranglerConfig() : await devConfig();
  return sendDue(db, {
    now: new Date(nowMs).toISOString(),
    sender,
    redemptions,
    context: {
      offers: OFFERS,
      events,
      siteUrl: vars.SITE_URL,
      unconfirmedDays: saveConfig.unconfirmed_expansion_days,
      mintToken: tokenMinter(TEST_CONFIRM_TOKEN_KEY),
    },
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
