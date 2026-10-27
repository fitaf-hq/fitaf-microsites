// RD4 (SPEC-the-redirect.md § 3, § 1 item 6, § 7): with the var set, one counted GET "/" is the 302 and exactly one data
// point, after the answer (ctx.waitUntil), its blobs as § 3 (blob1 redirect, blob2 16 hex digits new for each request,
// blob3 the country, blob4 the device, blob6 qr, blob12 the visitor's v, blob14 via; every other blob "", every double 0;
// the point's own index), the same v as a beacon from the same sender that day; none for § 12's cookie at "1", a HEAD,
// or each kind of user agent the closed list names (one sample each), the 302 the same in every case; people's browsers
// counted (the control); and POST /a refusing the Worker's own event. Both Workers (a-harness startBeacon). The check is
// rd-checks.mjs's, which the mutant "the cookie ignored" runs on a mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { dataPointProblems } from "./rd-checks.mjs";

test("RD4: one counted GET / is one redirect data point after the answer; none for the cookie, a HEAD or a program's user agent", async () => {
  assert.deepEqual(await dataPointProblems(), []);
});
