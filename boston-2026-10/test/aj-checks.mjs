// The checks of AJ1, AJ3 and AJ4 (SPEC-analytics.md § 11, `npm run analytics -- … --json`), as functions over a PACKAGE
// (`root`: this one, or a mirror of it), each returning one line per thing the package gets wrong ([] when it is right);
// and the report of a package run in this process over SQL API answers, with a stand-in for `fetch` that answers each
// query by its name (A11's way): nothing is requested. The answers are A11's fixture (test/fixtures/analytics/, invented
// numbers) and two answer sets derived from it here. The cases run the checks on this package; the mutant
// (aj-mutants.test.mjs) runs AJ1's on a mirror. Every expectation is the contract's, written here, never read back from
// the code under test. Not a test file itself.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { ROOT } from "../build.mjs";

const FIXTURES = join(ROOT, "test", "fixtures", "analytics");
// § 16 item 3: two queries more, the offer pages by kind and the visits from the offer email (offers.json, email.json).
// SPEC-the-redirect.md § 5: one more, the redirects by source and device (redirects.json, no row: the fixture's days have
// none, so every figure here is as before; RD9 holds the redirects' own).
export const NAMES = ["visitors", "steps", "clicks", "length", "load", "devices", "viewports", "countries", "offers", "email", "redirects"];
export const ENV = { CLOUDFLARE_ANALYTICS_TOKEN: "test-token", CLOUDFLARE_ACCOUNT_ID: "test-account" };
const SQL_URL = "https://api.cloudflare.com/client/v4/accounts/test-account/analytics_engine/sql";
/** § 6, § 10: the two datasets. */
const DATASETS = { prod: "fitaf_microsite_analytics_prod", dev: "fitaf_microsite_analytics_dev" };
export const RANGE = ["--from", "2026-10-23", "--to", "2026-10-25"];

/** A11's fixture: each query's answer (the SQL API's JSON), by the query's name. */
export async function fixtureAnswers() {
  return Object.fromEntries(
    await Promise.all(NAMES.map(async (n) => [n, JSON.parse(await readFile(join(FIXTURES, `${n}.json`), "utf8"))])),
  );
}

/** `answers` with each query's rows passed through `edit(name, rows)`. */
function edited(answers, edit) {
  return Object.fromEntries(
    Object.entries(answers).map(([name, body]) => {
      const data = edit(name, structuredClone(body.data));
      return [name, { ...body, data, rows: data.length }];
    }),
  );
}

/** The fixture with 2026-10-24 thinned: its visit length gone (no `leave`), its load time over no visits (n "0"), its
 *  clicks and countries gone, and a device with no visits. A day with data whose length and load are null (§ 11 item
 *  1) and whose click and country splits are empty. */
export function sparseAnswers(answers) {
  const on24 = (r) => r.day === "2026-10-24";
  return edited(answers, (name, rows) => {
    if (name === "length" || name === "clicks" || name === "countries") return rows.filter((r) => !on24(r));
    if (name === "load") return rows.map((r) => (on24(r) ? { ...r, n: "0" } : r));
    if (name === "devices") return [...rows, { day: "2026-10-24", value: "tablet", visits: "0" }];
    return rows;
  });
}

/** Every query answered with no rows. */
export function emptyAnswers(answers) {
  return edited(answers, () => []);
}

/** The answer sets and command lines the cases run, each `[label, answers, args]` (`--json` not among the args). */
export function runs(fixture) {
  return [
    ["the fixture, 2026-10-23..25", fixture, RANGE],
    ["the fixture, 2026-10-22..25", fixture, ["--from", "2026-10-22", "--to", "2026-10-25"]],
    ["the fixture, --env dev", fixture, [...RANGE, "--env", "dev"]],
    ["the fixture thinned, 2026-10-23..25", sparseAnswers(fixture), RANGE],
    ["no rows, 2026-10-30..11-02", emptyAnswers(fixture), ["--from", "2026-10-30", "--to", "2026-11-02"]],
  ];
}

