// R2-41 (SPEC-rung2-progress-and-checkout § 2 items 1 and 2): a valid 7-meal link. The screen is on the page before
// fill B's first press, titled from data/messages.json; progress is fill B's own, presses made of (the plan's count + 1):
// 1 of 8 … 7 of 8 after each meal's press, then 8 of 8 at the store's CHECKOUT, with "Taking you to checkout"; the step
// line names each meal as its card shows it ("Chicken   Pesto\n Pasta" on the card reads "Chicken Pesto Pasta").
// Each state is read AT each press (before fill B updates it) and at the store's route, so the order is observed.
import test from "node:test";
import assert from "node:assert/strict";
import { CHECKOUT_PAYLOAD, CHECKOUT_PRESSES, fakeWindow, fragmentFor, MEALS, orderPage, run, script, untouchableStorage } from "./r2-harness.mjs";
import { assertWords, percent, screenState, stepLine, watchPresses, WORDS } from "./r2-screen.mjs";

/** CHECKOUT_PAYLOAD's presses, in fill B's order (every meal's first press before any second): 1 + 2 + 4 = 7. */
const ORDER = [MEALS[0], MEALS[1], MEALS[2], MEALS[1], MEALS[2], MEALS[2], MEALS[2]];

test("R2-41: the screen before the first press; 1 of 8 … 7 of 8, then 8 of 8 at CHECKOUT; each meal named as its card shows it", async () => {
  assertWords();
  const page = await orderPage();
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page, storage: untouchableStorage() });
  const presses = watchPresses(page.document);
  let atRoute = null;
  const pushState = h.window.history.pushState;
  h.window.history.pushState = (...args) => {
    atRoute = screenState(page.document);
    pushState(...args);
  };
  run(await script(), h.window);
  h.timers.drain();

  // Each meal's Add to Cart, then the store's "+" for its counts above 1 (SPEC-rung2-fill-c § 1.1), then CHECKOUT.
  assert.deepEqual(presses.map((p) => p.label), [...CHECKOUT_PRESSES.map(([, label]) => label), "CHECKOUT"], "fixture control: 7 meals, then CHECKOUT");
  assert.deepEqual(CHECKOUT_PRESSES.map(([meal]) => meal), ORDER, "fixture control: the meals in ORDER");
  const first = presses[0].state;
  assert.ok(first, "the screen is on the page at the first press");
  assert.equal(first.title, WORDS.title);
  assert.equal(first.progress, "0%", "nothing pressed yet");
  assert.equal(first.step, "", "the step line waits for the first meal");
  assert.deepEqual(first.slides, []);

  // At press k + 1 the screen shows press k's progress: k of 8, the k-th meal named, "k of 7 meals".
  for (let k = 1; k < presses.length; k++) {
    const s = presses[k].state;
    assert.ok(s, `the screen at press ${k + 1}`);
    assert.equal(s.progress, percent(k, 8), `progress ${k} of 8`);
    assert.equal(s.step, stepLine(ORDER[k - 1], k, 7), `press ${k}: ${ORDER[k - 1]}`);
    assert.equal(s.slides[s.shown]?.name, ORDER[k - 1], `the carousel shows the meal just added (press ${k})`);
  }
  assert.ok(atRoute, "the screen is still on the page when the store routes");
  assert.equal(atRoute.progress, percent(8, 8), "8 of 8 at CHECKOUT");
  assert.equal(atRoute.step, WORDS.checkout);
  assert.deepEqual(atRoute.slides.map((s) => s.name), MEALS, "one slide per meal, in the order fill B first pressed each");
});

test("R2-41b: the step line is a polite status, the only role on the screen; the title is the page's words", async () => {
  const page = await orderPage();
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  run(await script(), h.window);
  const s = page.document.getElementById("fitaf-screen");
  assert.ok(s);
  const roles = [...s.querySelectorAll("[role]")];
  assert.deepEqual(roles.map((el) => [el.getAttribute("role"), el.getAttribute("aria-live")]), [["status", "polite"]]);
  assert.equal(s.parentElement, page.document.body, "one element of its own, in <body>");
  assert.equal(page.document.querySelectorAll("#fitaf-screen").length, 1);
});
