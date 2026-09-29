// R2-33 (SPEC-rung2 § 12 item 1): the source keeps none of fill A: no `// <fill A>` region marker, no `fillA`, no PLANS
// slot (the per-meal price table fill A wrote from), and none of the rest item 1 names: CART_KEY, OPTION, `undo`, the
// guard's restore line. The history keeps fill A.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { STOREFRONT_SOURCE } from "../scripts/build-storefront.mjs";

test("R2-33: the source has no <fill A> marker, no fillA, no PLANS slot", async () => {
  const source = await readFile(STOREFRONT_SOURCE, "utf8");
  assert.doesNotMatch(source, /<\/?fill A>/, "a fill A region marker");
  assert.doesNotMatch(source, /fillA/, "fillA");
  assert.doesNotMatch(source, /\/\*PLANS\*\//, "the PLANS slot");
  assert.doesNotMatch(source, /\bPLANS\b/, "the PLANS table");
  for (const re of [/\bCART_KEY\b/, /\bOPTION\b/, /\bundo\b/, /restore failed/]) assert.doesNotMatch(source, re, String(re));
});