const argOf = (args, name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

/**
 * The report of the package at `root`, run in this process: `args` its command line, `answers` the SQL API's answer to
 * each query by name (an object is sent as JSON, a string as it is), `status` the API's status for every query. The
 * stand-in identifies a query by the package's own query text for the range the command line names. Returns { code, out,
 * err, requests }.
 */
export async function runAt(root, args, answers, { env = ENV, status = 200 } = {}) {
  const { queries, report } = await import(pathToFileURL(join(root, "scripts", "analytics.mjs")).href);
  const requests = [];
  const fetch = async (url, init = {}) => {
    const body = String(init.body);
    requests.push({ url: String(url), method: init.method, body });
    const dataset = DATASETS[argOf(args, "--env") ?? "prod"];
    const sql = queries({ dataset, from: argOf(args, "--from"), to: argOf(args, "--to") });
    const name = Object.keys(sql).find((k) => sql[k] === body);
    assert.equal(String(url), SQL_URL, "the SQL API");
    assert.ok(name, `a query of ${dataset}: ${body.slice(0, 120)}`);
    const answer = answers[name];
    return new Response(typeof answer === "string" ? answer : JSON.stringify(answer), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
  let out = "";
  let err = "";
  const code = await report({ args, env, fetch, out: { write: (s) => (out += s) }, err: { write: (s) => (err += s) } });
  return { code, out, err, requests };
}

/** The report of `root` for `args` over `answers`, as text and as § 11's document; or a problem line. */
async function bothAt(root, label, args, answers) {
  const text = await runAt(root, args, answers);
  const json = await runAt(root, [...args, "--json"], answers);
  if (text.code !== 0 || json.code !== 0) {
    return { problem: `${label}: exit ${text.code} (text), ${json.code} (--json): ${(text.err + json.err).trim()}` };
  }
  try {
    return { text: text.out, doc: JSON.parse(json.out) };
  } catch (error) {
    return { problem: `${label}: --json printed no JSON document (${error.message}): ${json.out.slice(0, 120)}` };
  }
}

// ── The text report, read back as figures (§ 5's lines, A11's expected text) ──────────────────────────────────────

const HEADING = /^Fit AF microsite analytics: (\S+), (\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2}) \(days in (\S+); aggregates only\)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A duration as the text writes it ("820 ms", "15.5 s", "1 min 12 s"): its milliseconds, and how far the figure it
 *  was rounded from can be. */
function durationOf(s) {
  let m;
  if ((m = /^(\d+) ms$/.exec(s))) return { ms: Number(m[1]), within: 0.5 };
  if ((m = /^(\d+(?:\.\d)?) s$/.exec(s))) return { ms: Number(m[1]) * 1000, within: 50.5 };
  if ((m = /^(\d+) min (\d+) s$/.exec(s))) return { ms: (Number(m[1]) * 60 + Number(m[2])) * 1000, within: 500.5 };
  throw new Error(`not a duration the report writes: ${JSON.stringify(s)}`);
}

/** "a 3 · b 1" → { a: 3, b: 1 }; the country's "(none)" is "" (§ 11 item 1). */
function splitOf(s, country = false) {
  const out = {};
  for (const part of s.split(" · ")) {
    const m = /^(.+) (\d+)$/.exec(part);
    if (!m) throw new Error(`not a split the report writes: ${JSON.stringify(s)}`);
    out[country && m[1] === "(none)" ? "" : m[1]] = Number(m[2]);
  }
  return out;
}

/** The text report's figures, by the same names as § 11's document (a duration as { ms, within }). Throws on a line
 *  the report does not write. */
export function parseText(text) {
  const lines = text.split("\n");
  const head = HEADING.exec(lines[0]);
  if (!head) throw new Error(`not the report's heading: ${JSON.stringify(lines[0])}`);
  const out = { dataset: head[1], from: head[2], to: head[3], zone: head[4], days: [] };
  let day = null;
  for (const line of lines.slice(1)) {
    let m;
    if (line === "") continue;
    if (DATE.test(line)) out.days.push((day = { day: line }));
    else if (!day) throw new Error(`a line before the first day: ${JSON.stringify(line)}`);
    else if (line === "  no data") day.data = false;
    else if ((m = /^ {2}unique visitors (\d+) · visits (\d+)$/.exec(line))) {
      Object.assign(day, { data: true, visitors: Number(m[1]), visits: Number(m[2]), funnel: [], clicks: {} });
    } else if (line === "  funnel (visits)") continue;
    else if ((m = /^ {4}click by link: (.+)$/.exec(line))) day.clicks = splitOf(m[1]);
    else if ((m = /^ {2}saved an offer (\d+)$/.exec(line))) day.saves = Number(m[1]);
    // § 16 item 3: the visits from the offer email, and the offer pages by kind (each opening, a repeat counted again).
    else if ((m = /^ {2}visits from the offer email (\d+)$/.exec(line))) day.email_visits = Number(m[1]);
    else if ((m = /^ {2}offer pages opened \(a repeat opening counted again\): (.+)$/.exec(line))) day.offer_pages = m[1] === "none" ? {} : splitOf(m[1]);
    // SPEC-the-redirect.md § 5: a day with redirects, their count by source and by device.
    else if ((m = /^ {2}redirects to the store (\d+) \(by source: (.+); by device: (.+)\)$/.exec(line))) {
      day.redirects = { count: Number(m[1]), source: splitOf(m[2]), device: splitOf(m[3]) };
    }
    else if ((m = /^ {4}(\S.*?) +(\d+)(?: {3}\S.*)?$/.exec(line))) day.funnel.push({ step: m[1], visits: Number(m[2]) });
    else if ((m = /^ {2}(visit length|load time): (?:median (.+) · quartiles (.+) to (.+) \((\d+) visits\)|no (?:leave|open) recorded)$/.exec(line))) {
      day[m[1] === "visit length" ? "visit_length_ms" : "load_ms"] = m[2]
        ? { q1: durationOf(m[3]), median: durationOf(m[2]), q3: durationOf(m[4]), n: Number(m[5]) }
        : null;
    } else if ((m = /^ {2}(device|viewport|country): (.+)$/.exec(line))) {
      day[m[1]] = m[2] === "none" ? {} : splitOf(m[2], m[1] === "country");
    } else if ((m = /^ {2}visits with a script error: (\d+)$/.exec(line))) day.errors = Number(m[1]);
    else throw new Error(`a line the report does not write: ${JSON.stringify(line)}`);
  }
  return out;
}

// ── AJ1 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** AJ1's document for the fixture, 2026-10-23..25, written by hand from test/fixtures/analytics/ (§ 11 item 1's shape;
 *  since § 13 item 3 the funnel's answer steps in the page's order since round 2, Family's own question last; since § 14
 *  item 3 a day's `saves`, its visits with a save, from the fixture's save rows; since § 16 item 3 its `offer_pages` by
 *  kind and its `email_visits`, from offers.json and email.json). */
export const FIXTURE_DOCUMENT = {
  dataset: "fitaf_microsite_analytics_prod",
  from: "2026-10-23",
  to: "2026-10-25",
  zone: "America/New_York",
  days: [
    {
      day: "2026-10-23",
      data: true,
      visitors: 12,
      visits: 15,
      funnel: [
        { step: "open", visits: 15 },
        { step: "answer: who", visits: 13 },
        { step: "answer: lunch_dinner", visits: 9 },
        { step: "answer: weekends", visits: 6 },
        { step: "answer: breakfast", visits: 5 },
        { step: "answer: snacks", visits: 2 },
        { step: "answer: goal", visits: 11 },
        { step: "answer: family", visits: 3 },
        { step: "result", visits: 8 },
        { step: "click", visits: 4 },
      ],
      clicks: { order: 3, "chefs-choice": 1, "all-plans": 2 },
      saves: 2,
      offer_pages: { saved: 3, welcome: 1 },
      email_visits: 2,
      visit_length_ms: { q1: 25000, median: 72000, q3: 160000, n: 13 },
      load_ms: { q1: 400, median: 820, q3: 1200, n: 15 },
      device: { phone: 10, desktop: 4, tablet: 1 },
      viewport: { "<400": 8, "400-767": 5, "768-1199": 1, ">=1200": 1 },
      country: { US: 14, CA: 1 },
      errors: 1,
    },
    {
      day: "2026-10-24",
      data: true,
      visitors: 3,
      visits: 4,
      funnel: [
        { step: "open", visits: 4 },
        { step: "answer: who", visits: 3 },
        { step: "answer: lunch_dinner", visits: 2 },
        { step: "answer: weekends", visits: 0 },
        { step: "answer: breakfast", visits: 0 },
        { step: "answer: snacks", visits: 0 },
        { step: "answer: goal", visits: 2 },
        { step: "answer: family", visits: 1 },
        { step: "result", visits: 2 },
        { step: "click", visits: 1 },
      ],
      clicks: { "chefs-choice": 1 },
      saves: 1,
      offer_pages: { ended: 1 },
      email_visits: 0,
      visit_length_ms: { q1: 8000, median: 15500, q3: 40000, n: 4 },
      load_ms: { q1: 510, median: 640, q3: 900, n: 4 },
      device: { phone: 4 },
      viewport: { "<400": 4 },
      country: { US: 3, "": 1 },
      errors: 0,
    },
    { day: "2026-10-25", data: false },
  ],
};

const sortedEntries = (o) => Object.entries(o ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

/** Each figure of the text `t` (parsed) against the document `doc`: one line per difference. */
function figureDifferences(label, t, doc) {
  const out = [];
  for (const key of ["dataset", "from", "to", "zone"]) {
    if (doc?.[key] !== t[key]) out.push(`${label}: ${key}: the text's ${JSON.stringify(t[key])}, the document's ${JSON.stringify(doc?.[key])}`);
  }
  const docDays = Array.isArray(doc?.days) ? doc.days : [];
  const textDays = t.days.map((d) => d.day);
  if (!isDeepStrictEqual(docDays.map((d) => d?.day), textDays)) {
    out.push(`${label}: the days: the text's ${textDays.join(", ")}, the document's ${docDays.map((d) => d?.day).join(", ")}`);
  }
  for (const td of t.days) {
    const dd = docDays.find((d) => d?.day === td.day);
    const at = `${label} ${td.day}`;
    if (!dd) continue;
    if (dd.data !== td.data) out.push(`${at}: data: the text's ${td.data}, the document's ${dd.data}`);
    if (!td.data) continue;
    for (const key of ["visitors", "visits", "errors", "saves", "email_visits"]) {
      if (dd[key] !== td[key]) out.push(`${at}: ${key}: the text's ${td[key]}, the document's ${JSON.stringify(dd[key])}`);
    }
    const funnel = Array.isArray(dd.funnel) ? dd.funnel : [];
    for (let i = 0; i < Math.max(td.funnel.length, funnel.length); i++) {
      const [a, b] = [td.funnel[i], funnel[i]];
      if (!isDeepStrictEqual(a, b)) {
        const show = (s) => (s ? `${s.step} ${s.visits}` : "none");
        out.push(`${at}: the funnel's step ${i + 1}: the text's ${show(a)}, the document's ${show(b)}`);
      }
    }
    for (const key of ["clicks", "offer_pages", "device", "viewport", "country"]) {
      if (!isDeepStrictEqual(sortedEntries(dd[key]), sortedEntries(td[key]))) {
        out.push(`${at}: ${key}: the text's ${JSON.stringify(td[key])}, the document's ${JSON.stringify(dd[key])}`);
      }
    }
    for (const key of ["visit_length_ms", "load_ms"]) {
      const [a, b] = [td[key], dd[key]];
      if (a === null || b === null || b === undefined) {
        if (a !== b) out.push(`${at}: ${key}: the text's ${JSON.stringify(a)}, the document's ${JSON.stringify(b)}`);
        continue;
      }
      if (b.n !== a.n) out.push(`${at}: ${key}.n: the text's ${a.n}, the document's ${JSON.stringify(b.n)}`);
      for (const q of ["q1", "median", "q3"]) {
        if (typeof b[q] !== "number" || Math.abs(b[q] - a[q].ms) > a[q].within) {
          out.push(`${at}: ${key}.${q}: the text's ${a[q].ms} (±${a[q].within}), the document's ${JSON.stringify(b[q])}`);
        }
      }
    }
  }
  return out;
}

/** AJ1: for each of `runs()`, every figure of the `--json` document equals the text report's for the same answers (a
 *  duration within the text's rounding of it); and the fixture's document is the one written by hand above. */
export async function figureProblems(root = ROOT) {
  const problems = [];
  const fixture = await fixtureAnswers();
  for (const [label, answers, args] of runs(fixture)) {
    const r = await bothAt(root, label, args, answers);
    if (r.problem) {
      problems.push(r.problem);
      continue;
    }
    try {
      problems.push(...figureDifferences(label, parseText(r.text), r.doc));
    } catch (error) {
      problems.push(`${label}: ${error.message}`);
    }
  }
  const exact = await bothAt(root, "the fixture, 2026-10-23..25", RANGE, fixture);
  if (exact.doc) {
    try {
      assert.deepStrictEqual(exact.doc, FIXTURE_DOCUMENT);
    } catch (error) {
      problems.push(`the fixture's document is not the one written by hand from it: ${error.message}`);
    }
  }
  return problems;
}

// ── AJ3 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Calendar days from `from` to `to`, written here (a date is not an instant). */
function calendar(from, to) {
  const out = [];
  for (let ms = Date.parse(`${from}T00:00:00Z`); ms <= Date.parse(`${to}T00:00:00Z`); ms += 86_400_000) {
    out.push(new Date(ms).toISOString().slice(0, 10));
  }
  return out;
}

/** AJ3: a range with days of no data. Every day from `from` to `to` appears, in order; a day of no data is exactly
 *  { day, data: false }, and the text says "no data" on the same days. */
export async function noDataProblems(root = ROOT) {
  const problems = [];
  const fixture = await fixtureAnswers();
  const cases = [
    ["the fixture, 2026-10-22..25", fixture, "2026-10-22", "2026-10-25", ["2026-10-22", "2026-10-25"]],
    ["the fixture, 2026-10-25 alone", fixture, "2026-10-25", "2026-10-25", ["2026-10-25"]],
    ["no rows, 2026-10-30..11-02", emptyAnswers(fixture), "2026-10-30", "2026-11-02", calendar("2026-10-30", "2026-11-02")],
  ];
  for (const [label, answers, from, to, empty] of cases) {
    const r = await bothAt(root, label, ["--from", from, "--to", to], answers);
    if (r.problem) {
      problems.push(r.problem);
      continue;
    }
    const days = Array.isArray(r.doc.days) ? r.doc.days : [];
    const want = calendar(from, to);
    if (!isDeepStrictEqual(days.map((d) => d?.day), want)) {
      problems.push(`${label}: the days ${days.map((d) => d?.day).join(", ")}, not every day from ${from} to ${to} in order`);
    }
    for (const d of days) {
      const none = empty.includes(d?.day);
      if (none && !isDeepStrictEqual(d, { day: d.day, data: false })) {
        problems.push(`${label}: ${d.day} has no data and is ${JSON.stringify(d)}, not { day, data: false }`);
      }
      if (!none && d?.data !== true) problems.push(`${label}: ${d?.day} has data and its data is ${JSON.stringify(d?.data)}`);
    }
    let textEmpty;
    try {
      textEmpty = parseText(r.text).days.filter((d) => d.data === false).map((d) => d.day);
    } catch (error) {
      problems.push(`${label}: ${error.message}`);
      continue;
    }
    if (!isDeepStrictEqual(textEmpty, empty)) problems.push(`${label}: the text's days of no data are ${textEmpty.join(", ")}`);
  }
  return problems;
}

// ── AJ4 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** § 11 item 1's shape, written from the contract (the vocabulary from § 10's table). */
const TOP_KEYS = ["dataset", "from", "to", "zone", "days"];
// § 14 item 3: one more member of a day with data, `saves` (its visits with a save); § 16 item 3 two more, `offer_pages`
// (the offer pages by kind) and `email_visits` (the plan-page visits whose open has via email).
const DAY_KEYS = ["day", "data", "visitors", "visits", "funnel", "clicks", "saves", "offer_pages", "email_visits", "visit_length_ms", "load_ms", "device", "viewport", "country", "errors"];
const NO_DATA_KEYS = ["day", "data"];
/** SPEC-the-redirect.md § 5: a day with redirects carries one more member, `redirects`, after `email_visits` (a day without
 *  one carries none, so a window without a redirect reads as before): its count, by source (each QR id, `email`,
 *  `direct`) and by device. */
const REDIRECTS = "redirects";
const REDIRECT_KEYS = ["count", "source", "device"];
const REDIRECT_SPLITS = {
  source: (k) => ["demo", "boston", "seminar", "email", "direct"].includes(k),
  device: (k) => ["phone", "tablet", "desktop"].includes(k),
};
const STEP_KEYS = ["step", "visits"];
const QUARTILE_KEYS = ["q1", "median", "q3", "n"];
// § 13 item 3: two more answer steps, who it is for and Family's own question.
const STEP_NAMES = ["open", "answer: who", "answer: lunch_dinner", "answer: weekends", "answer: breakfast", "answer: snacks", "answer: goal", "answer: family", "result", "click"];
const SPLIT_KEYS = {
  clicks: (k) => ["order", "chefs-choice", "all-plans"].includes(k),
  // § 16 item 1: the offer page's four kinds.
  offer_pages: (k) => ["saved", "welcome", "current", "ended"].includes(k),
  device: (k) => ["phone", "tablet", "desktop"].includes(k),
  viewport: (k) => ["<400", "400-767", "768-1199", ">=1200"].includes(k),
  country: (k) => /^(?:[A-Z0-9]{2})?$/.test(k),
};

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isCount = (v) => typeof v === "number" && Number.isInteger(v) && v >= 0;

/** `value` an object whose keys are exactly `keys`: one line per extra or missing key. */
function keysProblems(path, value, keys) {
  if (!isObject(value)) return [`${path}: not an object: ${JSON.stringify(value)}`];
  const out = [];
  for (const k of Object.keys(value)) if (!keys.includes(k)) out.push(`${path}: a field outside § 11's shape: ${JSON.stringify(k)}`);
  for (const k of keys) if (!Object.hasOwn(value, k)) out.push(`${path}: no ${JSON.stringify(k)}`);
  return out;
}

/** The walk: one line per field of `doc` outside § 11 item 1's shape, or of the wrong kind. */
export function walkProblems(doc) {
  const out = keysProblems("the document", doc, TOP_KEYS);
  if (!isObject(doc)) return out;
  if (!Object.values(DATASETS).includes(doc.dataset)) out.push(`dataset: not a dataset of § 6: ${JSON.stringify(doc.dataset)}`);
  for (const k of ["from", "to"]) if (typeof doc[k] !== "string" || !DATE.test(doc[k])) out.push(`${k}: not a date: ${JSON.stringify(doc[k])}`);
  if (doc.zone !== "America/New_York") out.push(`zone: ${JSON.stringify(doc.zone)}`);
  if (!Array.isArray(doc.days)) return [...out, `days: not a list: ${JSON.stringify(doc.days)}`];
  doc.days.forEach((d, i) => {
    const at = `days[${i}]`;
    if (!isObject(d)) return out.push(`${at}: not an object: ${JSON.stringify(d)}`);
    if (typeof d.day !== "string" || !DATE.test(d.day)) out.push(`${at}.day: not a date: ${JSON.stringify(d.day)}`);
    if (d.data === false) return out.push(...keysProblems(at, d, NO_DATA_KEYS));
    if (d.data !== true) return out.push(`${at}.data: ${JSON.stringify(d.data)}, not true or false`);
    out.push(...keysProblems(at, d, Object.hasOwn(d, REDIRECTS) ? [...DAY_KEYS, REDIRECTS] : DAY_KEYS));
    if (Object.hasOwn(d, REDIRECTS)) {
      const r = d[REDIRECTS];
      out.push(...keysProblems(`${at}.${REDIRECTS}`, r, REDIRECT_KEYS));
      if (!isCount(r?.count) || r?.count === 0) out.push(`${at}.${REDIRECTS}.count: ${JSON.stringify(r?.count)} (a day without one has no member)`);
      for (const [k, allowed] of Object.entries(REDIRECT_SPLITS)) {
        if (!isObject(r?.[k])) {
          out.push(`${at}.${REDIRECTS}.${k}: not an object: ${JSON.stringify(r?.[k])}`);
          continue;
        }
        for (const [key, n] of Object.entries(r[k])) {
          if (!allowed(key)) out.push(`${at}.${REDIRECTS}.${k}: a key outside its vocabulary: ${JSON.stringify(key)}`);
          if (!isCount(n)) out.push(`${at}.${REDIRECTS}.${k}[${JSON.stringify(key)}]: not a count: ${JSON.stringify(n)}`);
        }
      }
    }
    for (const k of ["visitors", "visits", "errors", "saves", "email_visits"]) if (!isCount(d[k])) out.push(`${at}.${k}: not a count: ${JSON.stringify(d[k])}`);
    if (!Array.isArray(d.funnel)) out.push(`${at}.funnel: not a list: ${JSON.stringify(d.funnel)}`);
    else {
      d.funnel.forEach((s, j) => {
        out.push(...keysProblems(`${at}.funnel[${j}]`, s, STEP_KEYS));
        if (!STEP_NAMES.includes(s?.step)) out.push(`${at}.funnel[${j}].step: not a step of § 5's funnel: ${JSON.stringify(s?.step)}`);
        if (!isCount(s?.visits)) out.push(`${at}.funnel[${j}].visits: not a count: ${JSON.stringify(s?.visits)}`);
      });
    }
    for (const [k, allowed] of Object.entries(SPLIT_KEYS)) {
      if (!isObject(d[k])) {
        out.push(`${at}.${k}: not an object: ${JSON.stringify(d[k])}`);
        continue;
      }
      for (const [key, n] of Object.entries(d[k])) {
        if (!allowed(key)) out.push(`${at}.${k}: a key outside its vocabulary: ${JSON.stringify(key)}`);
        if (!isCount(n)) out.push(`${at}.${k}[${JSON.stringify(key)}]: not a count: ${JSON.stringify(n)}`);
      }
    }
    for (const k of ["visit_length_ms", "load_ms"]) {
      if (d[k] === null) continue;
      out.push(...keysProblems(`${at}.${k}`, d[k], QUARTILE_KEYS));
      for (const q of ["q1", "median", "q3"]) {
        if (typeof d[k]?.[q] !== "number" || !Number.isFinite(d[k][q]) || d[k][q] < 0) out.push(`${at}.${k}.${q}: ${JSON.stringify(d[k]?.[q])}`);
      }
      if (!isCount(d[k]?.n) || d[k]?.n === 0) out.push(`${at}.${k}.n: ${JSON.stringify(d[k]?.n)} (no visits is null)`);
    }
  });
  return out;
}

/** AJ4: for each of `runs()`, the `--json` document has no field but § 11 item 1's shape (the walk above). */
export async function shapeProblems(root = ROOT) {
  const problems = [];
  for (const [label, answers, args] of runs(await fixtureAnswers())) {
    const r = await bothAt(root, label, args, answers);
    if (r.problem) problems.push(r.problem);
    else problems.push(...walkProblems(r.doc).map((p) => `${label}: ${p}`));
  }
  return problems;
}
