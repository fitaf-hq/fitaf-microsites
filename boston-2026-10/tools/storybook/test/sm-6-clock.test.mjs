// SM-6 (SPEC-storybook-microsite.md § 5, § 2 item 4): the clock. *A week with picks* resolves to the latest committed
// week's Thursday (S − 3), noon in data/save.json's send_time_zone, and *no picks* to the day after the last committed
// window (S − 2), from the committed data/picks/; *today* adds no script, and the other two add exactly one, their own.
// The expected dates are worked out here from the file names, by calendar arithmetic and Intl, not by the tool's code.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { CLOCK_ATTRIBUTE, clockScript } from "../microsite/clock.mjs";
import { clockDates } from "../microsite/dates.mjs";
import { BUILDS, pageUrl, PAGES_ROUTE } from "../microsite/layout.js";
import { buildPages } from "../microsite/pages.mjs";
import { readJson, SITE } from "./paths.mjs";

const PAGES_TIMEOUT_MS = 600_000;
const MS_PER_DAY = 86_400_000;
const THURSDAY = 4;
const FRIDAY = 5;
const NOON = "12:00";
const A_DATE_INSIDE_NO_WINDOW = Date.UTC(2026, 8, 1, 15);
const SUNDAY_FILE = /^(\d{4}-\d{2}-\d{2})\.json$/;
const CLOCK = new RegExp(`<script ${CLOCK_ATTRIBUTE}="([^"]+)">`, "g");

const zone = async () => (await readJson(join(SITE, "data", "save.json"))).send_time_zone;
const plusDays = (ymd, days) => new Date(Date.parse(`${ymd}T00:00:00Z`) + days * MS_PER_DAY).toISOString().slice(0, 10);
const weekday = (ymd) => new Date(`${ymd}T00:00:00Z`).getUTCDay();
/** An instant's wall clock in `zone`, as "YYYY-MM-DD HH:MM". */
function wallClock(instant, zoneName) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: zoneName, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(instant))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}
const byId = (dates) => Object.fromEntries(dates.map((d) => [d.id, d]));

test("SM-6: a week with picks is the latest committed week's Thursday at noon; no picks the day after its window", async () => {
  const sundays = (await readdir(join(SITE, "data", "picks"))).map((f) => SUNDAY_FILE.exec(f)?.[1]).filter(Boolean).sort();
  assert.ok(sundays.length > 0, "fixture control: a committed picks file");
  const latest = sundays.at(-1);
  const z = await zone();
  const dates = byId(await clockDates({ now: A_DATE_INSIDE_NO_WINDOW }));
  assert.equal(dates.week.on, plusDays(latest, -3));
  assert.equal(weekday(dates.week.on), THURSDAY, "S − 3 is a Thursday");
  assert.equal(wallClock(Date.parse(dates.week.instant), z), `${plusDays(latest, -3)} ${NOON}`);
  assert.equal(dates.week.delivery, latest);
  assert.equal(dates.none.on, plusDays(latest, -2));
  assert.equal(weekday(dates.none.on), FRIDAY, "the day after the window is the store's Friday switch");
  assert.equal(wallClock(Date.parse(dates.none.instant), z), `${plusDays(latest, -2)} ${NOON}`);
  assert.equal(dates.today.instant, null, "today is the real clock");
  assert.equal(dates.today.on, wallClock(A_DATE_INSIDE_NO_WINDOW, z).slice(0, 10), "today is the date in the zone");
});

test("SM-6 (SPEC-meal-selection § 9): the fixture week is the version-2 fixture's Thursday at noon, built from its directory", async () => {
  const sundays = (await readdir(join(SITE, "test", "fixtures", "picks-v2"))).map((f) => SUNDAY_FILE.exec(f)?.[1]).filter(Boolean).sort();
  assert.ok(sundays.length > 0, "fixture control: the version-2 fixture week");
  const z = await zone();
  const { fixture } = byId(await clockDates({ now: A_DATE_INSIDE_NO_WINDOW }));
  assert.equal(fixture.on, plusDays(sundays.at(-1), -3));
  assert.equal(wallClock(Date.parse(fixture.instant), z), `${plusDays(sundays.at(-1), -3)} ${NOON}`);
  assert.deepEqual([fixture.delivery, fixture.picks], [sundays.at(-1), "test/fixtures/picks-v2"]);
});

test("SM-6: the latest of several weeks; without a picks file, no dated choice", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "fitaf-storybook-sm-6-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const picks = join(dir, "picks");
  await mkdir(picks);
  for (const name of ["2026-10-11.json", "2026-10-04.json", "README.md"]) await writeFile(join(picks, name), "{}");
  const several = byId(await clockDates({ picksDir: picks, zone: await zone(), now: A_DATE_INSIDE_NO_WINDOW }));
  assert.deepEqual([several.week.on, several.week.delivery, several.none.on], ["2026-10-08", "2026-10-11", "2026-10-09"]);
  for (const picksDir of [join(dir, "empty"), join(dir, "absent")]) {
    if (picksDir.endsWith("empty")) await mkdir(picksDir);
    const none = byId(await clockDates({ picksDir, zone: await zone(), now: A_DATE_INSIDE_NO_WINDOW }));
    assert.deepEqual([none.week.on, none.week.instant, none.none.on], [null, null, null], picksDir);
  }
});

test("SM-6: today adds no script; a week with picks, no picks and the fixture week each add one, their own date's", { timeout: PAGES_TIMEOUT_MS }, async (t) => {
  const out = await mkdtemp(join(tmpdir(), "fitaf-storybook-sm-6-pages-"));
  t.after(() => rm(out, { recursive: true, force: true }));
  const manifest = await buildPages({ outDir: out });
  const dates = byId(manifest.dates);
  for (const build of BUILDS.map((b) => b.id)) {
    for (const id of ["today", "week", "none", "fixture"]) {
      const html = await readFile(join(out, pageUrl(build, id).slice(PAGES_ROUTE.length + 1)), "utf8");
      const clocks = [...html.matchAll(CLOCK)].map((m) => m[1]);
      assert.deepEqual(clocks, dates[id].instant ? [dates[id].instant] : [], `${build}/${id}`);
    }
  }
});

test("SM-6: the clock script starts the frame's Date at its instant; a date given to Date is left alone", () => {
  const instant = "2026-10-01T16:00:00.000Z";
  const script = /<script [^>]*>([\s\S]*)<\/script>/.exec(clockScript(instant))[1];
  const sandbox = { Date, Reflect, Proxy };
  sandbox.window = sandbox;
  runInNewContext(`${script}; result = [Date.now(), new Date().toISOString(), new Date(0).toISOString(), typeof Date(), new Date() instanceof Date];`, sandbox);
  const [now, made, given, called, isDate] = sandbox.result;
  const SLACK_MS = 5_000;
  assert.ok(now >= Date.parse(instant) && now - Date.parse(instant) < SLACK_MS, `Date.now() ${new Date(now).toISOString()}`);
  assert.equal(made.slice(0, 16), instant.slice(0, 16));
  assert.equal(given, "1970-01-01T00:00:00.000Z");
  assert.equal(called, "string");
  assert.equal(isDate, true);
});
