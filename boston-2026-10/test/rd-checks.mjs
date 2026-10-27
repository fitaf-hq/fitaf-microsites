// The checks of RD1 to RD9 (SPEC-the-redirect.md: eatfitaf.com's home page as a way into the store, 2026-10-27), as
// functions over a PACKAGE (`root`: this one, or a mirror of it), each returning one line per thing the package gets wrong
// ([] when it is right). The cases run them on this package; the mutants (rd-mutants.test.mjs) run THE SAME checks on a
// mirror carrying one mutation each. Not a test file itself. Every expectation is the contract's, written here, never read
// back from the code under test. No request leaves the machine: the Workers run in Miniflare, production's
// (src/worker/site.js) and the development Worker (src/worker/index.js), through a-harness's startBeacon (SALTS and
// ANALYTICS recorded; the Worker's vars and a fake ASSETS given by the case), wc-harness's startSite (a WEEK bucket),
// worker-harness's startWorker (D1, the rate limiters) and a-harness's configuredSite (wrangler.jsonc's own translation
// and the real asset router, over a build a case made).
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { ROOT } from "../build.mjs";
import { builtPage, configuredSite, openVisit, S1, startBeacon, TEST_IP, TEST_UA, TEST_UA_TOKEN, VALID } from "./a-harness.mjs";
import { parseText, runAt, runs, fixtureAnswers, walkProblems } from "./aj-checks.mjs";
import { evaluate, offerPages } from "./em-a-checks.mjs";
import { CARRYING, NO_TRACKING_CLEAR, NO_TRACKING_SET, NO_TRACKING_SENT } from "./n-checks.mjs";

/** § 1 item 1: production's and development's value, the store's front page (ruled ts=2026-10-27T16:03:46.679Z). */
export const STORE = "https://fitafnutrition.com/";
/** The var's name (§ 1 item 1). */
export const VAR = "REDIRECT_TO";
/** The Workers, by entry: production's and the development Worker. */
export const ENTRIES = ["site", "index"];
/** The hosts the Worker answers (§ 1 item 3): the domain and www. */
export const HOSTS = ["eatfitaf.com", "www.eatfitaf.com"];

/** § 2: each request's Location, the contract's own examples and the rest of its rules, written here. */
const M = (rest) => `${STORE}?utm_source=eatfitaf&${rest}`;
export const LOCATIONS = [
  ["/", M("utm_medium=direct")],
  ["/?e=boston", M("utm_medium=qr&utm_campaign=boston")],
  ["/?e=seminar", M("utm_medium=qr&utm_campaign=seminar")],
  ["/?e=demo", M("utm_medium=qr&utm_campaign=demo")],
  ["/?e=nope", M("utm_medium=direct")],
  ["/?e=boston&via=email", M("utm_medium=email&utm_campaign=boston")],
  ["/?via=email", M("utm_medium=email")],
  ["/?e=boston&x=1", M("utm_medium=qr&utm_campaign=boston")],
  ["/?via=other", M("utm_medium=direct")],
  ["/?e=boston&via=email&secret=x", M("utm_medium=email&utm_campaign=boston")],
];
/** RD1b: the var with a query of its own; the marker appended with "&". */
export const STORE_WITH_QUERY = "https://fitafnutrition.com/meal-plans?x=1";
export const LOCATIONS_WITH_QUERY = [
  ["/", `${STORE_WITH_QUERY}&utm_source=eatfitaf&utm_medium=direct`],
  ["/?e=boston&via=email", `${STORE_WITH_QUERY}&utm_source=eatfitaf&utm_medium=email&utm_campaign=boston`],
];

/** A request of a started Worker (startBeacon's or configuredSite's handle): its status, Location, Cache-Control, every
 *  Set-Cookie, headers (but `date`) and body. */
export async function ask(site, path, { method = "GET", host = "eatfitaf.com", ua = TEST_UA, ip = TEST_IP, cookie, referer, body, country = "US", failWrite = false } = {}) {
  const headers = { "cf-connecting-ip": ip, "user-agent": ua };
  if (cookie !== undefined) headers.cookie = cookie;
  if (referer !== undefined) headers.referer = referer;
  if (body !== undefined) headers["content-type"] = "text/plain;charset=UTF-8";
  if (failWrite) headers["x-a-fail-write"] = "1";
  const res = await site.mf.dispatchFetch(`https://${host}${path}`, { method, headers, ...(body !== undefined ? { body } : {}), cf: { country }, redirect: "manual" });
  const bytes = Buffer.from(await res.arrayBuffer());
  const all = Object.fromEntries(res.headers);
  delete all.date;
  return { status: res.status, location: res.headers.get("location"), cacheControl: res.headers.get("cache-control"), cookies: res.headers.getSetCookie(), headers: all, body: bytes };
}

/** What is wrong with `r` as § 1 item 5's answer, Location `want`. */
function redirectProblems(where, r, want) {
  const out = [];
  if (r.status !== 302) out.push(`${where}: ${r.status}, not 302`);
  if (r.location !== want) out.push(`${where}: Location ${JSON.stringify(r.location)}, not ${JSON.stringify(want)}`);
  if (r.location?.includes("#")) out.push(`${where}: the Location names a fragment`);
  if (r.cacheControl !== "no-store") out.push(`${where}: Cache-Control ${JSON.stringify(r.cacheControl)}, not "no-store"`);
  if (r.cookies.length) out.push(`${where}: Set-Cookie ${JSON.stringify(r.cookies)}, not none`);
  if (r.body.length) out.push(`${where}: a body of ${r.body.length} bytes, not none`);
  return out;
}

