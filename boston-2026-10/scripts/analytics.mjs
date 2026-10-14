// `npm run analytics -- --from YYYY-MM-DD --to YYYY-MM-DD [--env dev]` (SPEC-analytics.md § 5): the page's analytics,
// per UTC day, read from Workers Analytics Engine's SQL API. Aggregates only, never a row per visit: every query groups
// by day, and a visit's id (`s`, blob2) and a visitor's (`v`, index1) are read only inside count(DISTINCT …).
//
//   CLOUDFLARE_ANALYTICS_TOKEN   a read-only token ("Account Analytics Read"), the operator's, never in this repository
//   CLOUDFLARE_ACCOUNT_ID        the account (as for wrangler); never committed
//
// Per day: unique visitors and visits; the funnel (open → each answer → result → click), each step's visits and the
// change from the step before; the click-through by link; the visit's length (median and quartiles, from `leave`) and
// the load time (from `open`); the device, viewport band and country splits (from `open`); the visits with an error.
// A day with nothing recorded says so. Exit 0; 1 when the SQL API refuses or answers what this cannot read; 2 for a
// refused command line or a missing variable, before any request.
// ⛔ Read-only: it sends SELECTs and nothing else, and never prints the token.
import { fileURLToPath } from "node:url";
import { BLOBS, DOUBLES, LINKS, QUESTIONS, STEPS, VIEWPORTS } from "../src/worker/beacon.js";

/** The datasets (SPEC-analytics.md § 6; the infrastructure's Amendment 1.8). */
export const DATASETS = { prod: "fitaf_microsite_analytics_prod", dev: "fitaf_microsite_analytics_dev" };
export const TOKEN_VAR = "CLOUDFLARE_ANALYTICS_TOKEN";
export const ACCOUNT_VAR = "CLOUDFLARE_ACCOUNT_ID";
export const sqlUrl = (account) => `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/analytics_engine/sql`;

const DAY_MS = 86_400_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A field's column (beacon.js's layout): blobN, doubleN. */
const col = (name) => {
  const b = BLOBS.indexOf(name);
  if (b >= 0) return `blob${b + 1}`;
  const d = DOUBLES.indexOf(name);
  if (d >= 0) return `double${d + 1}`;
  throw new Error(`no column for ${name}`);
};

