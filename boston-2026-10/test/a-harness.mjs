// Shared by the a*-*.test.mjs files (SPEC-analytics.md: analytics that identify no one, counted in our own Worker). Not a
// test file itself. No request leaves the machine and no file in the repository is written:
//
// - THE PAGE is run as a browser runs it: its inline scripts, in order, in one `vm` context over linkedom's DOM, with a
//   stub window that RECORDS each beacon (`navigator.sendBeacon`), gives Web Crypto's getRandomValues and a clock
//   (`performance.now()`) the case sets, and whose storage APIs (localStorage, sessionStorage, indexedDB,
//   document.cookie) THROW if touched, naming themselves in `touched`. A script that throws is reported to the window's
//   `error` listeners as a browser would, and kept in `errors`.
// - THE WORKER runs in Miniflare (local workerd), bundled from a package's src/worker/<entry>.js by esbuild under a thin
//   wrapper that only RECORDS: each data point written to ANALYTICS and each read and write of SALTS (passed through to
//   Miniflare's own local bindings), and that sets the Worker's clock (`Date.now`) to the `x-a-clock` header a case
//   sends (removed before the Worker sees the request). The wrapper answers one path of its own, /__a/log. `cf: false`:
//   Miniflare's fallback `request.cf`, never the network's (a case gives the country per request).
// - `configuredSite()` runs the Worker as wrangler.jsonc configures it, through wrangler's own translation, as
//   wc-harness's `configured()` does, but with `cf: false`.
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import vm from "node:vm";
import { build as esbuild } from "esbuild";
import { parseHTML } from "linkedom";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import { ROOT } from "../build.mjs";
import { FIXTURE_DIR, pageWithPicks } from "./cc-harness.mjs";

/** A documentation address (RFC 5737, TEST-NET-3) and an invented user agent: what A4 must find in no written field. */
export const TEST_IP = "203.0.113.7";
export const TEST_UA_TOKEN = "A4-probe-agent";
export const TEST_UA = `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ${TEST_UA_TOKEN}/1.0 Mobile/15E148`;
/** The beacon's path (§ 4) and the store's order page (data/plans.json's order_base_url), written here from the contract. */
export const BEACON = "/a";
export const ORDER = "https://fitafnutrition.com/order";
/** A visit id as § 2 makes it: 16 hex digits. */
export const VISIT_ID = /^[0-9a-f]{16}$/;

/** One valid body of each § 3 event, written from the contract's table (the vocabulary of data/plans.json and app.js). */
export const S1 = "0123456789abcdef";
export const VALID = {
  open: { event: "open", s: S1, viewport: "<400", load_ms: 812, qr: "" },
  answer: { event: "answer", s: S1, question: "goal", answer: "lean" },
  result: { event: "result", s: S1, key: "or-7d", mpid: 21 },
  click: { event: "click", s: S1, link: "chefs-choice", mpid: 21 },
  leave: { event: "leave", s: S1, length_ms: 64000, step: "click" },
  error: { event: "error", s: S1 },
};

/** The page `npm run build` (or `build:dev`, target "dev") writes, of the package at `root`; with `week`, the fixture
 *  week's content in its #picks-data as the Workers put it (cc-harness pageWithPicks). */
export async function builtPage({ root = ROOT, target = "prod", week = false, savePath } = {}) {
  return (await pageWithPicks({ root, target, picks: week ? FIXTURE_DIR : null, savePath })).html;
}

