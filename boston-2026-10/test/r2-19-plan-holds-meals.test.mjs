// R2-19 (SPEC-rung2 § 10): fill B starts only on an EMPTY plan. When the store already shows a meal chosen for this plan
// (a pending list from an earlier visit, a reload mid-fill, a second tab), B stops with "stopped: the plan already
// holds meals" and presses NOTHING: no meal and no page control. It never removes a visitor's meals: at 1025 px and
// wider the store's "Clear cart" is displayed, and never pressed. What the store shows, per § 10's build note: below
// 1025 px its cart bar, visible only once the plan holds a meal, reads "Add N more meal(s)"; at 1025 px and wider its
// sidebar reads "ADD N MORE MEAL(S) TO CHECKOUT". The whole refusal is heldCase() in r2-harness.mjs, which R2-23 also
// runs against its mutants.
import test from "node:test";
import assert from "node:assert/strict";
import {
  assertRefused,
  CHECKOUT_PAYLOAD,
  fakeWindow,
  fragmentFor,
  heldCase,
  MEALS,
  orderPage,
  run,
  script,
  untouchableStorage,
} from "./r2-harness.mjs";

const SHORT = {
  bar: (n) => `Add ${n} more meal${n === 1 ? "" : "s"} (disabled)`,
  sidebar: (n) => `ADD ${n} MORE MEAL${n === 1 ? "" : "S"} TO CHECKOUT (disabled)`,
};

for (const width of ["bar", "sidebar"]) {
  test(`R2-19a ${width}: the plan already holds 1 of the link's meals — stopped, nothing pressed`, async () => {
    const { before, page } = await heldCase(await script("B"), { width });
    assert.deepEqual(before, [SHORT[width](6)], "fixture control: the store's 'Add 6 more' state");
    if (width === "sidebar") assert.match(page.shownText(), /^1 item Clear cart ADD 6 MORE MEALS TO CHECKOUT$/);
  });

  test(`R2-19b ${width}: the plan holds a meal of the visitor's own, not in the link — the same`, async () => {
    const { before } = await heldCase(await script("B"), { width, pending: ["A meal the visitor chose"] });
    assert.deepEqual(before, [SHORT[width](6)]);
  });

  test(`R2-19c ${width}: the plan holds 6 of 7 — the same`, async () => {
    const six = [MEALS[0], MEALS[1], MEALS[1], MEALS[2], MEALS[2], MEALS[2]];
    const { before } = await heldCase(await script("B"), { width, pending: six });
    assert.deepEqual(before, [SHORT[width](1)]);
  });

  test(`R2-19d ${width}: the store renders late — B waits, pressing nothing, and stops once the store shows the meal`, async () => {
    const page = await orderPage({ width, store: { pending: [MEALS[0]] } });
    page.hide();
    const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page, storage: untouchableStorage() });
    // Before the store's start-up: no meal card and no cart on the page at all.
    const summaries = [...page.document.querySelectorAll(".summary")];
    const rendered = summaries.map((s) => s.innerHTML);
    for (const s of summaries) s.innerHTML = "";
    run(await script("B"), h.window);
    for (let i = 0; i < 3; i++) assert.ok(h.timers.step(), "still waiting");
    assert.deepEqual(page.all, []);
    assert.deepEqual(h.events, [], "the fragment stays while B waits");
    page.show();
    summaries.forEach((s, i) => {
      s.innerHTML = rendered[i];
    });
    h.timers.drain();
    assert.deepEqual(page.all, [], "no press at all");
    assertRefused(h, "/order?mpid=21", /stopped: the plan already holds meals$/);
    assert.deepEqual(page.store.pending, [MEALS[0]]);
  });
}
