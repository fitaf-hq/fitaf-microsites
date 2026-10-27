// IX3 (SPEC-analytics.md § 15 items 3 and 5): the report's `visitors` over a fixture holding rows of both layouts (before
// § 15 the visitor in index1, blob12 never written; after it the visitor in blob12 and index1 each point's own random
// index) counts each visitor once. The fixture (test/fixtures/analytics/points-two-layouts.json, invented) holds the data
// points themselves, so the case reads the report's own `visitors` query (scripts/analytics.mjs `queries`), takes its two
// count(DISTINCT …) expressions, and evaluates them over the rows by ClickHouse's meaning of the forms they may use, written
// here: a column, and if(<column> = '<text>', <expression>, <expression>); any other form fails the case, naming it. The
// day is the fixture's (the query's grouping). Expected, by hand from the fixture: 2026-10-26 three visitors and four
// visits, 2026-10-27 one and one. Control: the query before § 15, count(DISTINCT index1), written here, counts the after
// rows' indexes as visitors (5 and 3), so the fixture tells the layouts apart. Then the report itself, its visitors query
// answered with those figures (every other query with no rows), prints and returns them. Nothing is requested; the SQL
// was never run against Cloudflare (§ 10's Found), and a blob never written is read as "" as the contract says.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { emptyAnswers, fixtureAnswers, parseText, runAt } from "./aj-checks.mjs";

const FIXTURE = join(ROOT, "test", "fixtures", "analytics", "points-two-layouts.json");
const FROM = "2026-10-26";
const TO = "2026-10-27";
/** By hand from the fixture: each day's visitors and visits. */
const WANT = { "2026-10-26": { visitors: 3, visits: 4 }, "2026-10-27": { visitors: 1, visits: 1 } };
/** The visitors expression before § 15 (§ 10 item 13), written here: the control. */
const BEFORE = "count(DISTINCT index1)";

/** The argument of `count(DISTINCT …) AS <name>` in `sql`, read to its closing parenthesis. */
function distinctArgument(sql, name) {
  const re = /count\(DISTINCT /g;
  for (let m; (m = re.exec(sql)); ) {
    let depth = 1;
    let j = m.index + m[0].length;
    for (; j < sql.length && depth; j++) depth += sql[j] === "(" ? 1 : sql[j] === ")" ? -1 : 0;
    if (new RegExp(`^\\s+AS ${name}\\b`).test(sql.slice(j))) return sql.slice(m.index + m[0].length, j - 1).trim();
  }
  throw new Error(`no count(DISTINCT …) AS ${name} in: ${sql}`);
}

/** An expression of the forms named above, as a function of a row; any other form throws, naming it. */
function evaluator(text) {
  const s = text.trim();
  if (/^(?:index1|blob\d+)$/.test(s)) return (row) => row[s] ?? "";
  const m = /^if\((index1|blob\d+) = '([^']*)', (.+)\)$/.exec(s);
  if (!m) throw new Error(`a form the case does not read: ${s}`);
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < m[3].length && cut < 0; i++) {
    if (m[3][i] === "(") depth++;
    else if (m[3][i] === ")") depth--;
    else if (m[3][i] === "," && depth === 0) cut = i;
  }
  if (cut < 0) throw new Error(`if() without two branches: ${s}`);
  const [then, otherwise] = [evaluator(m[3].slice(0, cut)), evaluator(m[3].slice(cut + 1))];
  return (row) => ((row[m[1]] ?? "") === m[2] ? then(row) : otherwise(row));
}

/** count(DISTINCT `expression`) over `rows`, per day. */
function countDistinct(rows, expression) {
  const value = evaluator(expression);
  const days = {};
  for (const row of rows) (days[row.day] ??= new Set()).add(value(row));
  return Object.fromEntries(Object.entries(days).map(([day, set]) => [day, set.size]));
}

test("IX3: the report's visitors over rows of both layouts counts each visitor once", async () => {
  const { rows } = JSON.parse(await readFile(FIXTURE, "utf8"));
  const { queries } = await import("../scripts/analytics.mjs");
  const sql = queries({ dataset: "fitaf_microsite_analytics_prod", from: FROM, to: TO }).visitors;
  const visitorsExpr = distinctArgument(sql, "visitors");
  const visitsExpr = distinctArgument(sql, "visits");
  assert.deepEqual(countDistinct(rows, BEFORE.slice("count(DISTINCT ".length, -1)), { "2026-10-26": 5, "2026-10-27": 3 }, "control: before § 15, each after row's index counted as a visitor");
  const visitors = countDistinct(rows, visitorsExpr);
  const visits = countDistinct(rows, visitsExpr);
  for (const [day, want] of Object.entries(WANT)) {
    assert.equal(visitors[day], want.visitors, `${day}: the report's visitors, count(DISTINCT ${visitorsExpr}), over the fixture`);
    assert.equal(visits[day], want.visits, `${day}: its visits, count(DISTINCT ${visitsExpr}) (control)`);
  }
  const answers = emptyAnswers(await fixtureAnswers());
  const data = Object.keys(WANT).map((day) => ({ day, visitors: String(visitors[day]), visits: String(visits[day]) }));
  answers.visitors = { ...answers.visitors, data, rows: data.length };
  const range = ["--from", FROM, "--to", TO];
  const text = await runAt(ROOT, range, answers);
  const json = await runAt(ROOT, [...range, "--json"], answers);
  assert.equal(text.code, 0, text.err);
  assert.equal(json.code, 0, json.err);
  const doc = JSON.parse(json.out);
  const read = parseText(text.out);
  for (const [day, want] of Object.entries(WANT)) {
    const d = doc.days.find((x) => x.day === day);
    assert.equal(d?.visitors, want.visitors, `${day}: the document's visitors`);
    assert.equal(read.days.find((x) => x.day === day)?.visitors, want.visitors, `${day}: the text's unique visitors`);
  }
});