/** Every page the dev build writes (dist-dev/index.html and one per event), of the package at `root`. */
export async function devPages({ root = ROOT } = {}) {
  const { build } = await import(pathToFileURL(join(root, "build.mjs")).href);
  const outDir = await mkdtemp(join(tmpdir(), "boston-a-dev-"));
  try {
    const out = await build({ target: "dev", outDir });
    return await Promise.all(out.pages.map(async (p) => ({ path: p.path.slice(outDir.length), html: await readFile(p.path, "utf8") })));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

const STORAGE = ["localStorage", "sessionStorage", "indexedDB"];

/**
 * The page in a stub browser. `hash`, `search`: the URL's; `width`: window.innerWidth. Returns the visit:
 * `beacons` (each { url, data, body }), `touched` (storage APIs touched), `errors` (scripts that threw), `press(id or
 * element)`, `go(hash)`, `at(ms)` (the clock), `hide()` (visibilitychange to hidden), `pagehide()`, `fail(error)` (an
 * uncaught error reported to the window), `el(id)`, `document`.
 */
export function openVisit(html, { hash = "", search = "", width = 390, clock = 0 } = {}) {
  const { document, Event } = parseHTML(html);
  const beacons = [];
  const touched = [];
  const errors = [];
  const listeners = {};
  const timers = [];
  let now = clock;
  let current = hash;
  const fire = (type, event) => {
    for (const fn of listeners[type] ?? []) fn(event);
  };
  const flush = () => {
    while (timers.length) timers.shift()();
  };
  const location = {
    search,
    get hash() {
      return current;
    },
    set hash(value) {
      const next = value.startsWith("#") ? value : `#${value}`;
      if (next === current) return;
      current = next;
      fire("hashchange", { type: "hashchange" });
    },
  };
  const g = {
    document,
    location,
    console,
    innerWidth: width,
    navigator: {
      sendBeacon(url, data) {
        beacons.push({ url, data: String(data), body: JSON.parse(String(data)) });
        return true;
      },
    },
    crypto: { getRandomValues: (array) => webcrypto.getRandomValues(array) },
    performance: { now: () => now },
    addEventListener(type, fn) {
      (listeners[type] ??= []).push(fn);
    },
    removeEventListener() {},
    matchMedia: () => ({ matches: false }),
    setInterval: () => 0,
    clearInterval() {},
    setTimeout(fn) {
      timers.push(fn);
      return timers.length;
    },
    clearTimeout() {},
  };
  g.window = g;
  for (const name of STORAGE) {
    Object.defineProperty(g, name, {
      get() {
        touched.push(name);
        throw new Error(`${name} touched`);
      },
    });
  }
  Object.defineProperty(document, "cookie", {
    get() {
      touched.push("document.cookie");
      throw new Error("document.cookie touched");
    },
    set() {
      touched.push("document.cookie");
      throw new Error("document.cookie touched");
    },
  });
  let visibility = "visible";
  Object.defineProperty(document, "visibilityState", { get: () => visibility });
  // linkedom has no modal dialogs; the page's "See all plans" opens one.
  for (const dialog of document.querySelectorAll("dialog")) Object.assign(dialog, { showModal() {}, close() {} });
  const report = (error) => {
    errors.push(error);
    fire("error", { type: "error", message: error.message, filename: "", lineno: 1, colno: 1, error });
  };
  const context = vm.createContext(g);
  for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    try {
      vm.runInContext(m[1], context);
    } catch (error) {
      report(error);
    }
  }
  flush();
  const el = (id) => {
    const found = typeof id === "string" ? document.getElementById(id) : id;
    assert.ok(found, `the page has an element #${id}`);
    return found;
  };
  return {
    document,
    beacons,
    touched,
    errors,
    el,
    hash: () => current,
    at(ms) {
      now = ms;
    },
    press(id) {
      const target = el(id);
      const event = new Event("click", { bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      flush();
      return event;
    },
    go(h) {
      location.hash = h;
      flush();
    },
    hide() {
      visibility = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
      flush();
    },
    pagehide() {
      fire("pagehide", { type: "pagehide", persisted: false });
      flush();
    },
    fail(error) {
      report(error);
      flush();
    },
  };
}

/** The goal and meal-question buttons of a page: { goal: [...data-goal], <q>: [...data-a] } as its markup has them. */
export function pageAnswers(html) {
  const { document } = parseHTML(html);
  const out = { goal: [...new Set([...document.querySelectorAll("[data-goal]")].map((b) => b.getAttribute("data-goal")))] };
  for (const b of document.querySelectorAll("[data-q]")) (out[b.getAttribute("data-q")] ??= []).push(b.getAttribute("data-a"));
  return out;
}

/**
 * A whole visit (§ 7 A2): open, the goal and Q1–Q3 answered (four answers), the result shown, the order link pressed,
 * the page left. Returns the visit.
 */
export function wholeVisit(html) {
  const visit = openVisit(html, { clock: 400 });
  visit.at(5_000);
  visit.press(visit.document.querySelector('[data-goal="lean"]'));
  visit.press(visit.document.querySelector('[data-q="lunch_dinner"][data-a="or"]'));
  visit.press(visit.document.querySelector('[data-q="weekends"][data-a="no"]'));
  visit.press(visit.document.querySelector('[data-q="breakfast"][data-a="yes"]'));
  visit.at(41_000);
  visit.press("result-cta");
  visit.at(42_500);
  visit.pagehide();
  return visit;
}

// THE WORKER.

const WRAPPER = (entry) => `
import worker from ${JSON.stringify(entry)};
const log = { points: [], puts: [], gets: [] };
const realNow = Date.now;
const salts = (kv) => ({
  get(key, options) { log.gets.push(key); return kv.get(key, options); },
  put(key, value, options) { log.puts.push({ key, value, options: options ?? null }); return kv.put(key, value, options); },
  list(options) { return kv.list(options); },
  delete(key) { return kv.delete(key); },
});
const dataset = (ae) => ({ writeDataPoint(point) { log.points.push(point); return ae.writeDataPoint(point); } });
export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/__a/log") {
      const out = JSON.stringify({ ...log, keys: env.SALTS ? (await env.SALTS.list()).keys : [] });
      log.points = []; log.puts = []; log.gets = [];
      return new Response(out, { headers: { "content-type": "application/json" } });
    }
    const clock = request.headers.get("x-a-clock");
    const headers = new Headers(request.headers);
    headers.delete("x-a-clock");
    const forwarded = new Request(request, { headers });
    Date.now = clock ? () => Number(clock) : realNow;
    try {
      const wrapped = { ...env };
      if (env.SALTS) wrapped.SALTS = salts(env.SALTS);
      if (env.ANALYTICS) wrapped.ANALYTICS = dataset(env.ANALYTICS);
      return await worker.fetch(forwarded, wrapped, ctx);
    } finally {
      Date.now = realNow;
    }
  },
};
`;

async function bundle(entry) {
  const out = await esbuild({
    stdin: { contents: WRAPPER(entry), resolveDir: ROOT, loader: "js" },
    bundle: true,
    format: "esm",
    write: false,
    logLevel: "silent",
  });
  return out.outputFiles[0].text;
}

/** What a started Worker offers a case: `post(body, options)`, `log()`, the fake ASSETS' requests, `dispose()`. */
function handle(mf, assetRequests) {
  return {
    mf,
    assetRequests,
    /** POST `body` (an object is sent as JSON) to `path` (§ 4's /a), from `ip` with `ua`, in `country`, at `clock`. */
    async post(body, { path = BEACON, ip = TEST_IP, ua = TEST_UA, country = "US", clock, host = "eatfitaf.com", method = "POST" } = {}) {
      const headers = { "cf-connecting-ip": ip, "user-agent": ua, "content-type": "text/plain;charset=UTF-8" };
      if (clock !== undefined) headers["x-a-clock"] = String(clock);
      const res = await mf.dispatchFetch(`https://${host}${path}`, {
        method,
        headers,
        ...(method === "GET" || method === "HEAD" ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
        cf: { country },
        redirect: "manual",
      });
      const text = await res.text();
      return { status: res.status, text, headers: Object.fromEntries(res.headers) };
    },
    async log() {
      return JSON.parse(await (await mf.dispatchFetch("https://eatfitaf.com/__a/log")).text());
    },
    dispose: () => mf.dispose(),
  };
}

/**
 * The Worker `entry` ("site": production's; "index": the development Worker) of the package at `root`, with SALTS (a
 * local KV namespace), ANALYTICS (a local dataset), WEEK (an empty local bucket) and a fake ASSETS answering 404.
 * `bindings: false` starts it with none of SALTS and ANALYTICS.
 */
export async function startBeacon({ root = ROOT, entry = "site", bindings = true } = {}) {
  const assetRequests = [];
  const assets = async (request) => {
    assetRequests.push({ method: request.method, path: new URL(request.url).pathname });
    return new Response("assets: not found", { status: 404 });
  };
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      cf: false,
      workers: [
        {
          name: `a-${entry}`,
          modules: true,
          script: await bundle(join(root, "src", "worker", `${entry}.js`)),
          compatibilityDate: "2026-09-26",
          serviceBindings: { ASSETS: assets },
          r2Buckets: { WEEK: "a-week" },
          ...(bindings ? { kvNamespaces: { SALTS: "a-salts" }, analyticsEngineDatasets: { ANALYTICS: { dataset: "a_test" } } } : {}),
        },
      ],
    }),
  );
  return handle(mf, assetRequests);
}

/** The Worker as wrangler.jsonc configures it for `env` (undefined: production), its assets a build in `distDir`. */
export async function configuredSite({ env, distDir, root = ROOT }) {
  process.env.WRANGLER_SEND_METRICS = "false";
  const { unstable_getMiniflareWorkerOptions, unstable_readConfig } = await import("wrangler");
  const cfg = unstable_readConfig({ config: join(root, "wrangler.jsonc"), env }, { hideWarnings: true });
  cfg.assets = { ...cfg.assets, directory: distDir };
  const { workerOptions } = unstable_getMiniflareWorkerOptions(cfg, env);
  const options = { ...workerOptions, name: `a-${env ?? "prod"}`, modules: true, script: await bundle(cfg.main) };
  delete options.modulesRules;
  delete options.scriptPath;
  const mf = new Miniflare(convertV4MiniflareOptions({ cf: false, workers: [options] }));
  return { ...handle(mf, []), cfg };
}

/** UTC instants, in ms, for the cases' clocks. */
export const utc = (y, m, d, h = 12, min = 0) => Date.UTC(y, m - 1, d, h, min);
