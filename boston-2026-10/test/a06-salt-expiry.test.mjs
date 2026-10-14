// A6 (SPEC-analytics.md § 2, § 7): the salt's KV write has an expiry of at most 172,800 s. Read twice: the write's own
// option (recorded on its way to SALTS) and the expiry the namespace then reports for its key; at the first and the last
// minute of a UTC day. The check is a-checks.mjs's, which the mutant "the salt written without an expiry" runs on a
// mirror. And the salt lives through its day: an event in the day's last minute still finds the salt its first made.
import test from "node:test";
import assert from "node:assert/strict";
import { saltExpiryProblems } from "./a-checks.mjs";
import { startBeacon, utc, VALID } from "./a-harness.mjs";

test("A6: the salt is written with an expiry of at most 172,800 s", async () => {
  assert.deepEqual(await saltExpiryProblems(), []);
});

test("A6: the expiry outlives the day: the day's last minute reads the salt its first minute wrote", async () => {
  const site = await startBeacon();
  try {
    await site.log();
    await site.post(VALID.open, { clock: utc(2026, 10, 23, 0, 0) });
    const first = await site.log();
    assert.equal(first.puts.length, 1, "control: the first event made the day's salt");
    const ttl = first.puts[0].options?.expirationTtl ?? 0;
    assert.ok(ttl >= 24 * 3600, `made at 00:00 UTC, it lives at least the day (${ttl} s)`);
    await site.post(VALID.open, { clock: utc(2026, 10, 23, 23, 59) });
    const last = await site.log();
    assert.equal(last.puts.length, 0, "the day's last minute made no new salt");
    assert.equal(last.points[0].indexes[0], first.points[0].indexes[0], "and the same v");
  } finally {
    await site.dispose();
  }
});
