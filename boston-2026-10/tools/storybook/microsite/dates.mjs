// The Date control's dates (SPEC-storybook-microsite.md § 2 item 4), from the committed data/picks/ and
// data/save.json's send_time_zone, with the site's own calendar helpers (src/worker/zoned-time.js, imported). Each names
// the week its page carries (`delivery`, or none): since SPEC-week-content § 7's ruling no build embeds a week, so a
// page's week is that week's CONTENT put into the built page (microsite/pages.mjs), as the Workers put the bucket's.
//
// - today: the real clock, no script added; the committed week whose window (S − 9 to S − 3) holds today, if any.
// - a week with picks: the latest week's Thursday, S − 3 (the last day of its window, SPEC-chefs-choice § 2), noon. ⚠ The
//   site's SPEC-week-content § 9: the latest week that is not UPDATING (its § 8 item 1, `"updating": true` and no list:
//   its page is the updating card, not a week with picks), a later updating week passed over.
// - no picks: the day after the last committed window, S − 2 (the store's Friday switch), noon; no week.
// - the fixture week (SPEC-meal-selection § 9): the latest week of test/fixtures/picks-v2/, its Thursday, S − 3, noon, its
//   content made from that directory (the content command's --picks; `picks`, the path from the site).
// - the two-menu fixture week (SPEC-every-menu-and-nutrition): the latest week of test/fixtures/picks-menus/, its Thursday,
//   S − 3, noon, its content made from that directory with the fixture's words (`words`, the site's module laying them
//   over data/messages.json; the content command's --messages).
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { FIXTURE_MENUS, FIXTURE_MENUS_WORDS, FIXTURE_PICKS } from "./layout.js";
import { FIXTURE_MENUS_DIR, FIXTURE_PICKS_DIR, PICKS_DIR, SAVE_PATH, ZONED_TIME } from "./paths.mjs";

/** A delivery Sunday S is open from S − 9 (a Friday) through S − 3 (a Thursday): SPEC-chefs-choice § 2. */
const WINDOW_START_DAYS = -9;
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

/** The latest of `sundays` (`dir`'s picks files) that is not an updating week (the site's SPEC-week-content § 8 item 1);
 *  null when there is none. */
async function latestWithPicks(dir, sundays) {
  for (const sunday of [...sundays].reverse()) {
    if (JSON.parse(await readFile(join(dir, `${sunday}.json`), "utf8")).updating !== true) return sunday;
  }
  return null;
}

/**
 * The three dates, in the Date control's order: { id, on, instant } each, `on` the build's --on (null when there is no
 * committed week), `instant` the fixed clock as an ISO string (null for today); `week` also names its `delivery`.
 */
export async function clockDates({ picksDir = PICKS_DIR, fixtureDir = FIXTURE_PICKS_DIR, menusDir = FIXTURE_MENUS_DIR, zone, now = Date.now() } = {}) {
  zone ??= JSON.parse(await readFile(SAVE_PATH, "utf8")).send_time_zone;
  const committed = await sundays(picksDir);
  const latest = committed.at(-1) ?? null;
  const today = zonedDate(now, zone);
  const open = committed.find((s) => addDays(s, WINDOW_START_DAYS) <= today && today <= addDays(s, WINDOW_END_DAYS)) ?? null;
  const listed = await latestWithPicks(picksDir, committed);
  const weekOn = listed && addDays(listed, WINDOW_END_DAYS);
  const noneOn = latest && addDays(addDays(latest, WINDOW_END_DAYS), DAY_AFTER);
  const fixture = (await sundays(fixtureDir)).at(-1) ?? null;
  const fixtureOn = fixture && addDays(fixture, WINDOW_END_DAYS);
  const menus = (await sundays(menusDir)).at(-1) ?? null;
  const menusOn = menus && addDays(menus, WINDOW_END_DAYS);
  const noon = (on) => (on ? new Date(zonedTimeToInstant(on, NOON_HOUR, zone)).toISOString() : null);
  return [
    { id: "today", on: today, instant: null, ...(open ? { delivery: open } : {}) },
    { id: "week", on: weekOn, instant: noon(weekOn), delivery: listed },
    { id: "none", on: noneOn, instant: noon(noneOn) },
    { id: "fixture", on: fixtureOn, instant: noon(fixtureOn), delivery: fixture, picks: fixture ? FIXTURE_PICKS : null },
    { id: "menus", on: menusOn, instant: noon(menusOn), delivery: menus, picks: menus ? FIXTURE_MENUS : null, words: menus ? FIXTURE_MENUS_WORDS : null },
  ];
}
