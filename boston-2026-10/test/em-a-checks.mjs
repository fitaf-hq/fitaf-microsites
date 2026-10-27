// The checks of EM-A1 to EM-A5 (SPEC-analytics.md § 16: the offer email's clicks, and its visitors as their own source),
// as functions over a PACKAGE (`root`: this one, or a mirror of it), each returning one line per thing the package gets
// wrong ([] when it is right). The cases run them on this package; the mutants (em-a-mutants.test.mjs) run THE SAME
// checks on a mirror carrying one mutation each. Not a test file itself. (The file names are em-a*, not em-*: the EM
// cases of SPEC-every-menu-and-nutrition hold em-01 to em-08 and em-checks.mjs.)
//
// Every expectation is the contract's, written here, never read back from the code under test. What is read from the
// code is the Worker's own check, `checkedEvent` (each event the pages send "accepted", as F2 and SV1 read it), and, for
// the report, its own SQL, which is EVALUATED here over invented data points by ClickHouse's meaning of the forms the
// report uses (a form this file does not read fails the case, naming it); the SQL was never run against Cloudflare.
//
// - THE OFFER PAGE (/o/<code>, src/worker/redeem.js) is fetched from the development Worker in Miniflare (worker-harness
//   startWorker: D1, the rate limiters, the test clock), its `main` the package's own src/worker/index.js; its scripts are
//   then run in a-harness's stub window, which records every read of the page's address (`watchLocation`).
// - THE PLAN PAGE is the package's own build (a-harness builtPage), run in the same stub.
// - THE WORKER's POST /a is a-harness's startBeacon (both entries, SALTS and ANALYTICS recorded).
import { spawnSync } from "node:child_process";
import { readFile, symlink } from "node:fs/promises";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { ROOT } from "../build.mjs";
import { insertRows, saveRows } from "../scripts/dummy-saves.mjs";
import { validateSave } from "../src/worker/validate-save.js";
import { builtPage, openVisit, S1, startBeacon, TEST_IP, TEST_UA } from "./a-harness.mjs";
import { needlesIn } from "./a-checks.mjs";
import { ENV, fixtureAnswers, runAt, runs } from "./aj-checks.mjs";
import { fetchPage, PAST_OFFER, PAST_OFFER_ID, postSave, startWorker, TEST_NOW_MS, validSave } from "./worker-harness.mjs";

/** § 16 item 1: the offer page's kinds, the contract's words: the save's offer live, ended with the current offer shown,
 *  an unknown code, no offer current. */
export const KINDS = ["saved", "welcome", "current", "ended"];
/** § 16 item 1: `qr`, the save's event id, one of data/events.json's (the contract names demo, boston and seminar). */
export const EVENT_IDS = ["demo", "boston", "seminar"];
/** § 16 item 2: the fragment the offer page's link opens the plan page at, and the value it gives `via`. */
export const FROM_EMAIL = "#from-email";
export const EMAIL = "email";
/** § 16 item 1: an `offer` carries `s`, `qr` and `kind`, nothing else. */
const OFFER_KEYS = ["event", "s", "qr", "kind"];
/** § 2: a visit id, 16 hex digits. */
const HEX16 = /^[0-9a-f]{16}$/;
/** The two Workers, by entry: production's and the development Worker. */
export const ENTRIES = ["site", "index"];
/** § 12 item 3: the cookie as a browser sends it back to POST /a, alone and among others (N3's). */
export const NO_TRACKING_SENT = "fitaf_no_tracking=1";
export const CARRYING = [NO_TRACKING_SENT, `theme=dark; ${NO_TRACKING_SENT}`, `${NO_TRACKING_SENT}; theme=dark`];
/** Instants of the cases, each written with its own offset: the Boston offer live is the harness's clock (2026-10-24,
 *  noon in New York); its offer ended (held until 2026-10-29) and none after it, 2026-10-30. */
const ENDED_AT = Date.parse("2026-10-30T12:00:00-04:00");
const SAVED_AT = Date.parse("2026-10-24T12:00:00-04:00");
/** A general offer with codes, current at any clock, as S11's WELCOME_BACK case has it (a fixture's; never written). */
const LATER = { id: "general-later-fixture", label: "Fixture: a later offer", applies_to: "general", valid_from: "2000-01-01", valid_to: "9999-12-31", code_mode: "unique" };

/** The Worker of the package at `root`: src/worker/beacon.js, its check. */
const workerAt = (root) => import(pathToFileURL(join(root, "src", "worker", "beacon.js")).href);
const hyphenated = (code) => `${code.slice(0, 4)}-${code.slice(4)}`;
const show = (body) => JSON.stringify(body);

// ── THE OFFER PAGE (EM-A1, EM-A4) ───────────────────────────────────────────────────────────────────────────────────

/** The page `path` of a started Worker: its status and markup. */
async function page(mf, path) {
  const res = await fetchPage(mf, path);
  return { status: res.status, html: res.text };
}

/** The code a page prints (Your code: <strong>XXXX-XXXX</strong>): a reissued one, on WELCOME_BACK. */
const printedCode = (html) => /Your code: <strong>([A-Z0-9]{4})-([A-Z0-9]{4})<\/strong>/.exec(html)?.slice(1).join("") ?? null;

/**
 * Every offer page § 16 item 1 names, from the development Worker of the package at `root` in Miniflare, each
 * { label, path, kind, qr, heading, codes, status, html }: `kind` and `qr` what its script must send, `heading` its <h1>
 * (the control that the page is the one meant), `codes` every code its address or its words carry.
 *   - the Boston offer live (the harness's clock): a save made through the Worker from each QR event, its code with and
 *     without the hyphen (saved, qr the event); an unknown code and a malformed one (current, qr "");
 *   - after the offer's end (2026-10-30): a save of 2026-10-24 (ended, qr its event) and an unknown code (ended, qr "");
 *   - a save of an offer that ended, with a general offer current (S11's fixture offers): welcome, qr its event, the
 *     page printing a reissued code.
 */
