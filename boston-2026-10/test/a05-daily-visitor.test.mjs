// A5 (SPEC-analytics.md § 2, § 7): the same IP and user agent, one day then the next: the same `v` within a day, a
// different `v` the next. `v` is the data point's index. The day is America/New_York's (§ 2 as amended 2026-10-13, the
// orchestrator's ruling: a UTC day ends at 20:00 in Boston, so an evening visit would count twice): 19:59 and 20:01 New
// York time are one visitor; 23:59 and 00:01 the next day are two. Across both of 2026–27's DST changes, the New York
// day is 25 and 23 hours long, which a fixed offset would get wrong. Every instant is written here with its own
// offset, from the calendar (EDT, -04:00, until 2026-11-01 02:00 and from 2027-03-14 02:00; EST, -05:00, between).
// Controls: a different IP on the same day is a different `v` (so "the same" is not a constant); the salt is kept
// through the day. And § 2's race, measured within one isolate: twenty first events of a day at once make one salt and
// one `v`.
import test from "node:test";
import assert from "node:assert/strict";
import { startBeacon, TEST_IP, utc, VALID } from "./a-harness.mjs";

const at = (iso) => Date.parse(iso);

const vOf = async (site, options) => {
  await site.post(VALID.open, options);
  const { points } = await site.log();
  assert.equal(points.length, 1, "control: one data point");
  return points[0].indexes[0];
};

/** The v of the same visitor at each instant, in order. */
async function vsAt(site, instants, options = {}) {
  const out = [];
  for (const clock of instants) out.push(await vOf(site, { ...options, clock: at(clock) }));
  return out;
}

test("A5: the same visitor at 19:59 and 20:01 New York time is one v; at 23:59 and 00:01 the next day, two", async () => {
  const site = await startBeacon();
  try {
    await site.log();
    const [evening, after8, lastMinute, nextDay] = await vsAt(site, [
      "2026-10-23T19:59:00-04:00", // 23:59 UTC: the UTC day ends between these two
      "2026-10-23T20:01:00-04:00", // 00:01 UTC on the 24th
      "2026-10-23T23:59:00-04:00",
      "2026-10-24T00:01:00-04:00",
    ]);
    assert.match(evening, /^[0-9a-f]{16}$/);
    assert.equal(after8, evening, "19:59 and 20:01 in New York: the same v");
    assert.equal(lastMinute, evening, "23:59 in New York: still the same day");
    assert.notEqual(nextDay, evening, "00:01 the next day in New York: a different v");
    const [other] = await vsAt(site, ["2026-10-23T12:00:00-04:00"], { ip: "198.51.100.23" });
    assert.notEqual(other, evening, "control: another IP the same day is another v");
    const [back] = await vsAt(site, ["2026-10-23T18:00:00-04:00"], { ip: TEST_IP });
    assert.equal(back, evening, "control: the day's salt is kept through the day");
  } finally {
    await site.dispose();
  }
});

test("A5: across the DST changes, the New York day is 25 hours and 23 hours, by the platform's zone", async () => {
  const site = await startBeacon();
  try {
    await site.log();
    // 2026-11-01, 25 hours: 00:30 EDT and 23:30 EST are one day (a fixed -04:00 would put 23:30 EST on the 2nd).
    const [fallFirst, fallLast, fallNext] = await vsAt(site, ["2026-11-01T00:30:00-04:00", "2026-11-01T23:30:00-05:00", "2026-11-02T00:30:00-05:00"]);
    assert.equal(fallLast, fallFirst, "2026-11-01 00:30 EDT and 23:30 EST: the same day");
    assert.notEqual(fallNext, fallFirst, "2026-11-02 00:30 EST: the next day");
    // 2027-03-14, 23 hours: 23:30 EDT and the 15th's 00:30 EDT are two days (a fixed -05:00 would put both on the 14th).
    const [springFirst, springLast, springNext] = await vsAt(site, ["2027-03-14T00:30:00-05:00", "2027-03-14T23:30:00-04:00", "2027-03-15T00:30:00-04:00"]);
    assert.equal(springLast, springFirst, "2027-03-14 00:30 EST and 23:30 EDT: the same day");
    assert.notEqual(springNext, springFirst, "2027-03-15 00:30 EDT: the next day");
  } finally {
    await site.dispose();
  }
});

test("A5: twenty first events of a day at once, in one isolate, make one salt and one v (§ 2's race, measured)", async () => {
  const site = await startBeacon();
  try {
    await site.log();
    const clock = utc(2026, 10, 25, 4, 0);
    const results = await Promise.all(Array.from({ length: 20 }, () => site.post(VALID.open, { clock })));
    assert.ok(results.every((r) => r.status === 204));
    const log = await site.log();
    assert.equal(log.points.length, 20, "control: all twenty written");
    assert.equal(log.puts.length, 1, `one salt written (${log.puts.length})`);
    assert.equal(new Set(log.points.map((p) => p.indexes[0])).size, 1, "one v");
  } finally {
    await site.dispose();
  }
});
