import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PLANS_PATH, renderPage } from "../build.mjs";
import { assertSignature14Is29, loadPlans } from "./helpers.mjs";

/** Swap Signature 14/21 mpids in a COPY. The committed file is never written. */
export function swapSignature14And21(plans) {
  const copy = structuredClone(plans);
  const sig = copy.individual.find((p) => p.id === "signature");
  const c14 = sig.counts.find((c) => c.meals_per_week === 14);
  const c21 = sig.counts.find((c) => c.meals_per_week === 21);
  [c14.mpid, c21.mpid] = [c21.mpid, c14.mpid];
  return copy;
}

test("T7: the Signature 14/21 swap mutant makes T3 fail", async () => {
  const before = await readFile(PLANS_PATH, "utf8");
  const plans = await loadPlans();
  assertSignature14Is29(await renderPage(plans)); // control: the real data passes
  const mutant = swapSignature14And21(plans);
  await assert.rejects(
    async () => assertSignature14Is29(await renderPage(mutant)),
    /mpid=29/,
    "T3 must fail on the mutant",
  );
  assert.equal(await readFile(PLANS_PATH, "utf8"), before, "committed plans.json untouched");
});