export async function offerPages(root = ROOT) {
  const main = join(root, "src", "worker", "index.js");
  const pages = [];
  const live = await startWorker({ main });
  try {
    for (const event of EVENT_IDS) {
      await postSave(live.mf, validSave({ event_id: event, email: `dummy-em-a1-${event}@example.com` }));
      const row = await live.db.prepare("SELECT offer_code FROM saves WHERE event_id = ? AND kind = 'offer'").bind(event).first();
      const code = row?.offer_code;
      if (!code) {
        pages.push({ label: `a save from ${event}`, problem: "control: the Worker stored no save" });
        continue;
      }
      for (const path of [`/o/${code}`, `/o/${hyphenated(code)}`]) {
        pages.push({ label: `a save from ${event}, its offer live, ${path === `/o/${code}` ? "the code" : "the code hyphenated"}`, path, kind: "saved", qr: event, heading: "Your offer", codes: [code], ...(await page(live.mf, path)) });
      }
    }
    for (const path of ["/o/ZZZZ9999", "/o/ZZZZ-9999", "/o/abc"]) {
      pages.push({ label: `an unknown code (${path})`, path, kind: "current", qr: "", heading: "Our current offer", codes: ["ZZZZ9999"], ...(await page(live.mf, path)) });
    }
  } finally {
    await live.mf.dispose();
  }
  const after = await startWorker({ main, now: ENDED_AT });
  try {
    const saved = saveRows(validateSave(validSave({ event_id: "seminar", email: "dummy-em-a1-ended@example.com" })), { nowMs: SAVED_AT });
    await insertRows(after.db, [saved]);
    const code = saved.saveRow.offer_code;
    pages.push({ label: "a save of 2026-10-24 from seminar, after its offer's end", path: `/o/${code}`, kind: "ended", qr: "seminar", heading: "This offer has ended", codes: [code], ...(await page(after.mf, `/o/${code}`)) });
    pages.push({ label: "an unknown code after the offer's end", path: "/o/ZZZZ9999", kind: "ended", qr: "", heading: "This offer has ended", codes: ["ZZZZ9999"], ...(await page(after.mf, "/o/ZZZZ9999")) });
  } finally {
    await after.mf.dispose();
  }
  const welcome = await startWorker({ main, offers: { status: "fixture", offers: [PAST_OFFER, LATER] } });
  try {
    const original = saveRows(validateSave(validSave({ event_id: "boston", email: "dummy-em-a1-welcome@example.com" })), {
      nowMs: TEST_NOW_MS,
      state: "lapsed",
      saveOverrides: { offer_id: PAST_OFFER_ID, message_state: "sent", send_at: "2026-06-01T13:00:00.000Z" },
    });
    await insertRows(welcome.db, [{ saveRow: original.saveRow }]);
    const code = original.saveRow.offer_code;
    const got = await page(welcome.mf, `/o/${code}`);
    const reissued = printedCode(got.html);
    pages.push({ label: "a save of an offer that ended, from boston, a general offer current", path: `/o/${code}`, kind: "welcome", qr: "boston", heading: "Welcome back — that offer ended, but here's what we have now", codes: [code, ...(reissued ? [reissued] : [])], ...got });
  } finally {
    await welcome.mf.dispose();
  }
  return pages;
}

/** The page's scripts run in the stub, its address watched; the page then hidden, left and an error reported, as a
 *  visitor's browser may. Returns the visit. */
function visitOffer(html) {
  const visit = openVisit(html, { watchLocation: true, clock: 300 });
  visit.hide();
  visit.pagehide();
  visit.fail(new Error("EM-A1: an uncaught error after the page's script ran"));
  return visit;
}

/**
 * EM-A1 (§ 16 items 1 and 5): each offer page's script sends exactly one `offer` (and nothing else, after the page is
 * hidden, left and an error reported), with that page's `kind` and the save's event id as `qr`, `s` a visit id and no
 * other field; the Worker's own check accepts it; the payload holds no code the page's address or words carry (with or
 * without its hyphen) and no `/o/`; the script reads no part of the page's address (window.location, document.URL,
 * documentURI, referrer, baseURI) and touches no storage. Controls: each page is the one meant (its status and heading);
 * a second opening of the same page sends a second `offer` with another `s` (a repeat opening counted again, item 4).
 */
export async function offerPageProblems(root = ROOT, pages = null) {
  const { checkedEvent } = await workerAt(root);
  const problems = [];
  const list = pages ?? (await offerPages(root));
  for (const kind of KINDS) if (!list.some((p) => p.kind === kind)) problems.push(`control: no page of kind ${kind}`);
  for (const p of list) {
    if (p.problem) {
      problems.push(`${p.label}: ${p.problem}`);
      continue;
    }
    const at = `${p.label}`;
    if (p.status !== 200 || !p.html.includes(`<h1>${p.heading}</h1>`)) {
      problems.push(`${at}: control: ${p.status}, not the page headed ${p.heading}`);
      continue;
    }
    const visit = visitOffer(p.html);
    for (const error of visit.errors.filter((e) => !/^EM-A1:/.test(e.message))) problems.push(`${at}: a script threw: ${error.message}`);
    for (const name of visit.touched) problems.push(`${at}: touched ${name}`);
    if (visit.reads.length) problems.push(`${at}: the script read the page's address: ${[...new Set(visit.reads)].join(", ")}`);
    const sent = visit.beacons.map((b) => b.body);
    if (sent.length !== 1 || sent[0]?.event !== "offer") {
      problems.push(`${at}: sent ${sent.map((b) => b.event).join(" · ") || "nothing"}, not exactly one offer`);
      continue;
    }
    const [{ url, data, body }] = visit.beacons;
    if (url !== "/a") problems.push(`${at}: the beacon went to ${url}, not /a`);
    if (!isDeepStrictEqual(Object.keys(body).sort(), [...OFFER_KEYS].sort())) problems.push(`${at}: the offer carries ${Object.keys(body).join(", ")}, not ${OFFER_KEYS.join(", ")}`);
    if (body.kind !== p.kind) problems.push(`${at}: kind ${JSON.stringify(body.kind)}, not ${JSON.stringify(p.kind)}`);
    if (body.qr !== p.qr) problems.push(`${at}: qr ${JSON.stringify(body.qr)}, not ${JSON.stringify(p.qr)}`);
    if (!HEX16.test(String(body.s))) problems.push(`${at}: s ${JSON.stringify(body.s)}, not 16 hex digits`);
    if (!checkedEvent(body)) problems.push(`${at}: refused by the Worker's own check: ${show(body)}`);
    for (const code of p.codes) {
      for (const form of [code, hyphenated(code)]) if (data.includes(form)) problems.push(`${at}: the payload holds the code ${form}: ${data}`);
    }
    if (data.includes("/o/")) problems.push(`${at}: the payload holds /o/: ${data}`);
    const again = openVisit(p.html, { clock: 300 }).beacons.map((b) => b.body);
    if (again.length !== 1 || again[0].event !== "offer" || again[0].s === body.s) problems.push(`${at}: control: a second opening sent ${again.map(show).join(" · ") || "nothing"}, not one offer with another s`);
  }
  return problems;
}

