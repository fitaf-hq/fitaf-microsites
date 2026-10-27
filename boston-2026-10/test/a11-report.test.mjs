// A11 (SPEC-analytics.md § 5, § 7): `npm run analytics` against a fixture SQL response: the per-day report, aggregates
// only, its days America/New_York's (§ 2's day, ruled 2026-10-13: grouped and bounded in that zone by the SQL itself). The report (scripts/analytics.mjs) is run in this process with a stand-in for `fetch` that answers each of its
// queries from test/fixtures/analytics/<query>.json (invented numbers, in the SQL API's JSON format: `meta`, `data`,
// `rows`; counts as the strings ClickHouse writes UInt64 as). Nothing is requested. The expected report is written
// here, by hand, from the fixture (since SPEC-analytics § 13 item 3 the funnel in the page's order since round 2, who
// first and the goal last, then Family's own question, which branches off who and has no change figure: the step after
// it is compared with the goal's; since § 14 item 3 a day's visits with a save, "saved an offer N", after the funnel).
// Every query asks for aggregates only: a visit's id (`s`) and a visitor's (`v`) are
// read only inside count(DISTINCT …). And the program's refusals, run as a program: no token, no account, a bad date,
// --from after --to, an unknown argument; each exits 2 before any request.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";

const FIXTURES = join(ROOT, "test", "fixtures", "analytics");
const NAMES = ["visitors", "steps", "clicks", "length", "load", "devices", "viewports", "countries"];
const ENV = { CLOUDFLARE_ANALYTICS_TOKEN: "test-token", CLOUDFLARE_ACCOUNT_ID: "test-account" };
const SQL_URL = "https://api.cloudflare.com/client/v4/accounts/test-account/analytics_engine/sql";

const EXPECTED = `Fit AF microsite analytics: fitaf_microsite_analytics_prod, 2026-10-23 to 2026-10-25 (days in America/New_York; aggregates only)

2026-10-23
  unique visitors 12 · visits 15
  funnel (visits)
    open                     15
    answer: who              13   -2 (13%)
    answer: lunch_dinner      9   -4 (31%)
    answer: weekends          6   -3 (33%)
    answer: breakfast         5   -1 (17%)
    answer: snacks            2   -3 (60%)
    answer: goal             11   +9
    answer: family            3
    result                    8   -3 (27%)
    click                     4   -4 (50%)
    click by link: order 3 · chefs-choice 1 · all-plans 2
  saved an offer 2
  visit length: median 1 min 12 s · quartiles 25 s to 2 min 40 s (13 visits)
  load time: median 820 ms · quartiles 400 ms to 1.2 s (15 visits)
  device: phone 10 · desktop 4 · tablet 1
  viewport: <400 8 · 400-767 5 · 768-1199 1 · >=1200 1
  country: US 14 · CA 1
  visits with a script error: 1

2026-10-24
  unique visitors 3 · visits 4
  funnel (visits)
    open                      4
    answer: who               3   -1 (25%)
    answer: lunch_dinner      2   -1 (33%)
    answer: weekends          0   -2 (100%)
    answer: breakfast         0   0
    answer: snacks            0   0
    answer: goal              2   +2
    answer: family            1
    result                    2   0
    click                     1   -1 (50%)
    click by link: chefs-choice 1
  saved an offer 1
  visit length: median 15.5 s · quartiles 8 s to 40 s (4 visits)
  load time: median 640 ms · quartiles 510 ms to 900 ms (4 visits)
  device: phone 4
  viewport: <400 4
  country: US 3 · (none) 1
  visits with a script error: 0

2026-10-25
  no data
`;

/** `sql` without each count(DISTINCT …), its argument read to its closing parenthesis (nested ones included). */
function withoutDistinctCounts(sql) {
  let out = "";
  let i = 0;
  for (let at; (at = sql.indexOf("count(DISTINCT ", i)) >= 0; ) {
    out += sql.slice(i, at);
    let depth = 0;
    let j = at + "count".length;
    for (; j < sql.length; j++) {
      if (sql[j] === "(") depth++;
      else if (sql[j] === ")" && --depth === 0) break;
    }
    i = j + 1;
  }
  return out + sql.slice(i);
}

async function fixtures() {
  return Object.fromEntries(await Promise.all(NAMES.map(async (n) => [n, await readFile(join(FIXTURES, `${n}.json`), "utf8")])));
}

