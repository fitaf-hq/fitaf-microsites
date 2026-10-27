// The checks of IX1, IX2 and IX4 (SPEC-analytics.md § 15: no data point thinned, each its own index; and a plan shown at
// load read after the page's first draw), as functions over a PACKAGE (`root`: this one, or a mirror of it), each
// returning one line per thing the package gets wrong ([] when it is right). The cases run them on this package; the
// mutants (ix-mutants.test.mjs) run THE SAME checks on a mirror carrying one mutation each. Not a test file itself.
// Every expectation is the contract's, written here, never read back from the code under test: the visitor `v` from § 2
// and § 10 item 8 (the first 16 hex digits of SHA-256 over the day's salt, the IP, the user agent and the host, joined by
// a newline), the salt as the Worker wrote it to SALTS (a-harness's wrapper records the write); the plan of an answer set
// from data/plans.json.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { ROOT } from "../build.mjs";
import { builtPage, openVisit, startBeacon, TEST_IP, TEST_UA, TEST_UA_TOKEN, VALID, visitorOf } from "./a-harness.mjs";
import { needlesIn } from "./a-checks.mjs";
import { compared, show } from "./af-checks.mjs";

/** § 15 item 1: an index, 16 hex digits; § 2: a visitor `v`, the same. */
export const HEX16 = /^[0-9a-f]{16}$/;
/** § 15 item 2: blobs 1–11 keep their places and `v` is appended, the twelfth. */
export const BLOB_COUNT = 12;
/** The host a-harness's post sends to. */
const HOST = "eatfitaf.com";
/** A day of the Boston events, its afternoon in New York. */
const CLOCK = Date.parse("2026-10-26T15:00:00-04:00");
/** The two Workers, by entry: production's and the development Worker. */
export const ENTRIES = ["site", "index"];

/** § 2 and § 10 item 8, written from the contract: a visitor's `v` for a day's salt. */
export const visitorFor = (salt, ip = TEST_IP, ua = TEST_UA, host = HOST) =>
  createHash("sha256").update([salt, ip, ua, host].join("\n")).digest("hex").slice(0, 16);

/** A visit's seven events (a-harness VALID, one of each of § 3's events, § 14's save among them), posted to the Worker
 *  `entry` of the package at `root` from one IP and user agent at one instant. Returns the log: its points and the salt's
 *  writes. */
async function sevenPoints(root, entry) {
  const site = await startBeacon({ root, entry });
  try {
    await site.log();
    for (const body of Object.values(VALID)) await site.post(body, { ip: TEST_IP, ua: TEST_UA, clock: CLOCK });
    return await site.log();
  } finally {
    await site.dispose();
  }
}

/**
 * IX1 (§ 15 items 1, 2 and 5): through either Worker, a visit's seven events give seven data points with seven different
 * indexes, each 16 hex digits and none of them the visitor; twelve blobs each, `blob12` the visit's `v` on every one, the
 * `v` § 2 makes from the day's salt (the one the Worker wrote) and the request's IP, user agent and host.
 */
export async function indexProblems(root = ROOT) {
  const problems = [];
  const n = Object.keys(VALID).length;
  for (const entry of ENTRIES) {
    const log = await sevenPoints(root, entry);
    if (log.points.length !== n) problems.push(`${entry}: ${log.points.length} data points for ${n} events (control)`);
    if (log.puts.length !== 1) {
      problems.push(`${entry}: ${log.puts.length} salt writes, not the day's one (control)`);
      continue;
    }
    const v = visitorFor(log.puts[0].value);
    const indexes = log.points.map((p) => (p.indexes ?? []).join(","));
    if (new Set(indexes).size !== log.points.length) problems.push(`${entry}: ${log.points.length} data points share ${new Set(indexes).size} index(es): ${indexes.join(" ")}`);
    for (const [i, point] of log.points.entries()) {
      const at = `${entry}: data point ${i + 1} (${point.blobs?.[0]})`;
      if (point.indexes?.length !== 1 || !HEX16.test(String(point.indexes[0]))) problems.push(`${at}: indexes ${JSON.stringify(point.indexes)}, not one of 16 hex digits`);
      if (point.indexes?.[0] === v) problems.push(`${at}: its index is the visitor's v`);
      if (point.blobs?.length !== BLOB_COUNT) problems.push(`${at}: ${point.blobs?.length} blobs, not ${BLOB_COUNT}`);
      if (visitorOf(point) !== v) problems.push(`${at}: blob12 ${JSON.stringify(visitorOf(point))}, not the visit's v ${v}`);
    }
  }
  return problems;
}

/**
 * IX2 (§ 15 item 2: "A4 reads the new blob too"): A4's search (a-checks needlesIn, the one ipUaProblems runs) reads every
 * field a point holds, so over the points a visit writes from a known IP and user agent it finds neither; the fields it
 * read hold blob12 and the index (control: twelve blobs and one index on every point); and it finds the IP and the user
 * agent's token planted in a written point's blob12, and in its index (so a point carrying either in those fields fails A4).
 */
