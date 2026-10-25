// The checks of N1–N4 (SPEC-analytics.md § 12 item 6: a tester's browser sends no analytics, `?no-tracking`), as
// functions over a PACKAGE (`root`: this one, or a mirror of it), each returning one line per thing the package gets
// wrong ([] when it is right). The cases run them on this package; the mutants (n-mutants.test.mjs) run THE SAME checks
// on a mirror carrying one mutation each. Not a test file itself. Every expectation is the contract's, written here,
// never read back from the code under test. No request leaves the machine: the Workers run in Miniflare, production's
// (src/worker/site.js) and the development Worker (src/worker/index.js), through wc-harness's startSite (a fake ASSETS
// answering the page's routes) and a-harness's startBeacon (SALTS and ANALYTICS recorded).
import { ROOT } from "../build.mjs";
import { startBeacon, VALID } from "./a-harness.mjs";
import { pageAsset, startSite } from "./wc-harness.mjs";

/** § 12 item 1, "switching it on": the cookie set, exactly these attributes. */
export const NO_TRACKING_SET = "fitaf_no_tracking=1; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Lax";
/** § 12 item 2, "switching it off": the cookie cleared. */
export const NO_TRACKING_CLEAR = "fitaf_no_tracking=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax";
/** § 12 item 3: the cookie as a browser sends it back to POST /a. */
export const NO_TRACKING_SENT = "fitaf_no_tracking=1";
/** § 12 item 1: "either Worker": production's and the development Worker. */
export const WORKERS = ["site", "index"];
/** The address the cases ask (a Location is resolved against the request's own URL, as a browser resolves it). */
export const HOST = "https://eatfitaf.com";

/** A page, as the assets serve it at each of the page's routes: "/", an event page, and the assets' own 307 for
 *  /index.html (wrangler.jsonc's `assets.run_worker_first`). */
const PAGE = "<!doctype html><title>n</title><p>the page</p>";
export const PAGE_ROUTES = {
  "/": pageAsset(PAGE),
  "/boston/": pageAsset(PAGE),
  "/index.html": { status: 307, headers: { location: "/" }, body: null },
};

/** N1: a page request naming `no-tracking` (any value, or none), and the URL its 302 must name: the same URL without
 *  it, every other parameter kept, in order, as written. The same URL is on the same host: a path that begins "//" stays
 *  a path (a Location naming it as written would name another host). */
export const SWITCH_ON = [
  ["/?no-tracking", "/"],
  ["/?no-tracking=1", "/"],
  ["/?no-tracking=", "/"],
  ["/?no-tracking=0", "/"],
  ["/?e=boston&no-tracking", "/?e=boston"],
  ["/?no-tracking&e=boston", "/?e=boston"],
  ["/?b=2&no-tracking&a=1", "/?b=2&a=1"],
  ["/?e=seminar&no-tracking=yes&from=flyer%20a", "/?e=seminar&from=flyer%20a"],
  ["/index.html?no-tracking", "/index.html"],
  ["/boston/?no-tracking", "/boston/"],
  ["/boston/?e=boston&no-tracking", "/boston/?e=boston"],
  ["//other.example/?no-tracking", `${HOST}//other.example/`],
];

/** N2: a page request naming `tracking` (any value, or none), or both (off wins), and the URL its 302 must name. */
export const SWITCH_OFF = [
  ["/?tracking", "/"],
  ["/?tracking=1", "/"],
  ["/?e=boston&tracking", "/?e=boston"],
  ["/?no-tracking&tracking", "/"],
  ["/?tracking&no-tracking", "/"],
  ["/?e=boston&no-tracking=1&from=flyer&tracking=", "/?e=boston&from=flyer"],
  ["/boston/?tracking", "/boston/"],
  ["//other.example/?tracking", `${HOST}//other.example/`],
];

/** Not either parameter: a value that is one, a longer name, a name that ends in one. Answered as today: the page. */
export const NOT_A_SWITCH = ["/?e=no-tracking", "/?e=tracking", "/?no-trackings", "/?xno-tracking=1", "/?trackings"];

/** GET `path` of a started Worker (wc-harness startSite), with the cookie `cookie` if given: its status, Location and
 *  every Set-Cookie header (each one, as the platform sends each). */
async function ask(site, path, { cookie } = {}) {
  const res = await site.mf.dispatchFetch(HOST + path, { redirect: "manual", headers: cookie ? { cookie } : {} });
  await res.arrayBuffer();
  return { status: res.status, location: res.headers.get("location"), cookies: res.headers.getSetCookie() };
}

/** What is wrong with `r`, the answer to GET `path`, as § 12's 302 to `want` setting `cookie`. A Location is the URL a
 *  browser goes to (resolved against the request's); it names no fragment, so a browser keeps the request's own. */
function redirectProblems(where, r, path, want, cookie) {
  const out = [];
  if (r.status !== 302) out.push(`${where}: ${r.status}, not 302`);
  if (r.location === null) out.push(`${where}: no Location`);
  else {
    const to = new URL(r.location, HOST + path).href;
    const expected = new URL(want, HOST).href;
    if (to !== expected) out.push(`${where}: Location ${JSON.stringify(r.location)} is ${to}, not ${expected}`);
    if (r.location.includes("#")) out.push(`${where}: Location ${JSON.stringify(r.location)} names a fragment`);
  }
  if (JSON.stringify(r.cookies) !== JSON.stringify([cookie])) out.push(`${where}: Set-Cookie ${JSON.stringify(r.cookies)}, not ${JSON.stringify([cookie])}`);
  return out;
}