/** A page the fake ASSETS answer "/" with (RD1: the Worker must not ask for it). */
const PAGE = "<!doctype html><title>rd</title><p>the page</p>";
const pageAnswer = () => new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8" } });

/** Each Worker of `entries` of the package at `root` (startBeacon), with `vars` and `assets`, given to `fn(site, entry)`. */
async function eachWorker(root, entries, { vars = {}, assets = pageAnswer, bindings = true } = {}, fn) {
  for (const entry of entries) {
    const site = await startBeacon({ root, entry, vars, assets, bindings });
    try {
      await site.log();
      await fn(site, entry);
    } finally {
      await site.dispose();
    }
  }
}

// ── RD1 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * RD1 (§ 1 items 3 and 5, § 2): with REDIRECT_TO the store's front page, each Worker answers GET of every LOCATIONS
 * request, on eatfitaf.com and www, with a 302 whose Location is exactly § 2's (no other parameter, no "#"),
 * Cache-Control no-store, no Set-Cookie, no body; HEAD "/" and "/?e=boston" the same Location; the assets never asked.
 * RD1b: the var with a query of its own, the marker appended with "&".
 */
export async function locationProblems(root = ROOT, entries = ENTRIES) {
  const problems = [];
  await eachWorker(root, entries, { vars: { [VAR]: STORE } }, async (site, entry) => {
    for (const host of HOSTS) {
      for (const [path, want] of LOCATIONS) problems.push(...redirectProblems(`${entry} GET ${host}${path}`, await ask(site, path, { host }), want));
      for (const [path, want] of LOCATIONS.slice(0, 2)) problems.push(...redirectProblems(`${entry} HEAD ${host}${path}`, await ask(site, path, { host, method: "HEAD" }), want));
    }
    if (site.assetRequests.length) problems.push(`${entry}: the assets were asked ${site.assetRequests.map((r) => `${r.method} ${r.path}`).join(", ")}, not at all`);
  });
  await eachWorker(root, entries, { vars: { [VAR]: STORE_WITH_QUERY } }, async (site, entry) => {
    for (const [path, want] of LOCATIONS_WITH_QUERY) problems.push(...redirectProblems(`${entry} (RD1b) GET ${path}`, await ask(site, path), want));
  });
  return problems;
}

// ── RD2 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Each image E1 names (§ 1 item 3, RD2): the paths in src/worker/email-style.js (the page's logo and E1_IMAGES) and
 *  src/worker/email-photos.json (the slideshow), read from the package at `root`. */
export async function emailImages(root = ROOT) {
  const style = await import(pathToFileURL(join(root, "src", "worker", "email-style.js")).href);
  const photos = JSON.parse(await readFile(join(root, "src", "worker", "email-photos.json"), "utf8"));
  const paths = [style.LOGO.path, ...Object.values(style.E1_IMAGES).map((v) => (typeof v === "string" ? v : v.path))];
  if (photos.base && photos.email_slideshow?.file) paths.push(`/${photos.base}${photos.email_slideshow.file}`);
  return [...new Set(paths)].sort();
}

/** The package's build of `target` into a temporary directory: { dir, done }. */
export async function builtDist(root, target) {
  const { build } = await import(pathToFileURL(join(root, "build.mjs")).href);
  const dir = await mkdtemp(join(tmpdir(), `boston-rd-${target}-`));
  await build({ target, outDir: dir });
  return { dir, done: () => rm(dir, { recursive: true, force: true }) };
}

const TYPES = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".gif": "image/gif", ".jpg": "image/jpeg", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

/** A fake ASSETS serving the build in `dir` as the platform's asset server does (measured, wrangler.jsonc's comment): a
 *  path ending "/index.html" its 307 to the path without it; a path ending "/" its index.html; a file; else 404. */