/** The page's analytics script: its one inline <script> holding the beacon, whole. */
const analyticsScript = (html) => [...html.matchAll(/<script>[\s\S]*?<\/script>/g)].map((m) => m[0]).filter((s) => s.includes("navigator.sendBeacon("));

/**
 * EM-A1's sender (§ 16 item 1, "the same transport (§ 4: POST /a …); ⛔ no second transport"; § 4: ONE call site): the
 * offer page's analytics script is the plan page's, byte for byte (each target's built page; one sendBeacon, to /a); the
 * offer page carries nothing else T5 forbids (no fetch(, XMLHttpRequest, script or stylesheet src, <link>, no other
 * host); its data is one JSON element, #offer-data, holding `kind` and `qr` alone; and the Worker's copy of the script,
 * src/worker/page-script.json, is what `npm run worker:script` writes from the package (DERIVED, never by hand).
 */
export async function senderProblems(root = ROOT, pages = null) {
  const problems = [];
  const plan = {};
  for (const target of ["prod", "dev"]) {
    const scripts = analyticsScript(await builtPage({ root, target }));
    if (scripts.length !== 1) problems.push(`control: the ${target} plan page has ${scripts.length} analytics scripts, not 1`);
    plan[target] = scripts[0];
  }
  if (plan.prod !== plan.dev) problems.push("control: the two targets' analytics scripts differ");
  for (const p of pages ?? (await offerPages(root))) {
    if (p.problem || p.status !== 200) continue;
    const at = p.label;
    const scripts = analyticsScript(p.html);
    if (scripts.length !== 1) problems.push(`${at}: ${scripts.length} analytics scripts, not 1`);
    else if (scripts[0] !== plan.prod) problems.push(`${at}: its analytics script is not the plan page's, byte for byte`);
    const beacons = [...p.html.matchAll(/sendBeacon/g)].length;
    if (beacons !== 1 || !/\bnavigator\.sendBeacon\(\s*(["'])\/a\1\s*,/.test(p.html)) problems.push(`${at}: ${beacons} sendBeacon, not one to /a`);
    if (/<script\b[^>]*\bsrc\s*=|<link\b|\bfetch\s*\(|XMLHttpRequest|@import|WebSocket|EventSource|https?:\/\//i.test(p.html.replace(/<style>[\s\S]*?<\/style>/, ""))) {
      problems.push(`${at}: something T5 forbids (a script src, a link, fetch, XMLHttpRequest, another host)`);
    }
    const data = [...p.html.matchAll(/<script type="application\/json" id="offer-data">([^<]*)<\/script>/g)];
    if (data.length !== 1) problems.push(`${at}: ${data.length} #offer-data elements, not 1`);
    else if (!isDeepStrictEqual(JSON.parse(data[0][1]), { kind: p.kind, qr: p.qr })) problems.push(`${at}: #offer-data holds ${data[0][1]}, not its kind and qr alone`);
  }
  try {
    const { workerScriptFile, serialise, PAGE_SCRIPT } = await import(pathToFileURL(join(root, "scripts", "worker-script.mjs")).href);
    const committed = await readFile(PAGE_SCRIPT, "utf8");
    if (committed !== serialise(await workerScriptFile())) problems.push("src/worker/page-script.json is not what npm run worker:script writes");
    if (JSON.parse(committed).html !== plan.prod) problems.push("src/worker/page-script.json's script is not the plan page's");
  } catch (error) {
    problems.push(`src/worker/page-script.json and npm run worker:script: ${error.message}`);
  }
  return problems;
}

/** POST `body` to /a of a started Worker (startBeacon), from a documentation address, in the US, with the Cookie header
 *  `cookie` if given: its status. */
async function beacon(site, body, cookie) {
  const headers = { "cf-connecting-ip": TEST_IP, "user-agent": TEST_UA, "content-type": "text/plain;charset=UTF-8" };
  if (cookie !== undefined) headers.cookie = cookie;
  const res = await site.mf.dispatchFetch("https://eatfitaf.com/a", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body), cf: { country: "US" }, redirect: "manual" });
  await res.arrayBuffer();
  return res.status;
}

/**
 * EM-A4 (§ 16 item 1: "§ 12's tester cookie … hold[s]"; § 12's N3, for the new page): the beacon each offer page's
 * script sends, posted to POST /a of either Worker carrying the cookie (alone, and among others), is a 204 and nothing is
 * done: no data point, SALTS neither read nor written. Control (N4's, for the same beacons): without the cookie each is
 * written, one data point, its kind in blob13.
 */
export async function testerCookieProblems(root = ROOT, pages = null) {
  const problems = [];
  const sent = [];
  for (const p of pages ?? (await offerPages(root))) {
    if (p.problem || p.status !== 200) continue;
    const body = openVisit(p.html, { clock: 300 }).beacons.map((b) => b.body).find((b) => b.event === "offer");
    if (body) sent.push([p.label, body]);
  }
  if (new Set(sent.map(([, body]) => body.kind)).size < KINDS.length) problems.push(`control: the offer pages sent ${sent.length} offers, not one of each kind`);
  for (const entry of ENTRIES) {
    const site = await startBeacon({ root, entry });
    try {
      await site.log();
      // Every beacon carrying the cookie first: SALTS must hold no key after them (a counted beacon makes the day's salt).
      for (const [label, body] of sent) {
        for (const cookie of CARRYING) {
          const where = `${entry} POST /a, ${label}'s offer, Cookie ${JSON.stringify(cookie)}`;
          const status = await beacon(site, body, cookie);
          const log = await site.log();
          if (status !== 204) problems.push(`${where}: ${status}, not 204`);
          if (log.points.length) problems.push(`${where}: written (${log.points.length} data point(s))`);
          if (log.gets.length || log.puts.length || log.keys.length) problems.push(`${where}: SALTS used (${log.gets.length} read(s), ${log.puts.length} write(s), ${log.keys.length} key(s))`);
        }
      }
      for (const [label, body] of sent) {
        const status = await beacon(site, body);
        const { points } = await site.log();
        if (status !== 204 || points.length !== 1) problems.push(`${entry} POST /a, ${label}'s offer, no Cookie: ${status} and ${points.length} data point(s), not 204 and 1 (control)`);
        else if (points[0].blobs?.[12] !== body.kind) problems.push(`${entry} POST /a, ${label}'s offer, no Cookie: blob13 ${JSON.stringify(points[0].blobs?.[12])}, not ${body.kind} (control)`);
      }
    } finally {
      await site.dispose();
    }
  }
  return problems;
}

// ── THE PLAN PAGE (EM-A2) ───────────────────────────────────────────────────────────────────────────────────────────

/** EM-A2's openings: [hash, search, the `via` its `open` must carry]. The offer page's link is /?e=<event>#from-email. */
export const OPENINGS = [
  [FROM_EMAIL, "", EMAIL],
  [FROM_EMAIL, "?e=boston", EMAIL],
  ["", "", ""],
  ["#save", "", ""],
  ["#lean-or-7d", "", ""],
  ["", "?e=boston", ""],
  // "exactly" (item 2): a longer fragment is not it, nor the words in the query.
  ["#from-emails", "", ""],
  ["", "?from-email", ""],
];

/**
 * EM-A2 (§ 16 items 2 and 5): on each target's built plan page, opened at each of OPENINGS, the page sends exactly one
 * `open`, its `via` "email" at #from-email exactly and "" otherwise, accepted by the Worker's own check. And the read is
 * once and of the fragment alone, which it does not rewrite: the page's analytics script run alone (no app.js, which may
 * move the fragment by its own rules) at /?e=boston#from-email reads `location.hash` once and leaves it as it was.
 */
export async function emailVisitProblems(root = ROOT) {
  const { checkedEvent } = await workerAt(root);
  const problems = [];
  for (const target of ["prod", "dev"]) {
    const html = await builtPage({ root, target });
    for (const [hash, search, want] of OPENINGS) {
      const at = `${target}, opened at ${search || hash ? `/${search}${hash}` : "/ (no query, no fragment)"}`;
      const visit = openVisit(html, { hash, search, clock: 400 });
      const opens = visit.beacons.map((b) => b.body).filter((b) => b.event === "open");
      if (opens.length !== 1) {
        problems.push(`${at}: ${opens.length} open sent, not 1`);
        continue;
      }
      const [open] = opens;
      if (open.via !== want) problems.push(`${at}: the open carries via ${JSON.stringify(open.via)}, not ${JSON.stringify(want)}`);
      if (!checkedEvent(open)) problems.push(`${at}: refused by the Worker's own check: ${show(open)}`);
    }
    const [script] = analyticsScript(html);
    if (!script) {
      problems.push(`${target}: control: no analytics script on the plan page`);
      continue;
    }
    const alone = openVisit(`<!doctype html><html><head></head><body>${script}</body></html>`, { hash: FROM_EMAIL, search: "?e=boston", clock: 400, watchLocation: true });
    const open = alone.beacons.map((b) => b.body).find((b) => b.event === "open");
    if (open?.via !== EMAIL) problems.push(`${target}: the analytics script alone at /?e=boston#from-email: via ${JSON.stringify(open?.via)}, not "email"`);
    const hashReads = alone.reads.filter((r) => r === "location.hash").length;
    if (hashReads !== 1) problems.push(`${target}: the analytics script alone read location.hash ${hashReads} time(s), not once`);
    if (alone.hash() !== FROM_EMAIL) problems.push(`${target}: the analytics script alone left the fragment ${JSON.stringify(alone.hash())}, not ${FROM_EMAIL}`);
  }
  return problems;
}

// ── THE WORKER (EM-A3) ──────────────────────────────────────────────────────────────────────────────────────────────

/** The data point's layout, written from the contract: § 10 (blobs 1–11), § 15 item 2 (blob12 the visitor), § 16 items
 *  1 and 2 (blob13 the offer page's kind, blob14 the visit's via); the doubles § 10's. */
export const LAYOUT = ["event", "s", "country", "device", "viewport", "qr", "question", "answer", "key", "link", "step", "v", "kind", "via"];
const DOUBLE_LAYOUT = ["load_ms", "length_ms", "mpid"];
/** What a-harness's post sends from: the US, an iPhone's user agent (§ 1.4: a phone). */
const SENT_FROM = { country: "US", device: "phone" };

/** EM-A3's bodies the Worker must accept: an `offer` of each kind (with an event's id and with ""), an `open` with each
 *  `via`, and every other event of § 3 as before (a-harness VALID, whose `open` carries via ""). */
function acceptedBodies() {
  const out = [];
  for (const kind of KINDS) for (const qr of ["boston", ""]) out.push([`offer ${kind}, qr ${JSON.stringify(qr)}`, { event: "offer", s: S1, qr, kind }]);
  for (const qr of EVENT_IDS) out.push([`offer saved, qr ${qr}`, { event: "offer", s: S1, qr, kind: "saved" }]);
  for (const via of [EMAIL, ""]) out.push([`open, via ${JSON.stringify(via)}`, { event: "open", s: S1, viewport: "400-767", load_ms: 950, qr: "boston", via }]);
  out.push(["answer", { event: "answer", s: S1, question: "goal", answer: "lean" }]);
  out.push(["result", { event: "result", s: S1, key: "or-7d", mpid: 21 }]);
  out.push(["click", { event: "click", s: S1, link: "chefs-choice", mpid: 21 }]);
  out.push(["leave", { event: "leave", s: S1, length_ms: 64000, step: "click" }]);
  out.push(["error", { event: "error", s: S1 }]);
  out.push(["save", { event: "save", s: S1 }]);
  return out;
}

/** EM-A3's bodies the Worker must refuse, each with what is wrong with it. */
export function refusedOfferBodies() {
  const offer = { event: "offer", s: S1, qr: "boston", kind: "saved" };
  const open = { event: "open", s: S1, viewport: "<400", load_ms: 812, qr: "", via: "" };
  const without = (body, key) => Object.fromEntries(Object.entries(body).filter(([k]) => k !== key));
  return [
    ["an offer of another kind", { ...offer, kind: "unknown" }],
    ["an offer whose kind is a page's heading", { ...offer, kind: "Your offer" }],
    ["an offer whose kind is upper case", { ...offer, kind: "SAVED" }],
    ["an offer whose kind is empty", { ...offer, kind: "" }],
    ["an offer without its kind", without(offer, "kind")],
    ["an offer without its qr", without(offer, "qr")],
    ["an offer whose qr data/events.json does not name", { ...offer, qr: "somewhere-else" }],
    ["an offer with a via", { ...offer, via: EMAIL }],
    ["an offer with an empty via", { ...offer, via: "" }],
    ["an offer carrying a code", { ...offer, code: "ABCD2345" }],
    ["an offer carrying its path", { ...offer, path: "/o/ABCD2345" }],
    ["an offer without s", without(offer, "s")],
    ["an open whose via is another word", { ...open, via: "newsletter" }],
    ["an open whose via is upper case", { ...open, via: "EMAIL" }],
    ["an open whose via is the fragment", { ...open, via: FROM_EMAIL }],
    ["an open whose via is a number", { ...open, via: 1 }],
    ["an open whose via is null", { ...open, via: null }],
    // ⚠ Amended at the merge review (2026-10-27): an `open` WITHOUT `via` is accepted (a page loaded before the release
    // sends one; EM-A3's `before`), so it is not here; one without `via` that carries another field still is.
    ["an open with a kind", { ...open, kind: "saved" }],
    ["an open without its via, with a kind", { ...without(open, "via"), kind: "saved" }],
    ["an answer with a via", { event: "answer", s: S1, question: "goal", answer: "lean", via: EMAIL }],
  ];
}

/**
 * EM-A3 (§ 16 items 1, 2 and 5): on either Worker, POST /a with each of acceptedBodies() is a 204 and one data point:
 * 14 blobs in LAYOUT's places (blob13 the offer's kind, blob14 the open's via, "" for an event without them; blobs 1–12
 * as § 15 laid them: the event, `s`, the country and device the Worker adds, each field of the event in its place, blob12
 * a 16-hex `v`, the same on every point of the one sender), its doubles DOUBLE_LAYOUT's; no field carries the IP or the
 * user agent (A4's search, a-checks needlesIn). Each of refusedOfferBodies() is a 204 with nothing written and SALTS
 * untouched.
 * ⚠ Amended at the merge review (2026-10-27, the coordinator): `before`, each [label, body] an `open` exactly as a page
 * built before § 16 sends it (openOfPage: no `via`), is accepted the same way, blob14 "": a page loaded before the release
 * (an open tab, a cached copy, a tab resumed) keeps its `open`. Control: such a body carries no `via`.
 */
export async function workerProblems(root = ROOT, { before = [] } = {}) {
  const problems = [];
  for (const [label, body] of before) {
    if (body?.event !== "open" || Object.hasOwn(body, "via")) problems.push(`control: ${label}: ${JSON.stringify(body)}, not an open without via`);
  }
  for (const entry of ENTRIES) {
    const site = await startBeacon({ root, entry });
    try {
      await site.log();
      const visitors = new Set();
      for (const [label, body] of [...acceptedBodies(), ...before]) {
        const at = `${entry}: ${label}`;
        const res = await site.post(body);
        const { points } = await site.log();
        if (res.status !== 204 || points.length !== 1) {
          problems.push(`${at}: ${res.status} and ${points.length} data point(s), not 204 and 1`);
          continue;
        }
        const [point] = points;
        const fields = { ...body, ...SENT_FROM };
        const want = LAYOUT.map((name) => (name === "v" ? null : Object.hasOwn(fields, name) ? String(fields[name]) : ""));
        const blobs = point.blobs ?? [];
        if (blobs.length !== LAYOUT.length) problems.push(`${at}: ${blobs.length} blobs, not ${LAYOUT.length}`);
        LAYOUT.forEach((name, i) => {
          if (name === "v") {
            if (!HEX16.test(String(blobs[i]))) problems.push(`${at}: blob${i + 1} (v) ${JSON.stringify(blobs[i])}, not 16 hex digits`);
            visitors.add(blobs[i]);
          } else if (blobs[i] !== want[i]) problems.push(`${at}: blob${i + 1} (${name}) ${JSON.stringify(blobs[i])}, not ${JSON.stringify(want[i])}`);
        });
        const doubles = DOUBLE_LAYOUT.map((name) => (Object.hasOwn(body, name) ? body[name] : 0));
        if (!isDeepStrictEqual(point.doubles, doubles)) problems.push(`${at}: doubles ${JSON.stringify(point.doubles)}, not ${JSON.stringify(doubles)}`);
        for (const [needle, field] of needlesIn(point)) problems.push(`${at}: a field carries ${JSON.stringify(needle)}: ${JSON.stringify(field)}`);
      }
      if (visitors.size !== 1) problems.push(`${entry}: one sender on one day wrote ${visitors.size} visitors, not 1 (control)`);
      for (const [label, body] of refusedOfferBodies()) {
        const res = await site.post(body);
        const log = await site.log();
        if (res.status !== 204) problems.push(`${entry}: ${label}: ${res.status}, not 204`);
        if (log.points.length) problems.push(`${entry}: ${label}: written (${log.points.length} data point(s))`);
        if (log.puts.length || log.gets.length) problems.push(`${entry}: ${label}: the salt store was used`);
      }
    } finally {
      await site.dispose();
    }
  }
  return problems;
}

// ── THE REPORT (EM-A5) ──────────────────────────────────────────────────────────────────────────────────────────────

const NY = "America/New_York";
const DAY_FORMAT = new Intl.DateTimeFormat("en-CA", { timeZone: NY, year: "numeric", month: "2-digit", day: "2-digit" });
/** An instant's New York date, "YYYY-MM-DD" (the platform's zone arithmetic). */
const nyDate = (instant) => DAY_FORMAT.format(new Date(instant));
const weight = (row) => Number(row._sample_interval ?? 1);

/** `text` split at `sep` where it stands outside parentheses and quotes. */
function splitTop(text, sep) {
  const out = [];
  let depth = 0;
  let quoted = false;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'") quoted = !quoted;
    else if (quoted) continue;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (depth === 0 && text.startsWith(sep, i)) {
      out.push(text.slice(start, i));
      start = i + sep.length;
      i += sep.length - 1;
    }
  }
  out.push(text.slice(start));
  return out.map((s) => s.trim());
}

/** A row's value of a scalar form: the New York date of `timestamp`, a column (a blob "" and a double 0 when never
 *  written, as the contract reads Analytics Engine), or if(<column> = '<text>', <form>, <form>). */
function scalar(text) {
  const s = text.trim();
  if (s === `formatDateTime(timestamp, '%Y-%m-%d', '${NY}')`) return (row) => nyDate(row.timestamp);
  if (/^(?:blob\d+|index1)$/.test(s)) return (row) => String(row[s] ?? "");
  if (/^double\d+$/.test(s)) return (row) => Number(row[s] ?? 0);
  const m = /^if\((\w+) = '([^']*)', (.+)\)$/.exec(s);
  if (m) {
    const parts = splitTop(m[3], ",");
    if (parts.length !== 2) throw new Error(`if() without two branches: ${s}`);
    const [column, then, otherwise] = [scalar(m[1]), scalar(parts[0]), scalar(parts[1])];
    return (row) => (column(row) === m[2] ? then(row) : otherwise(row));
  }
  throw new Error(`a form the case does not read: ${s}`);
}

/** ClickHouse's quantileExactWeighted(level): the values in order, the first whose running weight reaches
 *  ceil(total × level). */
function quantile(pairs, level) {
  const sorted = pairs.filter(([, w]) => w > 0).sort(([a], [b]) => a - b);
  const total = sorted.reduce((n, [, w]) => n + w, 0);
  if (!total) return 0;
  const threshold = Math.ceil(total * level);
  let running = 0;
  for (const [value, w] of sorted) {
    running += w;
    if (running >= threshold) return value;
  }
  return sorted.at(-1)[0];
}

/** An aggregate form as a function of a group's rows, or null for a scalar form. Counts are written as the SQL API
 *  writes a UInt64, as text. */
function aggregate(text) {
  const s = text.trim();
  let m;
  if ((m = /^count\(DISTINCT (.+)\)$/.exec(s))) {
    const value = scalar(m[1]);
    return (rows) => String(new Set(rows.map(value)).size);
  }
  if (s === "sum(_sample_interval)") return (rows) => String(rows.reduce((n, r) => n + weight(r), 0));
  if ((m = /^quantileExactWeighted\(([0-9.]+)\)\((\w+), _sample_interval\)$/.exec(s))) {
    const value = scalar(m[2]);
    const level = Number(m[1]);
    return (rows) => quantile(rows.map((r) => [value(r), weight(r)]), level);
  }
  return null;
}

/** A WHERE condition as a test of a row: a New York day's start as a bound of `timestamp`, a column equal or unequal to
 *  a text. */
function condition(text) {
  const s = text.trim();
  let m;
  if ((m = new RegExp(`^timestamp (>=|<) toDateTime\\('(\\d{4}-\\d{2}-\\d{2}) 00:00:00', '${NY}'\\)$`).exec(s))) {
    const [op, day] = [m[1], m[2]];
    return op === ">=" ? (row) => nyDate(row.timestamp) >= day : (row) => nyDate(row.timestamp) < day;
  }
  if ((m = /^(\w+) (=|!=) '([^']*)'$/.exec(s))) {
    const value = scalar(m[1]);
    return m[2] === "=" ? (row) => value(row) === m[3] : (row) => value(row) !== m[3];
  }
  throw new Error(`a condition the case does not read: ${s}`);
}

