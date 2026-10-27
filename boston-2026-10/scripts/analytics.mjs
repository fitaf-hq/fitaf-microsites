// `npm run analytics -- --from YYYY-MM-DD --to YYYY-MM-DD [--env dev] [--json]` (SPEC-analytics.md § 5, § 11): the
// page's analytics, per day of America/New_York (§ 2's day, the salt's: ruled 2026-10-13), read from Workers Analytics Engine's SQL API.
// The dates are New York dates; the SQL reads them in that zone (formatDateTime's and toDateTime's time-zone argument,
// the engine's own zone arithmetic, so a day across a DST change is 23 or 25 hours). Aggregates only, never a row per visit: every query groups
// by day, and a visit's id (`s`, blob2) and a visitor's (`v`: since § 15 blob12, index1 on the rows written before it) are
// read only inside count(DISTINCT …).
//
//   CLOUDFLARE_ANALYTICS_TOKEN   a read-only token ("Account Analytics Read"), the operator's, never in this repository
//   CLOUDFLARE_ACCOUNT_ID        the account (as for wrangler); never committed
//
// Per day: unique visitors and visits; the funnel (open → each answer → result → click), each step's visits and the
// change from the step before (since § 13 the answers in the page's order since round 2, who it is for first and the
// goal last, then Family's own question, a branch off `who` with no change figure); the click-through by link; since
// § 14 the visits with a `save` (a stored offer save), the line after the funnel, from the funnel's own query; the
// visit's length (median and quartiles, from `leave`) and the load time (from `open`); the device, viewport band and
// country splits (from `open`); the visits with an error.
// Since § 16 (2026-10-27: the offer email's clicks, and its visitors as their own source) the offer page's `offer` is
// counted apart: a visit whose only event is `offer` is not a plan-page visit, so the visitors and visits leave the
// offer pages' rows out and every figure above is exactly as before; each day gains the visits from the offer email
// (the plan-page visits whose `open` has `via` "email") and the offer pages opened, by kind, each opening counted (a
// repeat opening too: nothing ties two to one person), a line each after the saves, from two queries of their own. A
// day with offer pages alone is a day with data, its plan-page figures those of no visit.
// Since SPEC-the-redirect.md § 5 (2026-10-27: the home page a redirect to the store) the Worker's own `redirect` is
// counted apart the same way: a visit whose only event is `redirect` is not a plan-page visit, so the visitors and
// visits leave its rows out and every figure above is exactly as before. A day with redirects gains one member and one
// line after the offer pages', `redirects`: their count, by source (each QR id, `email`, `direct`) and by device, from
// a query of its own; a day without one has neither, so a window with no redirect row reads exactly as before. A day
// with redirects alone is a day with data, its plan-page figures those of no visit.
// A day with nothing recorded says so. `--json` (§ 11) prints the same figures as one JSON document instead of the text:
// reportData computes them, once, and the text (reportText) is a formatting of that document, so the two cannot
// disagree. Exit 0; 1 when the SQL API refuses or answers what this cannot read; 2 for a refused command line or a
// missing variable, before any request; nothing on stdout but the report.
// ⛔ Read-only: it sends SELECTs and nothing else, and never prints the token.
import { fileURLToPath } from "node:url";
import { ANALYTICS_ZONE, BLOBS, DEVICES, DOUBLES, LINKS, OFFER_KINDS, QR_IDS, QUESTIONS, REDIRECT_EVENT, VIEWPORTS } from "../src/worker/beacon.js";

/** The datasets (SPEC-analytics.md § 6; the infrastructure's Amendment 1.8). */
export const DATASETS = { prod: "fitaf_microsite_analytics_prod", dev: "fitaf_microsite_analytics_dev" };
export const TOKEN_VAR = "CLOUDFLARE_ANALYTICS_TOKEN";
export const ACCOUNT_VAR = "CLOUDFLARE_ACCOUNT_ID";
export const sqlUrl = (account) => `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/analytics_engine/sql`;

