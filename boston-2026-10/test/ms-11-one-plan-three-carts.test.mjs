// MS-11 (SPEC-meal-selection.md § 8 item 2, § 8.1, ⭐ one plan, three carts). The 14-meal plan is the plan of THREE answer
// sets (and, every day; or, every day, breakfast; and, weekdays, breakfast), so an mpid cannot name a cart: the card finds
// its cart by the answer set (#result's data-selection). With the version-2 fixture, whose three 14-meal carts differ,
// each shows its own lines and its own link at every size. A card that chooses by mpid fails it (MS-10's mutant).
import test from "node:test";
import assert from "node:assert/strict";
import { ON_14, threeCartsProblems } from "./ms-checks.mjs";
import { open, pageOf, V2_CARTS, V2_DIR } from "./ms-harness.mjs";

test("MS-11: the three answer sets on the 14-meal plan each show their own cart and link", async () => {
  assert.deepEqual(ON_14, ["and-7d", "or-7d-b", "and-5d-b"], "fixture control: § 8 item 2's three");
  const carts = ON_14.map((k) => JSON.stringify(V2_CARTS[k].items));
  assert.equal(new Set(carts).size, 3, "fixture control: the three carts differ");
  const html = await pageOf({ picks: V2_DIR });
  assert.deepEqual(threeCartsProblems(html), []);
  for (const key of ON_14) assert.equal(open(html, `#lean-${key}`).el("result").getAttribute("data-selection"), key, `${key}: the card's answer set`);
});
