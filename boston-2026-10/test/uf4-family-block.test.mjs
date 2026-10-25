// UF4 (SPEC-ui-and-copy-pass.md § 2.2 item 4): the hand-off's full-plan rule reads mpid 35's counts from the data, 5 and
// 10, so a 5- or 10-meal Family cart passes and any other count is refused as today, in the rule's own words ("the plan
// takes 5 or 10 meals; the link has 7"): the plans' table the Footer block inlines (countTable), the built block itself
// run on R2's synthetic order page (r2-harness: the SHIPPED text, its cards, the store's own CHECKOUT), and the link
// tool, which refuses as the block does. ⚠ This changes the built Footer block's text (its COUNTS): it ships in the same
// new block as SPEC-rung2-progress-and-checkout §§ 30–31, one paste, built from the merged line (§ 2.2 item 4).
import test from "node:test";
import assert from "node:assert/strict";
import { countTable, storefrontText } from "../scripts/build-storefront.mjs";
import { payloadFromArgs } from "../scripts/handoff-link.mjs";
import { PLANS } from "./cc-harness.mjs";
import { assertCheckedOut, assertRefused, CART_KEY, FakeStorage, fakeWindow, fragmentFor, MEALS, orderPage, run, script } from "./r2-harness.mjs";
import { FAMILY_MEALS, FAMILY_MPID } from "./uf-harness.mjs";

const ALLOWED = Object.values(FAMILY_MEALS);
const payload = (counts) => ({ mpid: FAMILY_MPID, items: counts.map((qty, i) => ({ name: MEALS[i], qty })) });

/** The shipped block on the synthetic order page for Family, the link's own path and fragment. */
async function outcome(p) {
  const path = `/order?mpid=${p.mpid}`;
  const page = await orderPage();
  const h = fakeWindow({ path, fragment: fragmentFor(p), storage: new FakeStorage({ [CART_KEY]: "[]" }), page });
  run(await script(), h.window);
  h.timers.drain();
  return { h, path, page };
}

test("UF4: the plans' table gives mpid 35 its counts, 5 or 10, from data/plans.json, and the built block inlines it", async () => {
  assert.deepEqual(countTable(PLANS)[FAMILY_MPID], ALLOWED, "countTable: mpid 35 takes 5 or 10");
  const text = await storefrontText();
  const table = JSON.parse(/var COUNTS = \/\* data\/plans\.json, read_on [0-9-]+ \*\/ (\{[^\n]*\});/.exec(text)?.[1] ?? "null");
  assert.deepEqual(table?.[FAMILY_MPID], ALLOWED, "the block's COUNTS");
});

for (const counts of [[3, 2], [5, 5]]) {
  const n = counts.reduce((a, b) => a + b, 0);
  test(`UF4: the block takes a ${n}-meal Family cart to /checkout`, async () => {
    const { h, path, page } = await outcome(payload(counts));
    assertCheckedOut(h, page, path);
    assert.equal(page.total(), n, `${n} meals pressed`);
  });
}

for (const counts of [[4, 3], [1]]) {
  const n = counts.reduce((a, b) => a + b, 0);
  test(`UF4: the block refuses a ${n}-meal Family cart, naming the plan's counts; nothing pressed`, async () => {
    const { h, path, page } = await outcome(payload(counts));
    assertRefused(h, path, new RegExp(`the plan takes 5 or 10 meals; the link has ${n}`));
    assert.equal(page.total(), 0);
  });
}

test("UF4: the link tool refuses as the block does, and takes 5 and 10", () => {
  const counts = new Map(Object.entries(countTable(PLANS)).map(([mpid, allowed]) => [Number(mpid), allowed]));
  const argv = (qtys) => ["--mpid", String(FAMILY_MPID), ...qtys.flatMap((q, i) => ["--item", `${MEALS[i]}:${q}`])];
  assert.throws(() => payloadFromArgs(argv([4, 3]), counts), /the plan takes 5 or 10 meals; the link has 7/);
  for (const qtys of [[3, 2], [5, 5]]) assert.equal(payloadFromArgs(argv(qtys), counts).mpid, FAMILY_MPID);
});