/** What is wrong with `r` as the page answered as today (no 302, no cookie). */
function pageProblems(where, r) {
  const out = [];
  if (r.status !== 200) out.push(`${where}: ${r.status}, not the page's 200`);
  if (r.cookies.length) out.push(`${where}: Set-Cookie ${JSON.stringify(r.cookies)}, not none`);
  return out;
}

/** Each Worker of `entries` of the package at `root`, its fake ASSETS the page's routes, given to `fn(site, entry)`. */
async function eachWorker(root, entries, fn) {
  for (const entry of entries) {
    const site = await startSite({ root, entry, assets: PAGE_ROUTES });
    try {
      await fn(site, entry);
    } finally {
      await site.dispose();
    }
  }
}

/** N1: on each Worker, every SWITCH_ON request is a 302 to its URL setting NO_TRACKING_SET; NOT_A_SWITCH's are the page,
 *  no cookie (control). */
export async function switchOnProblems(root = ROOT, entries = WORKERS) {
  const problems = [];
  await eachWorker(root, entries, async (site, entry) => {
    for (const [path, want] of SWITCH_ON) problems.push(...redirectProblems(`${entry} GET ${path}`, await ask(site, path), path, want, NO_TRACKING_SET));
    for (const path of NOT_A_SWITCH) problems.push(...pageProblems(`${entry} GET ${path} (not the parameter)`, await ask(site, path)));
  });
  return problems;
}

/** N2: on each Worker, every SWITCH_OFF request is a 302 to its URL clearing the cookie (NO_TRACKING_CLEAR), whether the
 *  browser carries the cookie or not; and a page request carrying the cookie, naming neither, is the page (control). */
export async function switchOffProblems(root = ROOT, entries = WORKERS) {
  const problems = [];
  await eachWorker(root, entries, async (site, entry) => {
    for (const cookie of [undefined, NO_TRACKING_SENT]) {
      const carrying = cookie ? ", carrying the cookie" : "";
      for (const [path, want] of SWITCH_OFF) problems.push(...redirectProblems(`${entry} GET ${path}${carrying}`, await ask(site, path, { cookie }), path, want, NO_TRACKING_CLEAR));
    }
    problems.push(...pageProblems(`${entry} GET / carrying the cookie (control)`, await ask(site, "/", { cookie: NO_TRACKING_SENT })));
  });
  return problems;
}

/** POST `body` to /a of a started Worker (a-harness startBeacon), from a documentation address, in the US, with the
 *  Cookie header `cookie` if given: its status. */
async function beacon(site, body, { cookie } = {}) {
  const headers = { "cf-connecting-ip": "203.0.113.9", "user-agent": "N-probe-agent/1.0", "content-type": "text/plain;charset=UTF-8" };
  if (cookie !== undefined) headers.cookie = cookie;
  const res = await site.mf.dispatchFetch(`${HOST}/a`, { method: "POST", headers, body: JSON.stringify(body), cf: { country: "US" }, redirect: "manual" });
  await res.arrayBuffer();
  return res.status;
}

/** N3's Cookie headers: the cookie alone, and among others (first, last). */
export const CARRYING = [NO_TRACKING_SENT, `theme=dark; ${NO_TRACKING_SENT}`, `${NO_TRACKING_SENT}; theme=dark`];

/** N3: on each Worker, POST /a with every valid event of § 3, carrying the cookie (each of CARRYING), is a 204 with
 *  nothing done: no data point, the salt neither read nor written (SALTS untouched, no key in it after). */
export async function uncountedProblems(root = ROOT, entries = WORKERS) {
  const problems = [];
  for (const entry of entries) {
    const site = await startBeacon({ root, entry });
    try {
      await site.log();
      for (const cookie of CARRYING) {
        for (const [name, body] of Object.entries(VALID)) {
          const where = `${entry} POST /a ${name}, Cookie ${JSON.stringify(cookie)}`;
          const status = await beacon(site, body, { cookie });
          if (status !== 204) problems.push(`${where}: ${status}, not 204`);
          const log = await site.log();
          if (log.points.length) problems.push(`${where}: written (${log.points.length} data point(s))`);
          if (log.gets.length || log.puts.length) problems.push(`${where}: SALTS used (${log.gets.length} read(s), ${log.puts.length} write(s))`);
          if (log.keys.length) problems.push(`${where}: SALTS holds ${log.keys.map((k) => k.name).join(", ")}`);
        }
      }
    } finally {
      await site.dispose();
    }
  }
  return problems;
}

/** N4's Cookie headers that are not the cookie at "1": "any other value of the cookie, or none, is today's path". */
export const NOT_CARRYING = [undefined, "fitaf_no_tracking=0", "fitaf_no_tracking=", "fitaf_no_tracking=true", "fitaf_no_tracking=11", "xfitaf_no_tracking=1", "theme=dark"];

/** N4 (the control): on each Worker, POST /a with every valid event, carrying no cookie or not the cookie at "1" (each of
 *  NOT_CARRYING), is a 204 with one data point, the day's salt read. */
export async function countedProblems(root = ROOT, entries = WORKERS) {
  const problems = [];
  for (const entry of entries) {
    const site = await startBeacon({ root, entry });
    try {
      await site.log();
      for (const cookie of NOT_CARRYING) {
        for (const [name, body] of Object.entries(VALID)) {
          const where = `${entry} POST /a ${name}, ${cookie === undefined ? "no Cookie" : `Cookie ${JSON.stringify(cookie)}`}`;
          const status = await beacon(site, body, { cookie });
          if (status !== 204) problems.push(`${where}: ${status}, not 204`);
          const log = await site.log();
          if (log.points.length !== 1) problems.push(`${where}: ${log.points.length} data point(s), not 1`);
          if (!log.gets.length) problems.push(`${where}: the day's salt not read`);
        }
      }
    } finally {
      await site.dispose();
    }
  }
  return problems;
}
