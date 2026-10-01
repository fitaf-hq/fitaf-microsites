// CC-3 (SPEC-chefs-choice § 2, § 4): the week's window. Delivery Sunday S is open to order from S − 9 (a Friday) through
// S − 3 (a Thursday). On S − 10 (Thursday) the page shows no picks for S; on S − 9 and S − 3 the file for S; on S − 2
// (Friday) not S — next week's if its file is there, never last week's. The page chooses IN THE BROWSER, on the date in
// the enterprise's zone, with the offer's own zoned-date helpers; the build embeds every file whose window has not ended
// on its --on date. This file's browser is in UTC, so near midnight its own date and New York's differ.
process.env.TZ = "UTC"; // the browser's zone. This file runs in its own process (node --test).

import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { isLive } from "../src/worker/offers.js";
import { formatter, pad, zonedDate, zonedParts } from "../src/worker/zoned-time.js";
import {
  builtPage,
  card,
  DAYS,
  FIXTURE,
  headingFor,
  midday,
  openedCard,
  openPlanPage,
  otherWeek,
  picksData,
  picksDir,
  S,
} from "./cc-harness.mjs";

const ZONE = "America/New_York";
const NEXT = "2026-10-11"; // the week after S: open S − 2 through S + 4

/** Which week the plan page offers at `now` (the heading's week), or null when the card is today's. */
function offeredAt(html, now) {
  const { state } = openedCard(html, { hash: "#lean-7", now });
  if (!state.list) {
    assert.equal(state.choose, true, "no picks: the card's Choose your meals is shown");
    assert.equal(state.own, false, "no picks: no second link");
    return null;
  }
  assert.equal(state.choose, false, "picks: the single Choose your meals gives way to two");
  for (const week of [S, NEXT]) if (state.heading === headingFor("7", week)) return week;
  assert.fail(`an unknown heading: ${state.heading}`);
}

async function pageWith(files, on) {
  const dir = await picksDir(files);
  try {
    return (await builtPage({ picks: dir, on })).html;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const BOTH = { [`${S}.json`]: FIXTURE, [`${NEXT}.json`]: otherWeek(NEXT) };

test("CC-3a: in the browser, by the date in New York: S − 10 none, S − 9 and S − 3 S, S − 2 next week's, never last week's", async () => {
  const html = await pageWith(BOTH, DAYS["S-10"]);
  assert.deepEqual(picksData(html)?.weeks.map((w) => w.delivery), [S, NEXT], "built on S − 10: both weeks embedded");
  const cases = [
    ["S − 10, Thursday", DAYS["S-10"], null],
    ["S − 9, Friday", DAYS["S-9"], S],
    ["S − 3, Thursday", DAYS["S-3"], S],
    ["S − 2, Friday", DAYS["S-2"], NEXT],
    ["S + 4, Thursday", "2026-10-08", NEXT],
    ["S + 5, Friday: no file for the week after", "2026-10-09", null],
  ];
  for (const [label, ymd, expected] of cases) {
    assert.equal(zonedDate(midday(ymd), ZONE), ymd, `control: midday UTC is ${ymd} in New York`);
    assert.equal(offeredAt(html, midday(ymd)), expected, label);
  }
  const alone = await pageWith({ [`${S}.json`]: FIXTURE }, DAYS["S-10"]);
  assert.equal(offeredAt(alone, midday(DAYS["S-2"])), null, "S − 2 with only S's file: none (never last week's)");
});

test("CC-3b: at the zone's midnight: 23:30 Thursday in New York (already Friday in the browser's UTC) is still S − 10", async () => {
  const html = await pageWith(BOTH, DAYS["S-10"]);
  const edges = [
    ["23:30 New York, S − 10", "2026-09-25T03:30:00Z", DAYS["S-10"], null],
    ["00:30 New York, S − 9", "2026-09-25T04:30:00Z", DAYS["S-9"], S],
    ["23:30 New York, S − 3", "2026-10-02T03:30:00Z", DAYS["S-3"], S],
    ["00:30 New York, S − 2", "2026-10-02T04:30:00Z", DAYS["S-2"], NEXT],
  ];
  for (const [label, iso, ymd, expected] of edges) {
    const instant = Date.parse(iso);
    assert.equal(zonedDate(instant, ZONE), ymd, `control: ${label} is ${ymd} in New York`);
    assert.equal(offeredAt(html, instant), expected, label);
  }
  assert.equal(new Date(Date.parse(edges[0][1])).getDate(), 25, "control: the browser's own date is already Friday");
});

test("CC-3c (control): a COPY of the page taking the browser's own date offers S at 23:30 Thursday in New York", async () => {
  const html = await pageWith(BOTH, DAYS["S-10"]);
  assert.ok(picksData(html), "the page carries the weeks");
  const site = "zonedDate(Date.now(), picks.zone)";
  assert.equal(html.split(site).length - 1, 1, "the page's date is the offer's zonedDate in the enterprise's zone");
  const browsersDate = html.split(site).join("new Date().toISOString().slice(0, 10)");
  assert.equal(offeredAt(browsersDate, Date.parse("2026-09-25T03:30:00Z")), S, "so the instant separates the two dates");
});

test("CC-3d: the helpers are the offer's own, their source inlined as the offer box inlines it; chefs-choice.js declares none", async () => {
  const html = await pageWith(BOTH, DAYS["S-10"]);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const cc = scripts.find((s) => s.includes('getElementById("picks-data")'));
  assert.ok(cc, "the page has the Chef's Choice script");
  for (const f of [formatter, zonedParts, pad, zonedDate, isLive]) {
    assert.ok(cc.includes(f.toString()), `the page carries ${f.name}'s own source text, as the module has it`);
  }
  assert.ok(cc.includes("const FORMATTERS = new Map();"), "zoned-time.js's cache, empty, as the offer box's");
  const source = await readFile(join(ROOT, "src", "chefs-choice", "chefs-choice.js"), "utf8");
  for (const name of ["formatter", "zonedParts", "pad", "zonedDate", "isLive", "FORMATTERS"]) {
    assert.doesNotMatch(source, new RegExp(`(function|const|let|var)\\s+${name}\\b`), `chefs-choice.js declares no ${name}`);
  }
});

test("CC-3e: the build embeds every file whose window has not ended on --on", async () => {
  const on = async (ymd) => picksData(await pageWith(BOTH, ymd))?.weeks.map((w) => w.delivery) ?? [];
  assert.deepEqual(await on("2026-09-01"), [S, NEXT], "well before: both (a page built early carries them)");
  assert.deepEqual(await on(DAYS["S-10"]), [S, NEXT], "Thursday S − 10: Friday's week is already on the page");
  assert.deepEqual(await on(DAYS["S-3"]), [S, NEXT], "S − 3: S's last day");
  assert.deepEqual(await on(DAYS["S-2"]), [NEXT], "S − 2: S's window has ended");
  assert.deepEqual(await on("2026-10-09"), [], "S + 5: every window has ended, and the page carries none");
  const html = await pageWith(BOTH, DAYS["S-2"]);
  const page = openPlanPage(html, { hash: "#lean-7", now: midday(DAYS["S-3"]) });
  assert.equal(card(page).list, false, "a page built on S − 2, opened on S − 3 (a clock behind): S is not on it");
});