/** A UTC date's next day, "YYYY-MM-DD". */
const nextDay = (ymd) => new Date(Date.parse(`${ymd}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
const isDate = (ymd) => {
  const ms = DATE.test(ymd) ? Date.parse(`${ymd}T00:00:00Z`) : NaN;
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === ymd;
};

/** The report's queries over `dataset` for the UTC days `from`..`to`, by name. Dates are checked before they get here. */
export function queries({ dataset, from, to }) {
  const day = "formatDateTime(timestamp, '%Y-%m-%d')";
  const range = `timestamp >= toDateTime('${from} 00:00:00') AND timestamp < toDateTime('${nextDay(to)} 00:00:00')`;
  const where = (event) => `WHERE ${range}${event ? ` AND ${col("event")} = '${event}'` : ""}`;
  const visits = `count(DISTINCT ${col("s")})`;
  const quartiles = (field) =>
    [0.25, 0.5, 0.75]
      .map((q, i) => `quantileExactWeighted(${q})(${col(field)}, _sample_interval) AS ${["q1", "median", "q3"][i]}`)
      .join(", ");
  const split = (field) =>
    `SELECT ${day} AS day, ${col(field)} AS value, sum(_sample_interval) AS visits FROM ${dataset} ${where("open")} GROUP BY day, value ORDER BY day FORMAT JSON`;
  return {
    visitors: `SELECT ${day} AS day, count(DISTINCT index1) AS visitors, ${visits} AS visits FROM ${dataset} ${where()} GROUP BY day ORDER BY day FORMAT JSON`,
    steps: `SELECT ${day} AS day, ${col("event")} AS event, ${col("question")} AS question, ${visits} AS visits FROM ${dataset} ${where()} GROUP BY day, event, question ORDER BY day FORMAT JSON`,
    clicks: `SELECT ${day} AS day, ${col("link")} AS link, ${visits} AS visits FROM ${dataset} ${where("click")} GROUP BY day, link ORDER BY day FORMAT JSON`,
    length: `SELECT ${day} AS day, ${quartiles("length_ms")}, sum(_sample_interval) AS n FROM ${dataset} ${where("leave")} GROUP BY day ORDER BY day FORMAT JSON`,
    load: `SELECT ${day} AS day, ${quartiles("load_ms")}, sum(_sample_interval) AS n FROM ${dataset} ${where("open")} GROUP BY day ORDER BY day FORMAT JSON`,
    devices: split("device"),
    viewports: split("viewport"),
    countries: split("country"),
  };
}

/** The command line: { from, to, env } or an error message. */
export function parseArgs(args) {
  const out = { env: "prod" };
  for (let i = 0; i < args.length; i++) {
    const name = args[i];
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

/** "a 3 · b 1": the values with visits, by `order` (a list) or most visits first. */
function splitLine(rows, order, label = (v) => v) {
  const counts = new Map();
  for (const r of rows) counts.set(r.value ?? r.link, (counts.get(r.value ?? r.link) ?? 0) + num(r.visits));
  const entries = [...counts].filter(([, n]) => n > 0);
  if (order) entries.sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
  else entries.sort(([a, x], [b, y]) => y - x || String(a).localeCompare(String(b)));
  return entries.map(([v, n]) => `${label(v)} ${n}`).join(" · ");
}

/** The report's text, from each query's rows. */
export function reportText({ dataset, from, to }, rows) {
  const days = Object.fromEntries(Object.entries(rows).map(([name, list]) => [name, byDay(list)]));
  const lines = [`Fit AF microsite analytics: ${dataset}, ${from} to ${to} (UTC days; aggregates only)`, ""];
  for (let day = from; day <= to; day = nextDay(day)) {
    lines.push(day);
    const visitors = days.visitors.get(day)?.[0];
    if (!visitors) {
      lines.push("  no data", "");
      continue;
    }
    lines.push(`  unique visitors ${num(visitors.visitors)} · visits ${num(visitors.visits)}`);
    const steps = days.steps.get(day) ?? [];
    const visitsOf = (event, question = "") =>
      num(steps.find((r) => r.event === event && (r.question ?? "") === question)?.visits);
    const funnel = [
      ["open", visitsOf("open")],
      ...Object.keys(QUESTIONS).map((q) => [`answer: ${q}`, visitsOf("answer", q)]),
      ["result", visitsOf("result")],
      ["click", visitsOf("click")],
    ];
    lines.push("  funnel (visits)");
    funnel.forEach(([label, n], i) => {
      const tail = i ? `   ${change(n, funnel[i - 1][1])}` : "";
      lines.push(`    ${label.padEnd(22)}${String(n).padStart(5)}${tail}`);
    });
    const clicks = splitLine(days.clicks.get(day) ?? [], LINKS);
    if (clicks) lines.push(`    click by link: ${clicks}`);
    for (const [name, label, what] of [["length", "visit length", "leave"], ["load", "load time", "open"]]) {
      const r = days[name].get(day)?.[0];
      lines.push(
        r && num(r.n)
          ? `  ${label}: median ${duration(r.median)} · quartiles ${duration(r.q1)} to ${duration(r.q3)} (${num(r.n)} visits)`
          : `  ${label}: no ${what} recorded`,
      );
    }
    lines.push(`  device: ${splitLine(days.devices.get(day) ?? []) || "none"}`);
    lines.push(`  viewport: ${splitLine(days.viewports.get(day) ?? [], VIEWPORTS) || "none"}`);
    lines.push(`  country: ${splitLine(days.countries.get(day) ?? [], null, (v) => v || "(none)") || "none"}`);
    lines.push(`  visits with a script error: ${visitsOf("error")}`, "");
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
    err.write(`analytics: ${parsed.error}\nusage: npm run analytics -- --from YYYY-MM-DD --to YYYY-MM-DD [--env dev]\n`);
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
  out.write(reportText(scope, rows));
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
