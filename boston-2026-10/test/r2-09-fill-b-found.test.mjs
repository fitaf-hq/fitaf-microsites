// R2-09: fill B on the synthetic order page. Every meal the link names is found by its key (SPEC-rung2 § 11: the key of
// its name as shown, whitespace collapsed) and its own Add to Cart pressed `qty` times; no other meal control is pressed; then the fragment is removed and the store's own
// CHECKOUT pressed (§ 8, whose own cases are R2-15 to R2-18). The cards may render late (the store's start-up): B
// waits, polling every 200 ms.
// Every meal gets its first press before any meal gets a second (R2-09f), so a missing increase control leaves
// each meal in the cart once (R2-09d). The fallback looks only in the card's .product__actions (R2-09e).
// ⚠ What a card's control becomes after the first press is NOT known for the real store, so a count above 1 is
// tested against each possibility the rule covers; which one the store has is proven only by the one-browser run.
import test from "node:test";
import assert from "node:assert/strict";
import {
  ADD,
  assertCheckedOut,
  DECOY_LABELS,
  fakeWindow,
  fragmentFor,
  MEALS,
  orderPage,
  POLL_MS,
  refKey,
  run,
  script,
  assertPollsAndPresses,
} from "./r2-harness.mjs";

const PAYLOAD = {
  mpid: 21,
  items: [
    { name: "Birria de Res Bowl", qty: 1 },
    { name: "Chicken Pesto Pasta", qty: 2 },
    { name: "Jalapeño Lime Chicken", qty: 4 },
  ],
};

test("R2-09a: each meal's own Add to Cart pressed qty times, nothing else pressed, then the store's CHECKOUT", async () => {
  const page = await orderPage();
  const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), page });
  run(await script("B"), h.window);
  h.timers.drain();
  assert.deepEqual(Object.fromEntries(page.presses), {
    [MEALS[0]]: [ADD],
    [MEALS[1]]: [ADD, ADD],
    [MEALS[2]]: [ADD, ADD, ADD, ADD],
  });
  assertCheckedOut(h, page, "/order?mpid=21");
  assertPollsAndPresses(h.timers.delays, page.log.length, "§ 23:");
});

test("R2-09b: cards that render late are waited for; nothing is pressed before they exist", async () => {
  const page = await orderPage();
  page.hide();
  const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), page });
  run(await script("B"), h.window);
  for (let i = 0; i < 3; i++) assert.ok(h.timers.step(), "still polling");
  assert.equal(page.total(), 0);
  assert.equal(h.events.length, 0, "the fragment stays while B waits");
  page.show();
  h.timers.drain();
  assert.equal(page.total(), 7);
  assertCheckedOut(h, page, "/order?mpid=21");
});

test("R2-09c: if Add to Cart becomes a stepper, the card's Increase button makes up the count", async () => {
  const page = await orderPage({ afterFirstPress: "stepper" });
  const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), page });
  run(await script("B"), h.window);
  h.timers.drain();
  const INC = "Increase quantity";
  assert.deepEqual(Object.fromEntries(page.presses), {
    [MEALS[0]]: [ADD],
    [MEALS[1]]: [ADD, INC],
    [MEALS[2]]: [ADD, INC, INC, INC],
  });
  assertCheckedOut(h, page, "/order?mpid=21");
});

test("R2-09d: no increase control after a press — B stops after the first press of each meal", async () => {
  const page = await orderPage({ afterFirstPress: "gone" });
  const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), document: page.document });
  run(await script("B"), h.window);
  h.timers.drain();
  // ⚠ The one case where B leaves a partly filled cart: every meal once, no count above 1 reached, and a press
  // cannot be taken back. B presses each meal once BEFORE any second press, so this is the worst it leaves.
  assert.deepEqual(Object.fromEntries(page.presses), { [MEALS[0]]: [ADD], [MEALS[1]]: [ADD], [MEALS[2]]: [ADD] });
  assert.deepEqual(h.events, [["replaceState", "/order?mpid=21"]], "fragment removed; /checkout NOT opened");
  assert.ok(h.info.some((line) => line.endsWith(`stopped: no control to add ${refKey(MEALS[1])} after 1`)), JSON.stringify(h.info));
});

test("R2-09e: look-alikes are never pressed — favourites, wishlist, a bare 'add', or a control outside the actions", async () => {
  const page = await orderPage({ afterFirstPress: "decoys" });
  const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), document: page.document });
  run(await script("B"), h.window);
  h.timers.drain();
  const pressed = [...page.presses.values()].flat();
  for (const decoy of DECOY_LABELS) assert.ok(!pressed.includes(decoy), `pressed ${decoy}`);
  assert.deepEqual(Object.fromEntries(page.presses), { [MEALS[0]]: [ADD], [MEALS[1]]: [ADD], [MEALS[2]]: [ADD] });
  assert.deepEqual(h.events, [["replaceState", "/order?mpid=21"]]);
});

test("R2-09f: every meal gets its first press before any meal gets a second", async () => {
  const page = await orderPage({ afterFirstPress: "stepper" });
  const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), document: page.document });
  run(await script("B"), h.window);
  h.timers.drain();
  const INC = "Increase quantity";
  assert.deepEqual(page.log, [
    [MEALS[0], ADD],
    [MEALS[1], ADD],
    [MEALS[2], ADD],
    [MEALS[1], INC],
    [MEALS[2], INC],
    [MEALS[2], INC],
    [MEALS[2], INC],
  ]);
});
