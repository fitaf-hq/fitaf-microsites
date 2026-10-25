// N2 (SPEC-analytics.md § 12 items 2 and 6): the parameter `tracking` (any value, or none) the same way as N1's, its
// cookie cleared: a 302 to the same URL without it and
// `Set-Cookie: fitaf_no_tracking=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax`, whether the browser carries the
// cookie or not. Both parameters at once: off wins (the cookie cleared, both gone from the URL), in either order, so a
// mistaken link never hides a real visitor. On production's Worker (as committed, and with production false, the
// rollback) and the development Worker. The check is n-checks.mjs's, which the mutant "`tracking` not clearing" runs on
// a mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { productionFalseMirror } from "./cc-harness.mjs";
import { switchOffProblems } from "./n-checks.mjs";

test("N2: ?tracking is a 302 to the same URL without it, clearing the cookie; with ?no-tracking too, cleared", async () => {
  assert.deepEqual(await switchOffProblems(), []);
});

test("N2: production's Worker with production false (the rollback) does the same", async () => {
  const falseRoot = await productionFalseMirror();
  try {
    assert.deepEqual(await switchOffProblems(falseRoot, ["site"]), []);
  } finally {
    await rm(falseRoot, { recursive: true, force: true });
  }
});
