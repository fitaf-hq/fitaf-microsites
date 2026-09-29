// R2-06: fill A and payload version 2. Fill A writes cart lines in the shape of a real one (SPEC-rung2 § 6, "A, what it
// writes"), and every line needs the meal's product id. § 11 retired payload v1, the only form that carried one, and
// v2 carries meal keys and counts only. So fill A, unchanged, reads a v2 link, passes its own plan and cart checks,
// and then refuses at its product-id check, BEFORE its one write: storage byte-identical, fragment removed, no
// navigation. ⚠ This file checked the written line field by field against the sample the store's owner supplied on
// 2026-09-27; no v2 link can reach that write, so that check has nothing to run on. § 11 does not say what fill A
// does with v2 (the build's report to the orchestrator names it).
import test from "node:test";
import assert from "node:assert/strict";
import { loadPlans } from "./helpers.mjs";
import { assertRefused, CART_KEY, FakeStorage, fakeWindow, fragmentFor, refKey, run, script } from "./r2-harness.mjs";

const VISITOR_CART = JSON.stringify([{ localId: "36688", productId: 1353, quantity: 4, name: "Birria de Res Bowl" }]);

for (const [label, entries] of [
  ["a visitor's cart", { [CART_KEY]: VISITOR_CART, other_key: "untouched" }],
  ["no cart key", {}],
]) {
  test(`R2-06a (${label}): every Lean and Signature plan — read, then refused at the product id; nothing written`, async () => {
    const plans = await loadPlans();
    const cells = plans.individual
      .filter((plan) => plan.id === "lean" || plan.id === "signature")
      .flatMap((plan) => plan.counts);
    assert.equal(cells.length, 10);
    for (const cell of cells) {
      const storage = new FakeStorage(entries);
      const before = storage.dump();
      const path = `/order?mpid=${cell.mpid}`;
      const items = [{ name: "Birria de Res Bowl", qty: cell.meals_per_week }];
      const h = fakeWindow({ path, fragment: fragmentFor({ items }), storage });
      run(await script("A"), h.window);
      assert.ok(h.info.includes(`[fitaf-handoff] fill A, mpid ${cell.mpid}`), `mpid ${cell.mpid}: the payload was read`);
      assertRefused(h, path, new RegExp(`stopped: no product id: ${refKey("Birria de Res Bowl")}$`));
      assert.equal(storage.dump(), before, `mpid ${cell.mpid}: storage byte-identical`);
    }
  });
}
