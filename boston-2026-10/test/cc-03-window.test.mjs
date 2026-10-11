// CC-3 (SPEC-chefs-choice § 2, § 4): the week's window. Delivery Sunday S is open to order from S − 9 (a Friday) through
// S − 3 (a Thursday).
// ⚠ SUPERSEDED by SPEC-week-content § 2.2 (2026-10-11): the page shows the week its #picks-data holds and no date decides
// it, so the browser no longer chooses by the date in New York; and by its § 7's ruling, no build embeds a week (the
// build's --on is gone), so the window no longer decides what a build carries either. CC-3a–CC-3d said the page offered S
// only from S − 9 through S − 3, by the offer's own zoned-date helpers inlined; they now say the opposite: one week on the
// page is offered at every one of those dates and instants, two are offered at none (WC-7), and the Chef's Choice script
// carries no date helper and reads no clock. CC-3e said the build embeds every file whose window has not ended on --on;
// it now says what the window still is: each week's valid_from and valid_to in the content, which the page does not read.
// A page with weeks is the built page with the CONTENT of a picks directory put in (cc-harness builtPage). This file's
// browser is in UTC, as before.
process.env.TZ = "UTC"; // the browser's zone. This file runs in its own process (node --test).

import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { formatter, pad, zonedDate, zonedParts } from "../src/worker/zoned-time.js";
import { isLive } from "../src/worker/offers.js";
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

const NEXT = "2026-10-11"; // the week after S: its window S − 2 through S + 4

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

async function pageWith(files) {
  const dir = await picksDir(files);
  try {
    return (await builtPage({ picks: dir })).html;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const BOTH = { [`${S}.json`]: FIXTURE, [`${NEXT}.json`]: otherWeek(NEXT) };
/** The dates the window once decided at: every one now offers the page's one week. */
const DATES = [
  ["S − 10, Thursday", DAYS["S-10"]],
  ["S − 9, Friday", DAYS["S-9"]],
  ["S − 3, Thursday", DAYS["S-3"]],
  ["S − 2, Friday", DAYS["S-2"]],
  ["S + 5, Friday", "2026-10-09"],
];

test("CC-3a (SPEC-week-content § 2.2): one week on the page is offered at every date in New York; two are offered at none", async () => {
  const one = await pageWith({ [`${S}.json`]: FIXTURE });
  const both = await pageWith(BOTH);
  assert.deepEqual(picksData(both)?.weeks.map((w) => w.delivery), [S, NEXT], "control: both weeks on the page");
  for (const [label, ymd] of DATES) {
    assert.equal(zonedDate(midday(ymd), "America/New_York"), ymd, `control: midday UTC is ${ymd} in New York`);
    assert.equal(offeredAt(one, midday(ymd)), S, `${label}: the one week`);
    assert.equal(offeredAt(both, midday(ymd)), null, `${label}: two weeks, none (quietly)`);
  }
});

test("CC-3b (SPEC-week-content § 2.2): the zone's midnight decides nothing: either side of it, the page's one week", async () => {
  const html = await pageWith({ [`${NEXT}.json`]: otherWeek(NEXT) });
  for (const iso of ["2026-09-25T03:30:00Z", "2026-09-25T04:30:00Z", "2026-10-02T03:30:00Z", "2026-10-02T04:30:00Z"]) {
    assert.equal(offeredAt(html, Date.parse(iso)), NEXT, iso);
  }
});

test("CC-3c/d (SPEC-week-content § 2.2): the Chef's Choice script carries no zoned-date helper and reads no clock", async () => {
  const html = await pageWith(BOTH);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const cc = scripts.find((s) => s.includes('getElementById("picks-data")'));
  assert.ok(cc, "the page has the Chef's Choice script");
  for (const f of [formatter, zonedParts, pad, zonedDate, isLive]) {
    assert.ok(!cc.includes(f.toString()), `the script does not carry ${f.name}`);
  }
  assert.ok(!cc.includes("FORMATTERS"), "nor zoned-time.js's cache");
  const source = await readFile(join(ROOT, "src", "chefs-choice", "chefs-choice.js"), "utf8");
  assert.doesNotMatch(source.replace(/^\s*\/\/.*$/gm, ""), /\bDate\b|zonedDate|isLive|valid_from|valid_to/, "chefs-choice.js reads no clock and no window");
});

test("CC-3e (SPEC-week-content § 7): the window is each week's valid_from and valid_to in the content, S − 9 and S − 3", async () => {
  const data = picksData(await pageWith(BOTH));
  assert.deepEqual(
    data.weeks.map((w) => [w.delivery, w.valid_from, w.valid_to]),
    [
      [S, DAYS["S-9"], DAYS["S-3"]],
      [NEXT, "2026-10-02", "2026-10-08"],
    ],
  );
  const one = await pageWith({ [`${S}.json`]: FIXTURE });
  const page = openPlanPage(one, { hash: "#lean-7", now: midday("2026-10-09") });
  assert.equal(card(page).list, true, "after valid_to (S + 5), the page's one week still (no date decides)");
});
