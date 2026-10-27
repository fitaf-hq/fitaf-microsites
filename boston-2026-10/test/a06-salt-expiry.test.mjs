// A6 (SPEC-analytics.md § 2, § 7): the salt's KV write has an expiry of at most 172,800 s. Read twice: the write's own
// option (recorded on its way to SALTS) and the expiry the namespace then reports for its key; at the first and the last
// minute of a New York day (§ 2's day since 2026-10-13). The check is a-checks.mjs's, which the mutant "the salt written
// without an expiry" runs on a mirror. And the salt lives through its day, whatever its length: an event in the day's
// last minute still finds the salt its first minute made, on a 24-hour day and on the 25- and 23-hour days of the DST
// changes (lengths from the calendar, written here).
import test from "node:test";
import assert from "node:assert/strict";
import { saltExpiryProblems, MAX_SALT_TTL_S } from "./a-checks.mjs";
import { startBeacon, VALID, visitorOf } from "./a-harness.mjs";

test("A6: the salt is written with an expiry of at most 172,800 s", async () => {
  assert.deepEqual(await saltExpiryProblems(), []);
});

const DAYS = [
  ["2026-10-23, 24 hours", "2026-10-23T00:00:00-04:00", "2026-10-23T23:59:00-04:00", 24],
  ["2026-11-01, 25 hours", "2026-11-01T00:00:00-04:00", "2026-11-01T23:59:00-05:00", 25],
  ["2027-03-14, 23 hours", "2027-03-14T00:00:00-05:00", "2027-03-14T23:59:00-04:00", 23],
];

for (const [label, first, last, hours] of DAYS) {
  test(`A6: the expiry outlives the day (${label}): its last minute reads the salt its first minute made`, async () => {
    const site = await startBeacon();
    try {
      await site.log();
      await site.post(VALID.open, { clock: Date.parse(first) });
      const made = await site.log();
      assert.equal(made.puts.length, 1, "control: the first event made the day's salt");
      const ttl = made.puts[0].options?.expirationTtl ?? 0;
      assert.ok(ttl >= hours * 3600, `made at the day's 00:00, it lives the day's ${hours} hours (${ttl} s)`);
      assert.ok(ttl <= MAX_SALT_TTL_S, `and at most 48 h (${ttl} s)`);
      await site.post(VALID.open, { clock: Date.parse(last) });
      const later = await site.log();
      assert.equal(later.puts.length, 0, "the day's last minute made no new salt");
      // SPEC-analytics.md § 15 item 2: the visitor is blob12.
      assert.match(String(visitorOf(made.points[0])), /^[0-9a-f]{16}$/, "control: the first event's v");
      assert.equal(visitorOf(later.points[0]), visitorOf(made.points[0]), "and the same v");
    } finally {
      await site.dispose();
    }
  });
}
