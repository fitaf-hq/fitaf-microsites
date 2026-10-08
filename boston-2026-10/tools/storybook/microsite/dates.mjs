// The Date control's three dates (SPEC-storybook-microsite.md § 2 item 4), from the committed data/picks/ and
// data/save.json's send_time_zone, with the site's own calendar helpers (src/worker/zoned-time.js, imported):
//
// - today: the real clock; the page is built --on today's date in the zone, and no script is added.
// - a week with picks: the latest week's Thursday, S − 3 (the last day of its window, SPEC-chefs-choice § 2), noon.
// - no picks: the day after the last committed window, S − 2 (the store's Friday switch), noon.
// - the fixture week (SPEC-meal-selection § 9): the latest week of test/fixtures/picks-v2/, its Thursday, S − 3, noon, built
//   with that directory as the build's --picks (`picks`, the path from the site).
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { FIXTURE_PICKS } from "./layout.js";
import { FIXTURE_PICKS_DIR, PICKS_DIR, SAVE_PATH, ZONED_TIME } from "./paths.mjs";

/** A delivery Sunday S is open from S − 9 (a Friday) through S − 3 (a Thursday): SPEC-chefs-choice § 2. */
const WINDOW_END_DAYS = -3;
const DAY_AFTER = 1;
/** The fixed clock's time of day, in the zone. */
const NOON_HOUR = 12;
/** A picks file, named by its delivery Sunday (the build checks the rest). */
const PICKS_FILE = /^(\d{4}-\d{2}-\d{2})\.json$/;

const { addDays, zonedDate, zonedTimeToInstant } = await import(pathToFileURL(ZONED_TIME).href);

/** The delivery Sundays of `dir`'s picks files, oldest first; none when there is no directory. */
async function sundays(dir) {
  if (!existsSync(dir)) return [];
  return (await readdir(dir))
    .map((name) => PICKS_FILE.exec(name)?.[1])
    .filter(Boolean)
    .sort();
}

/**
 * The three dates, in the Date control's order: { id, on, instant } each, `on` the build's --on (null when there is no
 * committed week), `instant` the fixed clock as an ISO string (null for today); `week` also names its `delivery`.
 */
export async function clockDates({ picksDir = PICKS_DIR, fixtureDir = FIXTURE_PICKS_DIR, zone, now = Date.now() } = {}) {
  zone ??= JSON.parse(await readFile(SAVE_PATH, "utf8")).send_time_zone;
  const latest = (await sundays(picksDir)).at(-1) ?? null;
  const weekOn = latest && addDays(latest, WINDOW_END_DAYS);
  const noneOn = weekOn && addDays(weekOn, DAY_AFTER);
  const fixture = (await sundays(fixtureDir)).at(-1) ?? null;
  const fixtureOn = fixture && addDays(fixture, WINDOW_END_DAYS);
  const noon = (on) => (on ? new Date(zonedTimeToInstant(on, NOON_HOUR, zone)).toISOString() : null);
  return [
    { id: "today", on: zonedDate(now, zone), instant: null },
    { id: "week", on: weekOn, instant: noon(weekOn), delivery: latest },
    { id: "none", on: noneOn, instant: noon(noneOn) },
    { id: "fixture", on: fixtureOn, instant: noon(fixtureOn), delivery: fixture, picks: fixture ? FIXTURE_PICKS : null },
  ];
}
