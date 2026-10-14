// A5 (SPEC-analytics.md § 2, § 7): the same IP and user agent, one day then the next: the same `v` within a day, a
// different `v` the next. `v` is the data point's index. Controls: a different IP on the same day is a different `v`
// (so "the same" is not a constant); the salt is per UTC day (two instants an hour apart across 00:00 UTC differ).
// And § 2's race, measured within one isolate: twenty first events of a day at once make one salt and one `v`.
import test from "node:test";
import assert from "node:assert/strict";
import { startBeacon, TEST_IP, utc, VALID } from "./a-harness.mjs";

const vOf = async (site, options) => {
  await site.post(VALID.open, options);
  const { points } = await site.log();
  assert.equal(points.length, 1, "control: one data point");
  return points[0].indexes[0];
};

test("A5: the same visitor has one v within a UTC day and another the next day", async () => {
  const site = await startBeacon();
  try {
    await site.log();
    const morning = await vOf(site, { clock: utc(2026, 10, 23, 1, 5) });
    const evening = await vOf(site, { clock: utc(2026, 10, 23, 23, 50) });
    const next = await vOf(site, { clock: utc(2026, 10, 24, 0, 10) });
    const other = await vOf(site, { clock: utc(2026, 10, 23, 12, 0), ip: "198.51.100.23" });
    assert.match(morning, /^[0-9a-f]{16}$/);
    assert.equal(evening, morning, "the same v within the day");
    assert.notEqual(next, morning, "a different v the next day");
    assert.notEqual(other, morning, "control: another IP the same day is another v");
    const back = await vOf(site, { clock: utc(2026, 10, 23, 18, 0), ip: TEST_IP });
    assert.equal(back, morning, "control: the day's salt is kept through the day");
  } finally {
    await site.dispose();
  }
});

test("A5: twenty first events of a day at once, in one isolate, make one salt and one v (§ 2's race, measured)", async () => {
  const site = await startBeacon();
  try {
    await site.log();
    const clock = utc(2026, 10, 25, 0, 0);
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