/** The report run in this process over `dataset`'s queries for 2026-10-23..25: its requests and its output. */
async function runReport(args, { env = ENV, dataset = "fitaf_microsite_analytics_prod" } = {}) {
  const { queries, report } = await import("../scripts/analytics.mjs");
  const answers = await fixtures();
  const sql = queries({ dataset, from: "2026-10-23", to: "2026-10-25" });
  assert.deepEqual(Object.keys(sql).sort(), [...NAMES].sort(), "control: the report's queries are the fixture's");
  const requests = [];
  const fetch = async (url, init = {}) => {
    const body = String(init.body);
    requests.push({ url: String(url), method: init.method, headers: Object.fromEntries(new Headers(init.headers)), body });
    const name = Object.keys(sql).find((k) => sql[k] === body);
    assert.ok(name, `a query of ${dataset}: ${body.slice(0, 120)}`);
    return new Response(answers[name], { status: 200, headers: { "content-type": "application/json" } });
  };
  let out = "";
  let err = "";
  const code = await report({ args, env, fetch, out: { write: (s) => (out += s) }, err: { write: (s) => (err += s) } });
  return { code, out, err, requests };
}

test("A11: the per-day report from a fixture SQL response, aggregates only", async () => {
  const { code, out, requests } = await runReport(["--from", "2026-10-23", "--to", "2026-10-25"]);
  assert.equal(code, 0);
  assert.equal(out, EXPECTED);
  assert.equal(requests.length, NAMES.length, "one request per query");
  for (const r of requests) {
    assert.equal(r.url, SQL_URL);
    assert.equal(r.method, "POST");
    assert.equal(r.headers.authorization, "Bearer test-token", "the token from the environment");
    assert.match(r.body, /\bFROM fitaf_microsite_analytics_prod\b/);
    assert.match(r.body, /timestamp >= toDateTime\('2026-10-23 00:00:00', 'America\/New_York'\)/, "from the first New York day's start");
    assert.match(r.body, /timestamp < toDateTime\('2026-10-26 00:00:00', 'America\/New_York'\)/, "to the last New York day's end");
    assert.match(r.body, /formatDateTime\(timestamp, '%Y-%m-%d', 'America\/New_York'\) AS day/, "grouped by the New York date");
    assert.doesNotMatch(r.body.replace(/'America\/New_York'/g, ""), /toDateTime\('[^']*'\)|formatDateTime\(timestamp, '[^']*'\)/, "no date read in UTC");
    assert.match(r.body, /\bGROUP BY\b/, "aggregated");
    // Since SPEC-analytics.md § 15 item 3 the visitor is blob12 (index1 for the rows written before it): every
    // count(DISTINCT …) removed, its argument with its own parentheses, none of the three is left.
    const outside = withoutDistinctCounts(r.body);
    assert.doesNotMatch(outside, /\b(blob2|blob12|index1)\b/, `s and v only inside count(DISTINCT …): ${r.body}`);
  }
  assert.doesNotMatch(out, /\b[0-9a-f]{16}\b/, "no visit or visitor id in the report");
});

test("A11: --env dev reads the development dataset", async () => {
  const { code, requests } = await runReport(["--from", "2026-10-23", "--to", "2026-10-25", "--env", "dev"], { dataset: "fitaf_microsite_analytics_dev" });
  assert.equal(code, 0);
  for (const r of requests) assert.match(r.body, /\bFROM fitaf_microsite_analytics_dev\b/);
});

test("A11: the program refuses, exit 2, before any request", async () => {
  const script = join(ROOT, "scripts", "analytics.mjs");
  const run = (args, env) =>
    spawnSync(process.execPath, [script, ...args], { encoding: "utf8", env: { PATH: process.env.PATH, ...env } });
  const ok = ["--from", "2026-10-23", "--to", "2026-10-25"];
  const cases = [
    ["no token", ok, { CLOUDFLARE_ACCOUNT_ID: "test-account" }, /CLOUDFLARE_ANALYTICS_TOKEN/],
    ["no account", ok, { CLOUDFLARE_ANALYTICS_TOKEN: "test-token" }, /CLOUDFLARE_ACCOUNT_ID/],
    ["a bad date", ["--from", "2026-10-32", "--to", "2026-10-25"], ENV, /--from/],
    ["--from after --to", ["--from", "2026-10-26", "--to", "2026-10-25"], ENV, /--from/],
    ["no --to", ["--from", "2026-10-23"], ENV, /--to/],
    ["an unknown argument", [...ok, "--rows"], ENV, /--rows/],
    ["an unknown --env", [...ok, "--env", "staging"], ENV, /--env/],
  ];
  for (const [label, args, env, message] of cases) {
    const r = run(args, env);
    assert.equal(r.status, 2, `${label}: exit 2 (${r.stderr})`);
    assert.match(r.stderr, message, `${label}: says why`);
    assert.equal(r.stdout, "", `${label}: no report`);
    assert.doesNotMatch(r.stderr, /test-token/, `${label}: the token never printed`);
  }
});

test("A11: npm run analytics is the report", async () => {
  const pkg = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
  assert.equal(pkg.scripts.analytics, "node scripts/analytics.mjs");
});
