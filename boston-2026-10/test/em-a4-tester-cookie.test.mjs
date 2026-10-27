// EM-A4 (SPEC-analytics.md § 16 items 1 and 5; § 12's N3, for the new page): with the tester cookie
// (`fitaf_no_tracking=1`, alone and among others), the offer page's beacon is not written: a 204, no data point, SALTS
// neither read nor written; on production's Worker and the development Worker. The control: the same beacons without
// the cookie are written, one data point each. The beacons are the ones the offer pages' script sends (each kind), the
// pages from the development Worker in Miniflare. The check is em-a-checks.mjs's.
import test from "node:test";
import assert from "node:assert/strict";
import { testerCookieProblems } from "./em-a-checks.mjs";

test("EM-A4: the offer page's beacon carrying the tester cookie is a 204 with nothing written and SALTS untouched, on both Workers", async () => {
  assert.deepEqual(await testerCookieProblems(), []);
});