const DAY_MS = 86_400_000;
/** § 13 item 3: Family's own question branches off `who` (the page asks it after *Me and my family* alone); it is not a
 *  step after `goal`. Its line has no change figure, and the step after it is compared with the step before it. */
const BRANCHES = ["answer: family"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** SPEC-the-redirect.md § 5: a redirect's source, in this order: each QR id (data/events.json's), then the offer email,
 *  then anything else. */
const EMAIL_SOURCE = "email";
const DIRECT_SOURCE = "direct";
const REDIRECT_SOURCES = [...QR_IDS, EMAIL_SOURCE, DIRECT_SOURCE];

/** A field's column (beacon.js's layout): blobN, doubleN. */
const col = (name) => {
  const b = BLOBS.indexOf(name);
  if (b >= 0) return `blob${b + 1}`;
  const d = DOUBLES.indexOf(name);
  if (d >= 0) return `double${d + 1}`;
  throw new Error(`no column for ${name}`);
};

/** A date's next day, "YYYY-MM-DD" (calendar arithmetic: a date is not an instant). */
const nextDay = (ymd) => new Date(Date.parse(`${ymd}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
const isDate = (ymd) => {
  const ms = DATE.test(ymd) ? Date.parse(`${ymd}T00:00:00Z`) : NaN;
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === ymd;
};

/** The report's queries over `dataset` for the New York days `from`..`to`, by name. Dates are checked before they get
 *  here. */
export function queries({ dataset, from, to }) {
  const zone = `'${ANALYTICS_ZONE}'`;
  const day = `formatDateTime(timestamp, '%Y-%m-%d', ${zone})`;
  const range = `timestamp >= toDateTime('${from} 00:00:00', ${zone}) AND timestamp < toDateTime('${nextDay(to)} 00:00:00', ${zone})`;
  const where = (event) => `WHERE ${range}${event ? ` AND ${col("event")} = '${event}'` : ""}`;
  const visits = `count(DISTINCT ${col("s")})`;
  // § 15 item 3: a row's visitor is blob12 since § 15, else (a row written before it, blob12 never written) index1, so a
  // window holding both layouts counts each visitor where it is.
  const visitors = `count(DISTINCT if(${col("v")} = '', index1, ${col("v")}))`;
  // § 16 item 3: a visit whose only event is `offer` (the offer page's, which sends nothing else) is not a plan-page
  // visit: the visitors and visits leave the offer pages' rows out, exactly as before § 16.
  // SPEC-the-redirect.md § 5: and the Worker's own `redirect` (a visit of its own, the redirect alone), likewise.
  const planPage = `${col("event")} != 'offer' AND ${col("event")} != '${REDIRECT_EVENT}'`;
  const quartiles = (field) =>
    [0.25, 0.5, 0.75]
      .map((q, i) => `quantileExactWeighted(${q})(${col(field)}, _sample_interval) AS ${["q1", "median", "q3"][i]}`)
      .join(", ");
  const split = (field) =>
    `SELECT ${day} AS day, ${col(field)} AS value, sum(_sample_interval) AS visits FROM ${dataset} ${where("open")} GROUP BY day, value ORDER BY day FORMAT JSON`;
  return {
    visitors: `SELECT ${day} AS day, ${visitors} AS visitors, ${visits} AS visits FROM ${dataset} ${where()} AND ${planPage} GROUP BY day ORDER BY day FORMAT JSON`,
    steps: `SELECT ${day} AS day, ${col("event")} AS event, ${col("question")} AS question, ${visits} AS visits FROM ${dataset} ${where()} GROUP BY day, event, question ORDER BY day FORMAT JSON`,
    clicks: `SELECT ${day} AS day, ${col("link")} AS link, ${visits} AS visits FROM ${dataset} ${where("click")} GROUP BY day, link ORDER BY day FORMAT JSON`,
    length: `SELECT ${day} AS day, ${quartiles("length_ms")}, sum(_sample_interval) AS n FROM ${dataset} ${where("leave")} GROUP BY day ORDER BY day FORMAT JSON`,
    load: `SELECT ${day} AS day, ${quartiles("load_ms")}, sum(_sample_interval) AS n FROM ${dataset} ${where("open")} GROUP BY day ORDER BY day FORMAT JSON`,
    devices: split("device"),
    viewports: split("viewport"),
    countries: split("country"),
    // § 16 item 3: the offer pages opened, by kind (each a visit of its own), and the plan-page visits from the offer email.
    offers: `SELECT ${day} AS day, ${col("kind")} AS kind, ${visits} AS visits FROM ${dataset} ${where("offer")} GROUP BY day, kind ORDER BY day FORMAT JSON`,
    email: `SELECT ${day} AS day, ${visits} AS visits FROM ${dataset} ${where("open")} AND ${col("via")} = 'email' GROUP BY day ORDER BY day FORMAT JSON`,
    // SPEC-the-redirect.md § 5: the home page's redirects, each a visit of its own, by its QR id, via and device.
    redirects: `SELECT ${day} AS day, ${col("qr")} AS qr, ${col("via")} AS via, ${col("device")} AS device, ${visits} AS visits FROM ${dataset} ${where(REDIRECT_EVENT)} GROUP BY day, qr, via, device ORDER BY day FORMAT JSON`,
  };
}

/** The command line: { from, to, env, json } or an error message. `--json` takes no value. */
export function parseArgs(args) {
  const out = { env: "prod", json: false };
  for (let i = 0; i < args.length; i++) {
    const name = args[i];
    if (name === "--json") {
      out.json = true;
      continue;
    }
    if (!["--from", "--to", "--env"].includes(name)) return { error: `unknown argument: ${name}` };
    const value = args[++i];
    if (value === undefined) return { error: `${name} needs a value` };
    out[name.slice(2)] = value;
  }
  if (!out.from || !isDate(out.from)) return { error: "--from YYYY-MM-DD is required (a real date)" };
  if (!out.to || !isDate(out.to)) return { error: "--to YYYY-MM-DD is required (a real date)" };
  if (out.from > out.to) return { error: "--from must not be after --to" };
  if (!Object.hasOwn(DATASETS, out.env)) return { error: `--env must be dev, or absent for production (got ${out.env})` };
  return out;
}

const num = (v) => Number(v ?? 0);
const byDay = (rows) => {
  const out = new Map();
  for (const row of rows) {
    if (!out.has(row.day)) out.set(row.day, []);
    out.get(row.day).push(row);
  }
  return out;
};

/** A duration for a person: "820 ms", "25 s", "15.5 s", "1.2 s", "1 min 12 s". */
export function duration(ms) {
  const n = Math.round(num(ms));
  if (n < 1000) return `${n} ms`;
  if (n < 60_000) return `${Number((n / 1000).toFixed(1))} s`;
  const s = Math.round(n / 1000);
  return `${Math.floor(s / 60)} min ${s % 60} s`;
}

/** "-4 (27%)", "+6", "0": a step's change from the step before. */
function change(now, before) {
  const d = now - before;
  if (d > 0) return `+${d}`;
  if (d === 0) return "0";
  return `${d} (${Math.round((-d / before) * 100)}%)`;
}

/** A split's [value, visits] entries in the report's order: by `order` (a list), or most visits first. */
function ordered(entries, order) {
  if (order) return [...entries].sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
  return [...entries].sort(([a, x], [b, y]) => y - x || String(a).localeCompare(String(b)));
}

/** A split's counts, { value: visits }, from its rows (`field` the value's column): the values with visits, summed, in
 *  the report's order. A row without the column counts as "". */
function splitCounts(rows, field, order = null) {
  const counts = new Map();
  for (const r of rows ?? []) counts.set(r[field] ?? "", (counts.get(r[field] ?? "") ?? 0) + num(r.visits));
  return Object.fromEntries(ordered([...counts].filter(([, n]) => n > 0), order));
}

/** SPEC-the-redirect.md § 5: a day's redirects from its rows, { count, source, device }: the source "email" for a
 *  redirect from the offer email, else its QR id, else "direct", in REDIRECT_SOURCES' order; the device in DEVICES'.
 *  null when there is none. */
function redirectCounts(rows) {
  const sourced = (rows ?? []).map((r) => ({ ...r, source: r.via === EMAIL_SOURCE ? EMAIL_SOURCE : r.qr || DIRECT_SOURCE }));
  const count = sourced.reduce((n, r) => n + num(r.visits), 0);
  if (!count) return null;
  return { count, source: splitCounts(sourced, "source", REDIRECT_SOURCES), device: splitCounts(sourced, "device", DEVICES) };
}

/** A length's or load's quartiles, { q1, median, q3, n }; null with no visits. */
function quartilesOf(row) {
  return row && num(row.n) ? { q1: num(row.q1), median: num(row.median), q3: num(row.q3), n: num(row.n) } : null;
}

/**
 * The report's figures (SPEC-analytics.md § 5), from each query's rows: § 11's document, the one computation both
 * outputs read. Every New York day from `from` to `to`, in order; a day with nothing recorded is { day, data: false }.
 * Aggregates only (§ 11 item 2): nothing per visit, no visit or visitor id.
 */
export function reportData({ dataset, from, to }, rows) {
  const days = Object.fromEntries(Object.entries(rows).map(([name, list]) => [name, byDay(list)]));
  const doc = { dataset, from, to, zone: ANALYTICS_ZONE, days: [] };
  for (let day = from; day <= to; day = nextDay(day)) {
    // § 16 item 3: a day of offer pages alone has data; its plan-page figures are those of no visit.
    const visitors = days.visitors.get(day)?.[0];
    const offers = days.offers.get(day);
    // SPEC-the-redirect.md § 5: a day of redirects alone has data too.
    const redirects = redirectCounts(days.redirects?.get(day));
    if (!visitors && !offers && !redirects) {
      doc.days.push({ day, data: false });
      continue;
    }
    const steps = days.steps.get(day) ?? [];
    const visitsOf = (event, question = "") =>
      num(steps.find((r) => r.event === event && (r.question ?? "") === question)?.visits);
    doc.days.push({
      day,
      data: true,
      visitors: num(visitors?.visitors),
      visits: num(visitors?.visits),
      funnel: [
        { step: "open", visits: visitsOf("open") },
        ...Object.keys(QUESTIONS).map((q) => ({ step: `answer: ${q}`, visits: visitsOf("answer", q) })),
        { step: "result", visits: visitsOf("result") },
        { step: "click", visits: visitsOf("click") },
      ],
      clicks: splitCounts(days.clicks.get(day), "link", LINKS),
      saves: visitsOf("save"),
      offer_pages: splitCounts(offers, "kind", OFFER_KINDS),
      email_visits: num(days.email.get(day)?.[0]?.visits),
      ...(redirects ? { redirects } : {}),
      visit_length_ms: quartilesOf(days.length.get(day)?.[0]),
      load_ms: quartilesOf(days.load.get(day)?.[0]),
      device: splitCounts(days.devices.get(day), "value"),
      viewport: splitCounts(days.viewports.get(day), "value", VIEWPORTS),
      country: splitCounts(days.countries.get(day), "value"),
      errors: visitsOf("error"),
    });
  }
  return doc;
}

/** "a 3 · b 1": a split's counts in the report's order, each value by its label. */
function splitLine(counts, order, label = (v) => v) {
  return ordered(Object.entries(counts), order)
    .map(([v, n]) => `${label(v)} ${n}`)
    .join(" · ");
}

/** The report's text: a formatting of reportData's document. */
export function reportText(doc) {
  const lines = [`Fit AF microsite analytics: ${doc.dataset}, ${doc.from} to ${doc.to} (days in ${doc.zone}; aggregates only)`, ""];
  for (const d of doc.days) {
    lines.push(d.day);
    if (!d.data) {
      lines.push("  no data", "");
      continue;
    }
    lines.push(`  unique visitors ${d.visitors} · visits ${d.visits}`);
    lines.push("  funnel (visits)");
    let before = null;
    for (const { step, visits } of d.funnel) {
      const branch = BRANCHES.includes(step);
      const tail = before === null || branch ? "" : `   ${change(visits, before)}`;
      lines.push(`    ${step.padEnd(22)}${String(visits).padStart(5)}${tail}`);
      if (!branch) before = visits;
    }
    const clicks = splitLine(d.clicks, LINKS);
    if (clicks) lines.push(`    click by link: ${clicks}`);
    lines.push(`  saved an offer ${d.saves}`);
    lines.push(`  visits from the offer email ${d.email_visits}`);
    lines.push(`  offer pages opened (a repeat opening counted again): ${splitLine(d.offer_pages, OFFER_KINDS) || "none"}`);
    if (d.redirects) {
      const { count, source, device } = d.redirects;
      lines.push(`  redirects to the store ${count} (by source: ${splitLine(source, REDIRECT_SOURCES)}; by device: ${splitLine(device, DEVICES)})`);
    }
    for (const [q, label, what] of [[d.visit_length_ms, "visit length", "leave"], [d.load_ms, "load time", "open"]]) {
      lines.push(
        q
          ? `  ${label}: median ${duration(q.median)} · quartiles ${duration(q.q1)} to ${duration(q.q3)} (${q.n} visits)`
          : `  ${label}: no ${what} recorded`,
      );
    }
    lines.push(`  device: ${splitLine(d.device) || "none"}`);
    lines.push(`  viewport: ${splitLine(d.viewport, VIEWPORTS) || "none"}`);
    lines.push(`  country: ${splitLine(d.country, null, (v) => v || "(none)") || "none"}`);
    lines.push(`  visits with a script error: ${d.errors}`, "");
  }
  return lines.join("\n");
}

/**
 * The report: `args` the command line after the script, `env` the environment, `fetch` the one way out, `out` and `err`
 * where it writes. Returns the exit code.
 */
export async function report({ args, env, fetch, out, err }) {
  const parsed = parseArgs(args);
  if (parsed.error) {
    err.write(`analytics: ${parsed.error}\nusage: npm run analytics -- --from YYYY-MM-DD --to YYYY-MM-DD [--env dev] [--json]\n`);
    return 2;
  }
  const token = env[TOKEN_VAR];
  const account = env[ACCOUNT_VAR];
  if (!token) {
    err.write(`analytics: ${TOKEN_VAR} is not set (a read-only "Account Analytics Read" token, the operator's)\n`);
    return 2;
  }
  if (!account) {
    err.write(`analytics: ${ACCOUNT_VAR} is not set\n`);
    return 2;
  }
  const dataset = DATASETS[parsed.env];
  const scope = { dataset, from: parsed.from, to: parsed.to };
  const rows = {};
  for (const [name, sql] of Object.entries(queries(scope))) {
    const res = await fetch(sqlUrl(account), { method: "POST", headers: { authorization: `Bearer ${token}` }, body: sql });
    const text = await res.text();
    if (!res.ok) {
      err.write(`analytics: the SQL API answered ${res.status} to the ${name} query: ${text.slice(0, 500)}\n`);
      return 1;
    }
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      err.write(`analytics: the ${name} query's answer is not JSON\n`);
      return 1;
    }
    if (!Array.isArray(body?.data)) {
      err.write(`analytics: the ${name} query's answer has no data list\n`);
      return 1;
    }
    rows[name] = body.data;
  }
  const doc = reportData(scope, rows);
  out.write(parsed.json ? `${JSON.stringify(doc, null, 2)}\n` : reportText(doc));
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  report({ args: process.argv.slice(2), env: process.env, fetch: globalThis.fetch, out: process.stdout, err: process.stderr }).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      process.stderr.write(`analytics: ${error.message}\n`);
      process.exitCode = 1;
    },
  );
}
