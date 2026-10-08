// FC-4 (SPEC-rung2-fill-c § 1.4): before CHECKOUT, the plan's OWN count must equal the link's total and CHECKOUT be
// enabled; if not within the wait for CHECKOUT (10 s), stop, naming the counts and what the plan shows. The plan's count
// is what the store displays at this width (§ 2a): the sidebar's "N items" (.cart__items-count, 1025 px and wider) or
// the phone bar's "Items" (.mobile-cart-summary__stat-value). § 2b's lead: a meal put in the plan by another tab.
// ⭐ The mutant, IN MEMORY: the plan's count not checked (CHECKOUT pressed once enabled, as fill B): FC-4a fails.
import test from "node:test";
import assert from "node:assert/strict";
import { clockTimers, fakeWindow, fragmentFor, LOG_PREFIX, MEALS, run, script, untouchableStorage } from "./r2-harness.mjs";
import { assertDone, assertFullPlan, fcPage, fcRun, FC_PATH, FC_PAYLOAD, FC_TOTAL, keyOf } from "./fc-harness.mjs";

const PLAN_CHECKED = "b && (k || n[0] === (n[1] ? p.units : p.total))";

/** Fill C until its last press, then `meanwhile(page)` (as another tab, or the store), then to its end. */
async function untilLastPress(text, meanwhile, options = {}) {
  const timers = clockTimers();
  const page = await fcPage(options);
  const h = fakeWindow({ path: FC_PATH, fragment: fragmentFor(FC_PAYLOAD), page, timers, storage: untouchableStorage() });
  run(text, h.window);
  while (page.log.length < FC_TOTAL) assert.ok(timers.step(), "still pressing");
  meanwhile(page);
  timers.drain();
  return { h, page, last: h.info.filter((l) => l.startsWith(LOG_PREFIX)).at(-1) };
}

test("FC-4a: another tab adds one more of a meal of the link, and CHECKOUT is enabled — not pressed; the card's count names it over", async () => {
  // The store draws MEALS[0]'s card at 3 of the link's 2: § 1.5's over, at fill C's next read, before CHECKOUT.
  const r = await untilLastPress(await script(), (page) => page.elsewhere(MEALS[0]), { need: FC_TOTAL + 1 });
  assert.equal(r.page.store.pending.length, FC_TOTAL + 1, "fixture control: the plan holds 15");
  assert.deepEqual(r.page.controls, [], "CHECKOUT not pressed: the plan is not the link's");
  assert.equal(r.last, `${LOG_PREFIX} stopped: the store counted ${FC_TOTAL + 1} of ${FC_TOTAL}; over: ${keyOf(MEALS[0])}`);
});

test("FC-4a': a meal NOT on the link put in the plan elsewhere — the cards all read right; the plan's own count stops it", async () => {
  const r = await untilLastPress(await script(), (page) => page.elsewhere("A meal from another tab"), { need: FC_TOTAL + 1 });
  assert.deepEqual(r.page.controls, [], "CHECKOUT not pressed");
  assert.equal(r.last, `${LOG_PREFIX} stopped: the store counted ${FC_TOTAL} of ${FC_TOTAL}; the plan shows ${FC_TOTAL + 1}`);
});

for (const width of ["bar", "sidebar"]) {
  test(`FC-4b ${width}: the plan's count read where the store displays it — done`, async () => {
    const r = await fcRun({ width });
    const shown = [...r.page.document.querySelectorAll(".cart__items-count, .mobile-cart-summary__stat-value")]
      .filter((e) => e.getClientRects().length)
      .map((e) => e.textContent);
    assert.deepEqual(shown, [width === "bar" ? "14" : "14 items"], "fixture control: the one displayed count");
    assertDone(r);
    assertFullPlan(r.page);
  });
}

test("FC-4c: the displayed count gone (a release renamed it) — CHECKOUT not pressed; the plan shows 0", async () => {
  const r = await untilLastPress(await script(), (page) => {
    page.document.querySelector('[data-layout="shown"] .mobile-cart-summary__stat-value').className = "renamed";
  });
  assert.deepEqual(r.page.controls, []);
  assert.equal(r.last, `${LOG_PREFIX} stopped: the store counted ${FC_TOTAL} of ${FC_TOTAL}; the plan shows 0`);
});

test("FC-4 (mutant): the plan's count not checked — FC-4a' fails (CHECKOUT pressed with the plan at 15)", async () => {
  const text = await script();
  assert.equal(text.split(PLAN_CHECKED).length, 2, "the check the mutant removes is in the shipped text, once");
  const mutant = text.replace(PLAN_CHECKED, "b");
  const r = await untilLastPress(mutant, (page) => page.elsewhere("A meal from another tab"), { need: FC_TOTAL + 1 });
  assert.deepEqual(r.page.controls, ["checkout:shown"], "the mutant presses CHECKOUT");
});
