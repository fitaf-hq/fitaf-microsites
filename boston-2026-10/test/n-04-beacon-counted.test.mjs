// N4 (SPEC-analytics.md § 12 items 3 and 6, the control): the same beacons as N3's without the cookie are written, one
// data point each, the day's salt read; and "any other value of the cookie, or none, is today's path": the cookie at
// "0", empty, "true" or "11", a cookie whose name ends in it, and another cookie alone, each the same. On production's
// Worker and the development Worker. The check is n-checks.mjs's.
import test from "node:test";
import assert from "node:assert/strict";
import { countedProblems } from "./n-checks.mjs";

test("N4: POST /a without the cookie at 1 is written, one data point per event, on both Workers (control)", async () => {
  assert.deepEqual(await countedProblems(), []);
});
