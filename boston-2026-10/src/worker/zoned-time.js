// Calendar arithmetic in a named time zone, with Intl only. `Temporal` exists in neither the Workers
// runtime (compatibility date 2026-09-26) nor Node 22, and Intl.DateTimeFormat with an IANA zone runs
// in both, so this one module serves the Worker and the tests. build.mjs inlines zonedDate into the dev page
// with the helpers it calls (zonedParts, formatter, pad; SPEC-rung4 § 2a), so they are exported too.
const FORMATTERS = new Map();
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

export function formatter(zone) {
  if (!FORMATTERS.has(zone)) {
    FORMATTERS.set(
      zone,
      new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    );
  }
  return FORMATTERS.get(zone);
}

/** The wall-clock fields of `instant` (ms since the epoch) in `zone`. */
export function zonedParts(instant, zone) {
  const parts = {};
  for (const p of formatter(zone).formatToParts(new Date(instant))) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  return parts;
}

export const pad = (n, w = 2) => String(n).padStart(w, "0");

/** The calendar date of `instant` in `zone`, as "YYYY-MM-DD". */
export function zonedDate(instant, zone) {
  const p = zonedParts(instant, zone);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

/** "YYYY-MM-DD" plus `days` calendar days (no zone: a date is not an instant). */
export function addDays(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + days * MS_PER_DAY);
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Whole calendar days from `a` to `b` ("YYYY-MM-DD" each): positive when `b` is later. Numeric, so a
 *  date past year 9999 cannot sort wrongly as a string would. */
export function daysBetween(a, b) {
  const ms = (ymd) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(b) - ms(a)) / MS_PER_DAY);
}

/** How far `zone`'s wall clock is ahead of UTC at `instant`, in ms (negative west of Greenwich). */
function offsetMs(instant, zone) {
  const p = zonedParts(instant, zone);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wall - Math.floor(instant / 1000) * 1000;
}

/** The instant at which `zone`'s wall clock reads `hour`:00 on `ymd`. Two passes settle a DST change. */
export function zonedTimeToInstant(ymd, hour, zone) {
  const [y, m, d] = ymd.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d, hour);
  const first = wall - offsetMs(wall, zone);
  return wall - offsetMs(first, zone);
}

/** `hour`:00 in `zone` on the calendar day after `instant`'s date there (SPEC-rung4 § 3). */
export function nextDayAt(instant, { zone, hour }) {
  return zonedTimeToInstant(addDays(zonedDate(instant, zone), 1), hour, zone);
}

export const HOURS = MS_PER_HOUR;
export const DAYS = MS_PER_DAY;
