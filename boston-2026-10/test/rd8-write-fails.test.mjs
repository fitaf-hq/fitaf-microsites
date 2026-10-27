// RD8 (SPEC-the-redirect.md § 1 item 6, § 7): ANALYTICS (and SALTS) unbound, and a writeDataPoint that throws: still the
// 302, the same Location, on both Workers; the write was tried (the control), and the next request written.
import test from "node:test";
import assert from "node:assert/strict";
import { failingWriteProblems } from "./rd-checks.mjs";

test("RD8: unbound or failing analytics never stop the redirect", async () => {
  assert.deepEqual(await failingWriteProblems(), []);
});
