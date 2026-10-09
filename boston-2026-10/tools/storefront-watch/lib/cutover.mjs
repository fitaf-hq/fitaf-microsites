// SPEC-storefront-watch § 12 item 2, when F6 runs: on every scheduled run from Friday 00:00 in New York
// (data/save.json's send_time_zone, which bin/watch.mjs reads) until a switch has been seen that Friday, and on a
// dispatch. On any other day it does not run, and the run requests what it requested before F6 (W24). A seen switch is
// recorded by its issue (lib/menu-issue.mjs); `seen(friday)` looks for it, and is asked only on a Friday.

const DAY_MS = 86_400_000;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const FRIDAY = WEEKDAYS.indexOf("Friday");

/**
 * The calendar day `date` falls on in `timeZone`: its weekday, its date, whether it is a Friday, and the Friday of its
 * week (that day, or the latest Friday before it: what a dispatch's menu issue is filed under).
 */
export function cutoverDay(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const local = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  const back = (WEEKDAYS.indexOf(parts.weekday) - FRIDAY + 7) % 7;
  const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
  return { timeZone, weekday: parts.weekday, today: isoDay(local), isFriday: parts.weekday === "Friday", friday: isoDay(local - back * DAY_MS) };
}

/**
 * Whether F6 runs, and if not, why. `seen`: (friday) -> the number of that Friday's "menu switched" issue, or null; or
 * null itself when no record can be read (no --issue). A record that cannot be read runs F6: a missed switch costs more
 * than a second issue.
 */
export async function cutoverSchedule({ full, day, seen }) {
  if (full) return { due: true, record: "a dispatch: F6 runs whatever the day" };
  if (!day.isFriday) {
    return { due: false, note: `not a Friday in ${day.timeZone} (${day.weekday} ${day.today}): F6 runs on Fridays until a switch is seen, and on a dispatch` };
  }
  if (!seen) return { due: true, record: "no issue record read (no --issue)" };
  let number;
  try {
    number = await seen(day.friday);
  } catch (err) {
    return { due: true, record: `the issue record could not be read (${err.message}); F6 runs` };
  }
  if (number) return { due: false, note: `a switch was already seen this Friday (${day.friday}, ${day.timeZone}): issue #${number}` };
  return { due: true, record: `no switch recorded for Friday ${day.friday} yet` };
}
