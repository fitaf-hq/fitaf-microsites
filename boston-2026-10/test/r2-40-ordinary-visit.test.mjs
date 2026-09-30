// R2-40 (SPEC-rung2-progress-and-checkout § 4): an ordinary visit gets nothing new: no element, no style, no class, no
// timer of ours. R2-04 proves the cost (one read of location.hash, against a window that throws on anything else, its
// list extended by this contract); this case runs the same text on a REAL document, the synthetic order page, and
// compares the whole document before and after: byte for byte, nothing queued, nothing logged. Each hash is one an
// ordinary visitor (or the store) may carry. The control: a #fitaf= link on the same page does add the screen.
import test from "node:test";
import assert from "node:assert/strict";
import { CHECKOUT_PAYLOAD, fakeWindow, fragmentFor, orderPage, run, script } from "./r2-harness.mjs";
import { DEEP, deepState, screenOf, watchMutations } from "./r2-screen.mjs";

const ORDINARY = ["", "#", "#lean-7", "#fitaf", "#FITAF=2.t1fkl", "#xfitaf=2.t1fkl", "#top#fitaf=2.t1fkl"];

for (const hash of ORDINARY) {
  test(`R2-40: an ordinary visit (hash ${JSON.stringify(hash)}): the document byte-identical, no timer, no line`, async () => {
    const page = await orderPage();
    const h = fakeWindow({ fragment: hash, page });
    const before = page.document.documentElement.outerHTML;
    const mutations = watchMutations(page.document);
    run(await script(), h.window);
    assert.equal(h.timers.pending(), 0, "no timer");
    assert.deepEqual(h.timers.delays, [], "no timer was ever set");
    assert.equal(page.document.documentElement.outerHTML, before, "the document exactly as it was");
    assert.deepEqual(await mutations.settle(), [], "no mutation of ours at all");
    assert.equal(screenOf(page.document), null, "no screen");
    assert.deepEqual(deepState(page.document), { mark: false, styles: 0, inHead: true, css: "" }, "no mark, no style");
    assert.ok(!page.document.documentElement.classList.contains(DEEP));
    assert.deepEqual(h.info, [], "no line");
    assert.deepEqual(h.events, [], "no history write, no navigation");
  });
}

test("R2-40 control: on the same page a #fitaf= link does add the screen (so the comparison above can fail)", async () => {
  const page = await orderPage();
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  run(await script(), h.window);
  assert.ok(screenOf(page.document), "the screen, on a #fitaf= link");
});