const QUERY = /^SELECT (.+) FROM (\S+) WHERE (.+) GROUP BY (.+) ORDER BY day FORMAT JSON$/;

/** The report's query `sql` evaluated over `rows` (data points as Analytics Engine holds them): the SQL API's answer,
 *  { meta, data, rows }, its groups in the order of `day`. */
export function evaluate(sql, rows) {
  const m = QUERY.exec(sql);
  if (!m) throw new Error(`a query the case does not read: ${sql}`);
  const items = splitTop(m[1], ",").map((item) => {
    const a = /^(.+) AS (\w+)$/.exec(item);
    if (!a) throw new Error(`a selected item without its name: ${item}`);
    const agg = aggregate(a[1]);
    return { name: a[2], agg, one: agg ? null : scalar(a[1]) };
  });
  const tests = splitTop(m[3], " AND ").map(condition);
  const by = splitTop(m[4], ",");
  for (const item of items) if (!item.agg && !by.includes(item.name)) throw new Error(`${item.name} neither aggregated nor grouped: ${sql}`);
  const groups = new Map();
  for (const row of rows.filter((r) => tests.every((t) => t(r)))) {
    const key = JSON.stringify(by.map((name) => items.find((i) => i.name === name).one(row)));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const data = [...groups.values()].map((list) => Object.fromEntries(items.map((i) => [i.name, i.agg ? i.agg(list) : i.one(list[0])])));
  data.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  return { meta: items.map((i) => ({ name: i.name })), data, rows: data.length };
}

/** The fixture's points (test/fixtures/analytics/points-offer-email.json, invented), each written by its fields' names,
 *  as data points: every name in its column by LAYOUT and DOUBLE_LAYOUT (the contract's), `timestamp` its instant, index1
 *  the point's own (§ 15 item 1), _sample_interval 1. */
export async function fixturePoints() {
  const { points } = JSON.parse(await readFile(join(ROOT, "test", "fixtures", "analytics", "points-offer-email.json"), "utf8"));
  return points.map((p, i) => {
    const row = { timestamp: Date.parse(p.at), index1: (i + 1).toString(16).padStart(16, "e"), _sample_interval: 1 };
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

/** The report of the package at `root`, run in this process over `rows`: each query it asks answered by evaluating its
 *  SQL here (nothing is requested). Returns { code, out, err }. */
export async function reportOver(root, args, rows) {
  const { report } = await import(pathToFileURL(join(root, "scripts", "analytics.mjs")).href);
  const fetch = async (url, init = {}) => new Response(JSON.stringify(evaluate(String(init.body), rows)), { status: 200, headers: { "content-type": "application/json" } });
  let out = "";
  let err = "";
  const code = await report({ args, env: ENV, fetch, out: { write: (s) => (out += s) }, err: { write: (s) => (err += s) } });
  return { code, out, err };
}

/** The fixture's range. */
export const POINTS_RANGE = ["--from", "2026-10-26", "--to", "2026-10-28"];
/** By hand from the fixture (§ 16 item 3): each day's plan-page visitors and visits (an offer-only visit not among
 *  them), its offer pages by kind and its email visits. 2026-10-28 holds offer pages alone. */
export const WANT = {
  "2026-10-26": { visitors: 2, visits: 2, offer_pages: { saved: 3, current: 1 }, email_visits: 1 },
  "2026-10-27": { visitors: 2, visits: 2, offer_pages: { welcome: 1, ended: 2 }, email_visits: 1 },
  "2026-10-28": { visitors: 0, visits: 0, offer_pages: { saved: 2 }, email_visits: 0 },
};
/** The control, by hand: every row of the range counted (what the report did before § 16, and what the mutant does). */
const EVERY_ROW = { "2026-10-26": { visitors: 4, visits: 6 }, "2026-10-27": { visitors: 3, visits: 5 }, "2026-10-28": { visitors: 1, visits: 2 } };
/** § 16 item 3's two members of a day; every other member is a figure "before this section". */
export const NEW_MEMBERS = ["offer_pages", "email_visits"];
/** The text's two lines for them (a day's own level, two spaces in). */
export const NEW_LINES = [/^ {2}visits from the offer email \d+$/, /^ {2}offer pages opened \(a repeat opening counted again\): .+$/];

const earlier = (day) => Object.fromEntries(Object.entries(day).filter(([k]) => !NEW_MEMBERS.includes(k)));
/** A day's earlier figures with no plan-page visit: the same members, every count 0, every split empty, every
 *  duration null, the funnel's steps (named as `like`'s) at 0. */
const noPlanVisit = (day, like) => ({
  day,
  data: true,
  visitors: 0,
  visits: 0,
  funnel: like.funnel.map(({ step }) => ({ step, visits: 0 })),
  clicks: {},
  saves: 0,
  visit_length_ms: null,
  load_ms: null,
  device: {},
  viewport: {},
  country: {},
  errors: 0,
});

/** `text` without § 16's two lines, and the number removed on each day with data. */
function withoutNewLines(text) {
  const kept = [];
  let removed = 0;
  for (const line of text.split("\n")) {
    if (NEW_LINES.some((re) => re.test(line))) removed++;
    else kept.push(line);
  }
  return { text: kept.join("\n"), removed };
}

/** The text's blocks, by day: { "YYYY-MM-DD": its lines after the date, to the next }. */
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
 * EM-A5 (§ 16 items 3, 4 and 5): the report of the package at `root` over the fixture's data points (offer-only visits,
 * email visits, and a day of offer pages alone), its SQL evaluated here:
 *   - each day's visitors and visits, offer pages by kind and email visits as WANT says, in the document and the text;
 *   - every earlier figure as without the offer pages: the document's every member but NEW_MEMBERS equal to the report
 *     over the same points without the `offer` rows, and on a day with nothing but offer pages, the figures of no
 *     plan-page visit;
 *   - the text, its two new lines removed (two on each day with data, and the offer pages' line saying a repeat opening
 *     is counted again), byte for byte the base's (`base`, the release line's package, § 15's report) over the points
 *     without the `offer` rows, and over each of AJ's answer sets (aj-checks runs(), A11's fixture) as they are;
 *   - control: the base, which reads every row, counts the offer pages as visits (EVERY_ROW), so the fixture tells the
 *     two apart.
 */
export async function reportProblems(root = ROOT, base) {
  const problems = [];
  const points = await fixturePoints();
  const planOnly = points.filter((r) => r.blob1 !== "offer");
  if (planOnly.length === points.length) problems.push("control: the fixture holds no offer row");
  const run = async (label, pkg, args, rows) => {
    try {
      const r = await reportOver(pkg, args, rows);
      if (r.code !== 0) problems.push(`${label}: exit ${r.code}: ${r.err.trim()}`);
      return r;
    } catch (error) {
      problems.push(`${label}: ${error.message}`);
      return null;
    }
  };
  const doc = JSON.parse((await run("the points", root, [...POINTS_RANGE, "--json"], points))?.out || "null");
  const doc0 = JSON.parse((await run("the points without offer rows", root, [...POINTS_RANGE, "--json"], planOnly))?.out || "null");
  const text = (await run("the points, text", root, POINTS_RANGE, points))?.out ?? "";
  const text0 = (await run("the points without offer rows, text", root, POINTS_RANGE, planOnly))?.out ?? "";
  const baseText0 = (await run("the base, the points without offer rows", base, POINTS_RANGE, planOnly))?.out ?? "";
  const baseDoc = JSON.parse((await run("the base, the points", base, [...POINTS_RANGE, "--json"], points))?.out || "null");
  if (!doc || !doc0 || !baseDoc) return problems;
  for (const [day, want] of Object.entries(EVERY_ROW)) {
    const d = baseDoc.days.find((x) => x.day === day);
    if (d?.visitors !== want.visitors || d?.visits !== want.visits) problems.push(`control: ${day}: the base over every row counts ${d?.visitors} visitors and ${d?.visits} visits, not ${want.visitors} and ${want.visits}`);
  }
  const like = doc0.days.find((d) => d.data);
  for (const [day, want] of Object.entries(WANT)) {
    const d = doc.days.find((x) => x.day === day);
    const d0 = doc0.days.find((x) => x.day === day);
    if (!d?.data) {
      problems.push(`${day}: the document's day has no data: ${JSON.stringify(d)}`);
      continue;
    }
    for (const key of ["visitors", "visits", "email_visits"]) if (d[key] !== want[key]) problems.push(`${day}: ${key} ${JSON.stringify(d[key])}, not ${want[key]}`);
    if (!isDeepStrictEqual(d.offer_pages, want.offer_pages)) problems.push(`${day}: offer_pages ${JSON.stringify(d.offer_pages)}, not ${JSON.stringify(want.offer_pages)}`);
    const before = d0?.data ? earlier(d0) : like ? noPlanVisit(day, like) : null;
    if (!isDeepStrictEqual(earlier(d), before)) problems.push(`${day}: the earlier figures are not as without the offer pages: ${JSON.stringify(earlier(d))}, not ${JSON.stringify(before)}`);
  }
  const days = Object.keys(WANT).length;
  const stripped = withoutNewLines(text);
  if (stripped.removed !== 2 * days) problems.push(`the text prints ${stripped.removed} of § 16's lines over ${days} days with data, not ${2 * days}`);
  if (!/offer pages opened \(a repeat opening counted again\)/.test(text)) problems.push("the text does not say a repeat opening is counted again");
  const stripped0 = withoutNewLines(text0).text;
  if (stripped0 !== baseText0) problems.push("the points without offer rows: the text, its new lines removed, is not the base's byte for byte");
  const blocks = dayBlocks(stripped.text);
  const baseBlocks = dayBlocks(baseText0);
  for (const day of Object.keys(WANT)) {
    if (baseBlocks[day]?.trim() === "no data") continue;
    if (blocks[day] !== baseBlocks[day]) problems.push(`${day}: the text, its new lines removed, is not the base's over the points without offer rows:\n${blocks[day]}\n---\n${baseBlocks[day]}`);
  }
  for (const [label, answers, args] of runs(await fixtureAnswers())) {
    const mine = await runAt(root, args, answers);
    const theirs = await runAt(base, args, answers);
    if (mine.code !== 0 || theirs.code !== 0) problems.push(`AJ's ${label}: exit ${mine.code}, the base's ${theirs.code}: ${(mine.err + theirs.err).trim()}`);
    else if (withoutNewLines(mine.out).text !== theirs.out) problems.push(`AJ's ${label}: the text, its new lines removed, is not the base's byte for byte`);
  }
  return problems;
}

/** The package of `commit` (its scripts/, src/worker/, data/ and package.json, AJ2's way; or `paths`), extracted by `git
 *  archive` into `dir` (read only). Returns its path. */
export function extractBase(commit, dir, paths = ["scripts", join("src", "worker"), "data", "package.json"]) {
  const run = (cmd, args, input) => {
    const r = spawnSync(cmd, args, { input, maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: exit ${r.status}: ${r.stderr}`);
    return r.stdout;
  };
  const top = run("git", ["-C", ROOT, "rev-parse", "--show-toplevel"]).toString("utf8").trim();
  const prefix = relative(top, ROOT);
  run("tar", ["-x", "-C", dir], run("git", ["-C", top, "archive", "--format=tar", commit, ...paths.map((p) => join(prefix, p))]));
  return join(dir, prefix);
}

/** The `open` the page of `commit` sends: its package's build inputs (cc-harness mirror()'s list) extracted by `git
 *  archive` into `dir`, this package's node_modules linked in, its production page built as a-harness builtPage builds it
 *  (no week), and opened in a-harness's stub. The page's own payload, never written here. */
export async function openOfPage(commit, dir) {
  const pkg = extractBase(commit, dir, ["build.mjs", "package.json", "wrangler.jsonc", "data", "scripts", "src", "consent"]);
  await symlink(join(ROOT, "node_modules"), join(pkg, "node_modules"));
  const html = await builtPage({ root: pkg });
  return openVisit(html, { clock: 400 }).beacons.map((b) => b.body).find((b) => b.event === "open") ?? null;
}