export const distAssets = (dir) => async (request) => {
  const { pathname } = new URL(request.url);
  if (pathname.endsWith("/index.html")) return new Response(null, { status: 307, headers: { location: pathname.slice(0, -"index.html".length) } });
  const file = join(dir, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
  if (!file.startsWith(dir) || !existsSync(file) || pathname.includes("..")) return new Response(null, { status: 404 });
  const bytes = await readFile(file);
  return new Response(request.method === "HEAD" ? null : bytes, { headers: { "content-type": TYPES[extname(file)] ?? "application/octet-stream" } });
};

/** RD2's requests of every path § 1 item 3 keeps (but `/o`, `/confirm` and `/api/save`, which need the save step's D1:
 *  otherWorkerRouteProblems), each [method, path, body]; the event pages on the development Worker alone. */
export async function otherRequests(root, entry) {
  const images = await emailImages(root);
  return [
    ["GET", "/index.html"],
    ["GET", "/index.html?e=boston"],
    ["HEAD", "/index.html"],
    ["GET", "/privacy/"],
    ["GET", "/why/"],
    ...images.map((p) => ["GET", p]),
    ["HEAD", images[0]],
    ["GET", "/assets/nothing-here.png"],
    ["GET", "/week/chefs-choice-2026-10-18.jpg"],
    ["GET", "/week/nothing.txt"],
    ["POST", "/a", JSON.stringify(VALID.open)],
    ["GET", "/a"],
    ["PUT", "/", "{}"],
    ["POST", "/", "{}"],
    ["GET", "/index"],
    ["GET", "/nothing-here"],
    ...(entry === "index" ? [["GET", "/boston/"], ["GET", "/seminar/"], ["GET", "/demo/"], ["GET", "/boston/?e=boston"], ["HEAD", "/boston/"]] : []),
  ];
}

/** What differs between two answers of one request (status, every header but `date`, every Set-Cookie, the bytes). */
function differences(where, a, b) {
  const out = [];
  if (a.status !== b.status) out.push(`${where}: ${a.status} with the var, ${b.status} without`);
  if (!isDeepStrictEqual(a.headers, b.headers)) out.push(`${where}: headers ${JSON.stringify(a.headers)} with the var, ${JSON.stringify(b.headers)} without`);
  if (!isDeepStrictEqual(a.cookies, b.cookies)) out.push(`${where}: Set-Cookie ${JSON.stringify(a.cookies)} with the var, ${JSON.stringify(b.cookies)} without`);
  if (!a.body.equals(b.body)) out.push(`${where}: ${a.body.length} bytes with the var, ${b.body.length} without, not the same`);
  return out;
}

/** Each image E1 names, as a Worker answered it (`ask(path)`): 200 and the built file's bytes. */
async function imageProblems(where, images, dir, askFor) {
  const out = [];
  for (const path of images) {
    const r = await askFor(path);
    const file = join(dir, path);
    if (!existsSync(file)) out.push(`${where}: control: the build wrote no ${path}`);
    else if (r.status !== 200 || !r.body.equals(await readFile(file))) out.push(`${where} GET ${path}: ${r.status} and ${r.body.length} bytes, not 200 and the built file's`);
  }
  return out;
}

/**
 * RD2 (§ 1 item 3), the Worker script itself (every request reaches it, as the development Worker's "/*\/" and a path
 * no asset matches do): with the var set, every request of otherRequests is answered exactly as with it absent; and each
 * image E1 names is 200 with the built file's bytes. Each Worker over its own target's build (production: the
 * production build; development: the development build) behind a fake ASSETS serving it.
 */
export async function otherPathProblems(root = ROOT, entries = ENTRIES) {
  const problems = [];
  const images = await emailImages(root);
  for (const entry of entries) {
    const dist = await builtDist(root, entry === "site" ? "prod" : "dev");
    try {
      const answers = {};
      for (const vars of [{ [VAR]: STORE }, {}]) {
        await eachWorker(root, [entry], { vars, assets: distAssets(dist.dir) }, async (site) => {
          const key = vars[VAR] ? "with" : "without";
          answers[key] = [];
          for (const [method, path, body] of await otherRequests(root, entry)) answers[key].push(await ask(site, path, { method, body }));
          if (vars[VAR]) problems.push(...(await imageProblems(`${entry}, the var set`, images, dist.dir, (p) => ask(site, p))));
        });
      }
      for (const [i, [method, path]] of (await otherRequests(root, entry)).entries()) problems.push(...differences(`${entry} ${method} ${path}`, answers.with[i], answers.without[i]));
    } finally {
      await dist.done();
    }
  }
  return problems;
}

/**
 * RD2, as wrangler.jsonc configures each Worker (wrangler's own translation, the real asset router: assets first but
 * the page's routes): production's over the production build, development's over its build; with the var as configured
 * (and control: it IS configured, the store's front page, in both environments) and without it, the same requests
 * answered the same, and each image E1 names 200 with the built file's bytes.
 */
export async function configuredOtherPathProblems(root = ROOT) {
  const problems = [];
  const { unstable_readConfig } = await import("wrangler");
  const images = await emailImages(root);
  for (const [env, target, entry] of [[undefined, "prod", "site"], ["dev", "dev", "index"]]) {
    const where = env ?? "production";
    const cfg = unstable_readConfig({ config: join(root, "wrangler.jsonc"), env }, { hideWarnings: true });
    if (cfg.vars?.[VAR] !== STORE) problems.push(`${where}: wrangler.jsonc's vars.${VAR} ${JSON.stringify(cfg.vars?.[VAR])}, not ${STORE}`);
    const dist = await builtDist(root, target);
    try {
      const answers = {};
      for (const redirectTo of [STORE, undefined]) {
        const site = await configuredSite({ env, distDir: dist.dir, root, redirectTo });
        try {
          const key = redirectTo ? "with" : "without";
          answers[key] = [];
          for (const [method, path, body] of await otherRequests(root, entry)) answers[key].push(await ask(site, path, { method, body }));
          if (redirectTo) {
            problems.push(...(await imageProblems(`${where} as configured`, images, dist.dir, (p) => ask(site, p))));
            for (const [path, want] of LOCATIONS.slice(0, 6)) problems.push(...redirectProblems(`${where} as configured GET ${path}`, await ask(site, path), want));
            problems.push(...redirectProblems(`${where} as configured HEAD /`, await ask(site, "/", { method: "HEAD" }), LOCATIONS[0][1]));
            problems.push(...redirectProblems(`${where} as configured GET www.eatfitaf.com/?e=boston`, await ask(site, "/?e=boston", { host: "www.eatfitaf.com" }), LOCATIONS[1][1]));
          }
        } finally {
          await site.dispose();
        }
      }
      for (const [i, [method, path]] of (await otherRequests(root, entry)).entries()) problems.push(...differences(`${where} as configured ${method} ${path}`, answers.with[i], answers.without[i]));
    } finally {
      await dist.done();
    }
  }
  return problems;
}

/** RD2's requests of the save step's routes (the development Worker's, and production's with `production` true). */
export const SAVE_STEP_REQUESTS = [
  ["GET", "/o/ZZZZ9999"],
  ["GET", "/o/abc"],
  ["GET", "/confirm/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ"],
  ["GET", "/api/save"],
  ["POST", "/api/save", "{"],
  ["GET", "/api/nothing"],
];

// ── RD3 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** RD3: the values of the var that are not an absolute https URL without a fragment (§ 1 item 1), and absent. */
export const NOT_A_TARGET = [
  ["absent", undefined],
  ["empty", ""],
  ["http", "http://fitafnutrition.com/"],
  ["not a url", "not a url"],
  ["a fragment", "https://fitafnutrition.com/#top"],
  ["an empty fragment", "https://fitafnutrition.com/#"],
  ["a path alone", "/meal-plans"],
  ["no scheme", "fitafnutrition.com"],
];

// ── RD4, RD5, RD8 ───────────────────────────────────────────────────────────────────────────────────────────────────

/** § 3's layout of the event, written here: blob1 redirect, blob2 s, blob3 country, blob4 device, blob6 qr, blob12 v,
 *  blob14 via; every other blob "", every double 0. */
const BLOB_COUNT = 14;
const BLOB = { event: 0, s: 1, country: 2, device: 3, qr: 5, v: 11, via: 13 };
const HEX16 = /^[0-9a-f]{16}$/;

/** § 3: one sample user agent of each kind the closed list names (a program, not a person), each matching that one. */
export const PROGRAM_AGENTS = [
  ["bot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
  ["crawl", "Mozilla/5.0 (compatible; ExampleCrawler/1.0)"],
  ["spider", "Mozilla/5.0 (compatible; Baiduspider/2.0)"],
  ["slurp", "Mozilla/5.0 (compatible; Yahoo! Slurp)"],
  ["preview", "LinkPreview/1.0"],
  ["facebookexternalhit", "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"],
  ["curl", "curl/8.4.0"],
  ["wget", "Wget/1.21.4"],
  ["python", "python-requests/2.31.0"],
  ["go-http-client", "Go-http-client/2.0"],
  ["headless", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36"],
];
/** People's browsers (counted, the control), with the device class § 1.4 gives each. */
export const PERSON_AGENTS = [
  ["phone", TEST_UA],
  ["phone", "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"],
  ["tablet", "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"],
  ["desktop", "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"],
];
/** RD4's counted requests: the query and the qr and via the point must carry. */
const COUNTED = [
  ["/", "", ""],
  ["/?e=boston", "boston", ""],
  ["/?e=boston&via=email", "boston", "email"],
  ["/?via=email", "", "email"],
  ["/?e=nope", "", ""],
  ["/?e=seminar&x=1", "seminar", ""],
];

/** What is wrong with `point` as § 3's event for a request whose qr and via are given, from the US on `device`. */
function pointProblems(where, point, { qr, via, device }) {
  const out = [];
  const blobs = point.blobs ?? [];
  if (blobs.length !== BLOB_COUNT) out.push(`${where}: ${blobs.length} blobs, not ${BLOB_COUNT}`);
  const want = Array(BLOB_COUNT).fill("");
  Object.assign(want, { [BLOB.event]: "redirect", [BLOB.country]: "US", [BLOB.device]: device, [BLOB.qr]: qr, [BLOB.via]: via });
  want.forEach((value, i) => {
    if (i === BLOB.s || i === BLOB.v) {
      if (!HEX16.test(String(blobs[i]))) out.push(`${where}: blob${i + 1} ${JSON.stringify(blobs[i])}, not 16 hex digits`);
    } else if (blobs[i] !== value) out.push(`${where}: blob${i + 1} ${JSON.stringify(blobs[i])}, not ${JSON.stringify(value)}`);
  });
  if (!isDeepStrictEqual(point.doubles, [0, 0, 0])) out.push(`${where}: doubles ${JSON.stringify(point.doubles)}, not [0,0,0]`);
  const index = point.indexes ?? [];
  if (index.length !== 1 || !HEX16.test(String(index[0])) || index[0] === blobs[BLOB.v]) out.push(`${where}: indexes ${JSON.stringify(index)}, not the point's own 16 hex digits`);
  return out;
}

/**
 * RD4 (§ 3, § 1 item 6): with the var set, on each Worker, one counted GET of each COUNTED request is the 302 and
 * exactly one data point, its blobs as § 3 (blob2 16 hex digits, new for each request), written after the answer (none
 * at the moment it was returned); its `v` the visitor's, the same as a beacon of the same sender the same day (POST /a).
 * None for the cookie at "1" (each of N3's Cookie headers), a HEAD, and each kind of user agent in the list, the 302
 * the same in every case and SALTS untouched. People's browsers are counted, each its device. And the beacon refuses the
 * Worker's own event: POST /a carrying a `redirect` writes nothing.
 */
export async function dataPointProblems(root = ROOT, entries = ENTRIES) {
  const problems = [];
  await eachWorker(root, entries, { vars: { [VAR]: STORE } }, async (site, entry) => {
    const seen = new Set();
    for (const [path, qr, via] of COUNTED) {
      const where = `${entry} GET ${path}`;
      const r = await ask(site, path);
      if (r.status !== 302) problems.push(`${where}: ${r.status}, not 302`);
      const log = await site.log();
      if (log.points.length !== 1) {
        problems.push(`${where}: ${log.points.length} data point(s), not 1`);
        continue;
      }
      if (log.answered[0] !== 0) problems.push(`${where}: ${log.answered[0]} point(s) written before the answer was returned, not 0 (after it, ctx.waitUntil)`);
      problems.push(...pointProblems(where, log.points[0], { qr, via, device: "phone" }));
      const s = log.points[0].blobs?.[BLOB.s];
      if (seen.has(s)) problems.push(`${where}: s ${s} again, not new for this request`);
      seen.add(s);
    }
    // The same visitor on the same day: the redirect's v is the v POST /a writes for the same sender.
    await ask(site, "/");
    const [redirectPoint] = (await site.log()).points;
    await site.post(VALID.open);
    const [beaconPoint] = (await site.log()).points;
    if (!redirectPoint || !beaconPoint || redirectPoint.blobs?.[BLOB.v] !== beaconPoint.blobs?.[BLOB.v]) {
      problems.push(`${entry}: the redirect's v ${JSON.stringify(redirectPoint?.blobs?.[BLOB.v])}, the beacon's ${JSON.stringify(beaconPoint?.blobs?.[BLOB.v])}: not the same visitor's`);
    }
    const uncounted = [
      ...CARRYING.map((cookie) => [`Cookie ${JSON.stringify(cookie)}`, "/?e=boston", { cookie }]),
      ["HEAD", "/?e=boston", { method: "HEAD" }],
      ...PROGRAM_AGENTS.map(([kind, ua]) => [`a user agent naming ${kind}`, "/?e=boston", { ua }]),
    ];
    for (const [label, path, options] of uncounted) {
      const where = `${entry} ${label}`;
      const r = await ask(site, path, options);
      const log = await site.log();
      if (r.status !== 302 || r.location !== LOCATIONS[1][1]) problems.push(`${where}: ${r.status} to ${r.location}, not the 302 to ${LOCATIONS[1][1]}`);
      if (log.points.length) problems.push(`${where}: written (${log.points.length} data point(s))`);
      if (log.gets.length || log.puts.length) problems.push(`${where}: SALTS used (${log.gets.length} read(s), ${log.puts.length} write(s))`);
    }
    for (const [device, ua] of PERSON_AGENTS) {
      const where = `${entry} a person's browser (${device}) (control)`;
      await ask(site, "/", { ua });
      const log = await site.log();
      if (log.points.length !== 1) problems.push(`${where}: ${log.points.length} data point(s), not 1`);
      else if (log.points[0].blobs?.[BLOB.device] !== device) problems.push(`${where}: device ${JSON.stringify(log.points[0].blobs?.[BLOB.device])}, not ${device}`);
    }
    const forged = await site.post({ event: "redirect", s: S1, qr: "", via: "" });
    const log = await site.log();
    if (forged.status !== 204 || log.points.length) problems.push(`${entry} POST /a carrying a redirect: ${forged.status} and ${log.points.length} data point(s), not 204 and none (the Worker's own event)`);
  });
  return problems;
}

/** RD5's request: a known IP and user agent (A4's), a query and a referrer. */
export const RD5_QUERY = "e=boston&via=email&secret=x";
export const RD5_REFERER = "https://referrer.example/from/here?ref=1";
const RD5_NEEDLES = [TEST_IP, "203.0.113", TEST_UA, TEST_UA_TOKEN, "Mozilla/5.0", RD5_QUERY, "secret", "?", "&", "=", "referrer.example", "/from/here", "ref=1", "/"];
/** Every field of a data point, as text. */
const fieldsOf = (point) => [...(point.blobs ?? []), ...(point.indexes ?? []), ...(point.doubles ?? [])].map(String);
const needlesIn = (point) => fieldsOf(point).flatMap((field) => RD5_NEEDLES.filter((n) => field.includes(n)).map((n) => [n, field]));

/**
 * RD5 (§ 3, § 1 item 5; SPEC-analytics.md § 1's bar): a counted request with a known IP, user agent, query
 * (`?e=boston&via=email&secret=x`) and referrer writes one data point, and no field of it (blob, index, double) contains
 * any of them, nor a piece of the query's or the path's syntax; and the Location carries none of the visitor's query but
 * what § 2 derives (not `secret`). Control: the search finds each needle planted in a copy of the point.
 */
export async function identifyingProblems(root = ROOT, entries = ENTRIES) {
  const problems = [];
  await eachWorker(root, entries, { vars: { [VAR]: STORE } }, async (site, entry) => {
    const r = await ask(site, `/?${RD5_QUERY}`, { referer: RD5_REFERER });
    if (r.location !== M("utm_medium=email&utm_campaign=boston")) problems.push(`${entry}: Location ${JSON.stringify(r.location)}, not § 2's (the visitor's query passed on)`);
    if (r.location?.includes("secret")) problems.push(`${entry}: the Location carries the visitor's query: ${r.location}`);
    const { points } = await site.log();
    if (points.length !== 1) {
      problems.push(`${entry}: ${points.length} data point(s), not 1 (control)`);
      return;
    }
    for (const [needle, field] of needlesIn(points[0])) problems.push(`${entry}: a field carries ${JSON.stringify(needle)}: ${JSON.stringify(field)}`);
    for (const needle of RD5_NEEDLES) {
      const planted = { ...points[0], blobs: [...points[0].blobs.slice(0, -1), `x${needle}x`] };
      if (!needlesIn(planted).some(([n]) => n === needle)) problems.push(`${entry}: control: a planted ${JSON.stringify(needle)} not found`);
    }
  });
  return problems;
}

/** RD8 (§ 1 item 6): ANALYTICS (and SALTS) unbound, and a writeDataPoint that throws: still the 302, the same Location. */
export async function failingWriteProblems(root = ROOT, entries = ENTRIES) {
  const problems = [];
  await eachWorker(root, entries, { vars: { [VAR]: STORE }, bindings: false }, async (site, entry) => {
    for (const [path, want] of LOCATIONS.slice(0, 6)) problems.push(...redirectProblems(`${entry}, ANALYTICS and SALTS unbound, GET ${path}`, await ask(site, path), want));
    const { points } = await site.log();
    if (points.length) problems.push(`${entry}, unbound: ${points.length} data point(s)`);
  });
  await eachWorker(root, entries, { vars: { [VAR]: STORE } }, async (site, entry) => {
    for (const [path, want] of LOCATIONS.slice(0, 6)) problems.push(...redirectProblems(`${entry}, writeDataPoint throwing, GET ${path}`, await ask(site, path, { failWrite: true }), want));
    const log = await site.log();
    if (log.points.length) problems.push(`${entry}, writeDataPoint throwing: ${log.points.length} data point(s) recorded`);
    if (!log.gets.length) problems.push(`${entry}, writeDataPoint throwing: control: the write was tried (the day's salt read)`);
    await ask(site, "/");
    if ((await site.log()).points.length !== 1) problems.push(`${entry}: control: the next request written`);
  });
  return problems;
}

// ── RD6 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * RD6 (§ 1 item 4): with the var set, § 12's switch first: GET "/?no-tracking" (and with another parameter) is § 12's
 * 302 to "/" (the parameter removed) with its cookie, and "/?tracking" its clearing cookie, not the store, nothing
 * written; the next GET "/" carrying the cookie is the store's 302, no Set-Cookie, nothing written; without it, written
 * (control).
 */
export async function switchFirstProblems(root = ROOT, entries = ENTRIES) {
  const problems = [];
  const HOST = "https://eatfitaf.com";
  await eachWorker(root, entries, { vars: { [VAR]: STORE } }, async (site, entry) => {
    for (const [path, want, cookie] of [
      ["/?no-tracking", `${HOST}/`, NO_TRACKING_SET],
      ["/?e=boston&no-tracking", `${HOST}/?e=boston`, NO_TRACKING_SET],
      ["/?tracking", `${HOST}/`, NO_TRACKING_CLEAR],
    ]) {
      const r = await ask(site, path);
      const where = `${entry} GET ${path}`;
      if (r.status !== 302 || new URL(r.location ?? "", HOST + path).href !== want) problems.push(`${where}: ${r.status} to ${r.location}, not § 12's 302 to ${want}`);
      if (!isDeepStrictEqual(r.cookies, [cookie])) problems.push(`${where}: Set-Cookie ${JSON.stringify(r.cookies)}, not ${JSON.stringify([cookie])}`);
      if ((await site.log()).points.length) problems.push(`${where}: a data point written`);
    }
    for (const [path, want] of LOCATIONS.slice(0, 2)) {
      const where = `${entry} GET ${path} carrying the cookie`;
      problems.push(...redirectProblems(where, await ask(site, path, { cookie: NO_TRACKING_SENT }), want));
      if ((await site.log()).points.length) problems.push(`${where}: a data point written`);
    }
    await ask(site, "/");
    if ((await site.log()).points.length !== 1) problems.push(`${entry} GET / without the cookie: control: not written`);
  });
  return problems;
}

// ── RD7 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Every link of an offer page's body (the logo apart: pages.js's, on every Worker page, not § 4's list) that leads to
 *  the home page, as written (`&amp;` read as `&`). */
export function homeLinks(html) {
  return [...html.matchAll(/<a\b([^>]*)\bhref="([^"]*)"/g)]
    .filter((m) => !/\bclass="logo"/.test(m[1]))
    .map((m) => m[2].replaceAll("&amp;", "&"))
    .filter((href) => new URL(href, "https://eatfitaf.com/o/ABCD2345").pathname === "/");
}

/** § 4: the link the offer page of `kind` names, for the save's event `qr` ("" when none). */
export const wantedLink = (kind, qr) => (qr ? `/?e=${qr}&via=email${kind === "saved" || kind === "welcome" ? "#from-email" : ""}` : "/?via=email");

/**
 * RD7 (§ 4): every offer page EM-A1 asks (each kind, each event, an unknown code, an ended offer, a welcome page) has
 * exactly one link to the home page (the logo apart), and it is § 4's: `via=email` in the query, before the fragment,
 * the fragment where it was. And the plan page served at such a link ignores the query's `via` (its `open`'s via still
 * the fragment's, § 16 item 2): opened at `?e=boston&via=email#from-email`, via "email"; at `?e=boston&via=email` and at
 * `?via=email` alone, via "" (the qr the `e` names). EM-A1 and EM-A2 run as their own cases, unchanged.
 */
export async function offerLinkProblems(root = ROOT) {
  const problems = [];
  const pages = await offerPages(root);
  for (const p of pages) {
    if (p.problem || p.status !== 200) {
      problems.push(`${p.label}: control: ${p.problem ?? p.status}`);
      continue;
    }
    const links = homeLinks(p.html);
    const want = wantedLink(p.kind, p.qr);
    if (!isDeepStrictEqual(links, [want])) problems.push(`${p.label} (${p.kind}): links to the home page ${JSON.stringify(links)}, not ${JSON.stringify([want])}`);
  }
  for (const target of ["prod", "dev"]) {
    const html = await builtPage({ root, target });
    for (const [search, hash, qr, via] of [
      ["?e=boston&via=email", "#from-email", "boston", "email"],
      ["?e=boston&via=email", "", "boston", ""],
      ["?via=email", "", "", ""],
    ]) {
      const opens = openVisit(html, { search, hash, clock: 400 }).beacons.map((b) => b.body).filter((b) => b.event === "open");
      if (opens.length !== 1 || opens[0].via !== via || opens[0].qr !== qr) problems.push(`${target}, opened at /${search}${hash}: ${JSON.stringify(opens)}, not one open with qr ${JSON.stringify(qr)} and via ${JSON.stringify(via)}`);
    }
  }
  return problems;
}

// ── RD9 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The data point's layout (SPEC-analytics.md §§ 10, 15, 16; SPEC-the-redirect.md § 3: no new blob), written here. */
const LAYOUT = ["event", "s", "country", "device", "viewport", "qr", "question", "answer", "key", "link", "step", "v", "kind", "via"];
const DOUBLE_LAYOUT = ["load_ms", "length_ms", "mpid"];

/** RD9's fixture's points (test/fixtures/analytics/points-redirect.json, invented), each placed in its column. */
export async function redirectPoints() {
  const { points } = JSON.parse(await readFile(join(ROOT, "test", "fixtures", "analytics", "points-redirect.json"), "utf8"));
  return points.map((p, i) => {
    const row = { timestamp: Date.parse(p.at), index1: (i + 1).toString(16).padStart(16, "d"), _sample_interval: 1 };
    for (const [name, value] of Object.entries(p)) {
      if (name === "at") continue;
      const b = LAYOUT.indexOf(name);
      const d = DOUBLE_LAYOUT.indexOf(name);
      if (b >= 0) row[`blob${b + 1}`] = String(value);
      else if (d >= 0) row[`double${d + 1}`] = Number(value);
      else throw new Error(`the fixture's point ${i + 1} names ${name}, which the layout has not`);
    }
    return row;
  });
}

/** The report of `root` over `rows`, every query's SQL evaluated here (em-a-checks evaluate). */
async function reportOf(root, args, rows) {
  const { report } = await import(pathToFileURL(join(root, "scripts", "analytics.mjs")).href);
  const fetch = async (_url, init = {}) => new Response(JSON.stringify(evaluate(String(init.body), rows)), { status: 200, headers: { "content-type": "application/json" } });
  let out = "";
  let err = "";
  const code = await report({ args, env: { CLOUDFLARE_ANALYTICS_TOKEN: "test-token", CLOUDFLARE_ACCOUNT_ID: "test-account" }, fetch, out: { write: (s) => (out += s) }, err: { write: (s) => (err += s) } });
  return { code, out, err };
}

export const RD9_RANGE = ["--from", "2026-10-26", "--to", "2026-10-28"];
/** By hand from the fixture (§ 5): each day's plan-page visitors and visits (a redirect-only visit not among them) and
 *  its redirects (absent on a day without one). */
export const RD9_WANT = {
  "2026-10-26": { visitors: 1, visits: 1, redirects: { count: 3, source: { boston: 1, email: 1, direct: 1 }, device: { phone: 2, desktop: 1 } } },
  "2026-10-27": { visitors: 0, visits: 0, redirects: { count: 3, source: { seminar: 1, email: 1, direct: 1 }, device: { phone: 2, tablet: 1 } } },
  "2026-10-28": { visitors: 1, visits: 1 },
};
/** The control, by hand: every row counted (the base, and the mutant). */
const RD9_EVERY_ROW = { "2026-10-26": { visitors: 4, visits: 4 }, "2026-10-27": { visitors: 3, visits: 3 }, "2026-10-28": { visitors: 1, visits: 1 } };
/** The text's line for a day's redirects, two spaces in. */
export const REDIRECT_LINE = /^ {2}redirects to the store \d+ \(by source: .+; by device: .+\)$/;

const withoutRedirectLines = (text) => text.split("\n").filter((l) => !REDIRECT_LINE.test(l)).join("\n");
const withoutMember = (day) => Object.fromEntries(Object.entries(day).filter(([k]) => k !== "redirects"));
/** A day's earlier figures with no plan-page visit (`like` a day with data, for its funnel's steps). */
const noVisit = (day, like) => ({
  day, data: true, visitors: 0, visits: 0, funnel: like.funnel.map(({ step }) => ({ step, visits: 0 })), clicks: {}, saves: 0,
  offer_pages: {}, email_visits: 0, visit_length_ms: null, load_ms: null, device: {}, viewport: {}, country: {}, errors: 0,
});
/** The text's blocks, by day. */
function dayBlocks(text) {
  const out = {};
  let day = null;
  for (const line of text.split("\n")) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(line)) out[(day = line)] = [];
    else if (day) out[day].push(line);
  }
  return Object.fromEntries(Object.entries(out).map(([d, lines]) => [d, lines.join("\n")]));
}

/**
 * RD9 (§ 5): the report of the package at `root` over the fixture's points (redirect-only visits beside plan-page visits,
 * an offer page, a day of redirects alone, a day without one), its SQL evaluated here:
 *   - each day's visitors and visits, and its `redirects` (count, by source and by device) as RD9_WANT, in the document
 *     and in the text's line; a day without a redirect has neither the member nor the line;
 *   - every earlier figure as without them: the document's day without `redirects` equal to the report's over the points
 *     without the redirect rows (a day of redirects alone: the figures of no plan-page visit); the text without the
 *     redirect lines that report's, day by day, and the base's (`base`, SPEC-the-redirect.md's contract commit, § 16's
 *     report) byte for byte over the points without the redirect rows and over each of AJ's answer sets;
 *   - the document's shape (AJ4's walk) and the text's figures (AJ's parseText) agree;
 *   - control: the base over every row counts the redirects as visits (RD9_EVERY_ROW).
 */
export async function reportProblems(root = ROOT, base) {
  const problems = [];
  const points = await redirectPoints();
  const pagesOnly = points.filter((r) => r.blob1 !== "redirect");
  if (pagesOnly.length === points.length) problems.push("control: the fixture holds no redirect row");
  const run = async (label, pkg, args, rows) => {
    try {
      const r = await reportOf(pkg, args, rows);
      if (r.code !== 0) problems.push(`${label}: exit ${r.code}: ${r.err.trim()}`);
      return r;
    } catch (error) {
      problems.push(`${label}: ${error.message}`);
      return null;
    }
  };
  const doc = JSON.parse((await run("the points", root, [...RD9_RANGE, "--json"], points))?.out || "null");
  const doc0 = JSON.parse((await run("the points without redirect rows", root, [...RD9_RANGE, "--json"], pagesOnly))?.out || "null");
  const text = (await run("the points, text", root, RD9_RANGE, points))?.out ?? "";
  const text0 = (await run("the points without redirect rows, text", root, RD9_RANGE, pagesOnly))?.out ?? "";
  const baseText0 = (await run("the base, the points without redirect rows", base, RD9_RANGE, pagesOnly))?.out ?? "";
  const baseDoc = JSON.parse((await run("the base, every row", base, [...RD9_RANGE, "--json"], points))?.out || "null");
  if (!doc || !doc0 || !baseDoc) return problems;
  for (const [day, want] of Object.entries(RD9_EVERY_ROW)) {
    const d = baseDoc.days.find((x) => x.day === day);
    if (d?.visitors !== want.visitors || d?.visits !== want.visits) problems.push(`control: ${day}: the base over every row counts ${d?.visitors} visitors and ${d?.visits} visits, not ${want.visitors} and ${want.visits}`);
  }
  const like = doc0.days.find((d) => d.data);
  for (const [day, want] of Object.entries(RD9_WANT)) {
    const d = doc.days.find((x) => x.day === day);
    if (!d?.data) {
      problems.push(`${day}: the document's day has no data: ${JSON.stringify(d)}`);
      continue;
    }
    for (const key of ["visitors", "visits"]) if (d[key] !== want[key]) problems.push(`${day}: ${key} ${JSON.stringify(d[key])}, not ${want[key]}`);
    if (!isDeepStrictEqual(d.redirects, want.redirects)) problems.push(`${day}: redirects ${JSON.stringify(d.redirects)}, not ${JSON.stringify(want.redirects)}`);
    const d0 = doc0.days.find((x) => x.day === day);
    const before = d0?.data ? d0 : like ? noVisit(day, like) : null;
    if (!isDeepStrictEqual(withoutMember(d), before)) problems.push(`${day}: the earlier figures are not as without the redirects: ${JSON.stringify(withoutMember(d))}, not ${JSON.stringify(before)}`);
  }
  for (const p of walkProblems(doc)) problems.push(`the document's shape: ${p}`);
  try {
    for (const t of parseText(text).days) {
      const d = doc.days.find((x) => x.day === t.day);
      if (!isDeepStrictEqual(t.redirects, d?.redirects)) problems.push(`${t.day}: the text's redirects ${JSON.stringify(t.redirects)}, the document's ${JSON.stringify(d?.redirects)}`);
    }
  } catch (error) {
    problems.push(`the text: ${error.message}`);
  }
  const lines = text.split("\n").filter((l) => REDIRECT_LINE.test(l)).length;
  const daysWith = Object.values(RD9_WANT).filter((w) => w.redirects).length;
  if (lines !== daysWith) problems.push(`the text prints ${lines} redirect line(s), not ${daysWith} (one a day with redirects)`);
  if (text0 !== baseText0) problems.push("the points without redirect rows: the text is not the base's byte for byte");
  const blocks = dayBlocks(withoutRedirectLines(text));
  const blocks0 = dayBlocks(text0);
  for (const day of Object.keys(RD9_WANT)) {
    if (blocks0[day]?.trim() === "no data") continue;
    if (blocks[day] !== blocks0[day]) problems.push(`${day}: the text, its redirect line removed, is not as without the redirects:\n${blocks[day]}\n---\n${blocks0[day]}`);
  }
  for (const [label, answers, args] of runs(await fixtureAnswers())) {
    const mine = await runAt(root, args, answers);
    const theirs = await runAt(base, args, answers);
    if (mine.code !== 0 || theirs.code !== 0) problems.push(`AJ's ${label}: exit ${mine.code}, the base's ${theirs.code}: ${(mine.err + theirs.err).trim()}`);
    else if (mine.out !== theirs.out) problems.push(`AJ's ${label}: the text is not the base's byte for byte (a window with no redirect row)`);
  }
  return problems;
}