export async function searchProblems(root = ROOT) {
  const problems = [];
  const { points } = await sevenPoints(root, "site");
  if (!points.length) return ["no data point written (control)"];
  for (const [i, point] of points.entries()) {
    if (point.blobs?.length !== BLOB_COUNT || point.indexes?.length !== 1) {
      problems.push(`data point ${i + 1}: ${point.blobs?.length} blobs and ${point.indexes?.length} index(es), not ${BLOB_COUNT} and 1 (control: the fields A4 reads)`);
    }
    for (const [needle, field] of needlesIn(point)) problems.push(`data point ${i + 1} carries ${JSON.stringify(needle)}: ${JSON.stringify(field)}`);
  }
  const [first] = points;
  const blobs = [...(first.blobs ?? [])];
  while (blobs.length < BLOB_COUNT) blobs.push("");
  const planted = [
    ["the IP in blob12", { ...first, blobs: [...blobs.slice(0, BLOB_COUNT - 1), TEST_IP] }],
    ["the user agent in blob12", { ...first, blobs: [...blobs.slice(0, BLOB_COUNT - 1), TEST_UA] }],
    ["the IP in the index", { ...first, indexes: [TEST_IP] }],
    ["the user agent's token in the index", { ...first, indexes: [TEST_UA_TOKEN] }],
  ];
  for (const [label, point] of planted) if (!needlesIn(point).length) problems.push(`A4's search misses ${label}`);
  return problems;
}

/** The plan an answer set goes through (data/plans.json's `selection`) on a goal: its mpid, read from the data. */
async function mpidOf(root, goal, row) {
  const plans = JSON.parse(await readFile(join(root, "data", "plans.json"), "utf8"));
  const found = plans.selection.find((r) => Object.entries(row).every(([k, v]) => r[k] === v));
  return plans.individual.find((p) => p.id === goal)?.counts.find((c) => c.meals_per_week === found?.plan)?.mpid;
}

/** The fragment IX4 opens: Lean, lunch and dinner, every day, no breakfast, the whole answer set (§ 15 item 5). */
export const WHOLE_SET = "#lean-and-7d";
/** A line of app.js, so the case can say where the page's analytics script is (before it, as on the built page). */
const APP_JS_LINE = "function serialise(s)";

/**
 * IX4 (§ 15 items 4 and 5): the page opened at #lean-and-7d (the whole answer set) sends `result` (and-7d, its mpid) with
 * no tap: in the stub where the analytics script runs before app.js as on the built page, and its timer runs while the
 * parser is paused between them (a-harness `yieldBetweenScripts`); and, as the control of `shown`, in the stub where the
 * timer runs after every script. Then the plan shown, a tap elsewhere that changes nothing (the card itself, and the
 * answer already pressed) sends no second `result`. On both targets. Controls: the built page's analytics script is before
 * app.js; the page shows the plan (the card, its link's mpid).
 */
export async function loadResultProblems(root = ROOT) {
  const mpid = await mpidOf(root, "lean", { lunch_dinner: "and", weekends: true, breakfast: false });
  const want = [{ event: "result", key: "and-7d", mpid }];
  const problems = [];
  if (!mpid) problems.push("control: data/plans.json has no plan for and-7d on Lean");
  for (const target of ["prod", "dev"]) {
    const html = await builtPage({ root, target });
    const analytics = html.indexOf("navigator.sendBeacon(");
    if (!(analytics >= 0 && analytics < html.indexOf(APP_JS_LINE))) problems.push(`${target}: control: the analytics script is not before app.js`);
    for (const [mode, yieldBetweenScripts] of [["the timer run between the scripts", true], ["the timer run after every script", false]]) {
      const at = `${target}, ${WHOLE_SET}, ${mode}`;
      const visit = openVisit(html, { hash: WHOLE_SET, clock: 400, yieldBetweenScripts });
      for (const error of visit.errors) problems.push(`${at}: a script threw: ${error.message}`);
      if (visit.el("result").hidden || !visit.el("result-cta").getAttribute("href")?.includes(`?mpid=${mpid}`)) problems.push(`${at}: control: the page does not show the plan`);
      const results = () => visit.beacons.filter((b) => b.body.event === "result").map((b) => compared(b.body));
      if (!isDeepStrictEqual(results(), want)) problems.push(`${at}: sent ${results().map(show).join(" · ") || "no result"} with no tap, not ${want.map(show).join("")}`);
      visit.press(visit.el("result"));
      visit.press(visit.document.querySelector('[data-q="lunch_dinner"][data-a="and"]'));
      if (!visit.beacons.some((b) => b.body.event === "answer" && b.body.answer === "and")) problems.push(`${at}: control: the tap on the pressed answer reached no reading`);
      if (results().length > 1) problems.push(`${at}: after a tap that changes nothing, ${results().length} results: ${results().map(show).join(" · ")}`);
    }
  }
  return problems;
}
