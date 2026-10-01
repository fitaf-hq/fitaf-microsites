// R2-09: the fill on the synthetic order page. Every meal the link names is found by its key (SPEC-rung2 § 11: the key
// of its name as shown, whitespace collapsed); its own Add to Cart pressed, then its count made up by the store's own
// "+" (SPEC-rung2-fill-c § 1.1 and § 2a: the card's counter, "Increase value"); no other meal control is pressed; then
// the fragment is removed and the store's own CHECKOUT pressed (§ 8, whose own cases are R2-15 to R2-18). The cards
// may render late (the store's start-up): the fill waits, polling every 200 ms.
// Every meal gets its first press before any meal gets a second (R2-09f). Since fill C (SPEC-rung2-fill-c), each press
// waits for the store's count on that card: a store that shows NO count after a press (R2-09d, "gone"; R2-09e, only
// look-alikes) gets one press and a stop that names the counts, where fill B pressed every meal once blind. Fill C's
// "+" is the counter's own, found only in the card's .product__actions (R2-09e: the look-alikes are never pressed).
import test from "node:test";
import assert from "node:assert/strict";
import {
  ADD,
  assertCheckedOut,
  DECOY_LABELS,
  fakeWindow,
  fragmentFor,
  INC,
  MEALS,
  orderPage,
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
/** Every meal of PAYLOAD short when nothing is counted: the keys a stop line names, in the link's order. */
const ALL_SHORT = PAYLOAD.items.map((it) => refKey(it.name)).join(",");

test("R2-09a: each meal's own Add to Cart, then the store's \"+\" up to its count; nothing else pressed; then the store's CHECKOUT", async () => {
  const page = await orderPage();
  const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), page });
  run(await script(), h.window);
  h.timers.drain();
  assert.deepEqual(Object.fromEntries(page.presses), {
    [MEALS[0]]: [ADD],
    [MEALS[1]]: [ADD, INC],
    [MEALS[2]]: [ADD, INC, INC, INC],
  });
  assertCheckedOut(h, page, "/order?mpid=21");
  assertPollsAndPresses(h.timers.delays, page.log.length, "fill C:");
});

test("R2-09b: cards that render late are waited for; nothing is pressed before they exist", async () => {
  const page = await orderPage();
  page.hide();
  const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), page });
  run(await script(), h.window);
  for (let i = 0; i < 3; i++) assert.ok(h.timers.step(), "still polling");
  assert.equal(page.total(), 0);
  assert.equal(h.events.length, 0, "the fragment stays while the fill waits");
  page.show();
  h.timers.drain();
  assert.equal(page.total(), 7);
  assertCheckedOut(h, page, "/order?mpid=21");
});

test("R2-09c: the store's counter shows each count; the card's \"+\" makes up the count, and the plan holds each meal its count", async () => {
  const page = await orderPage();
  const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), page });
  run(await script(), h.window);
  h.timers.drain();
  assert.deepEqual(
    PAYLOAD.items.map((it) => page.countOf(it.name)),
    PAYLOAD.items.map((it) => it.qty),
    "the plan holds each meal its count",
  );
  const values = [...page.document.querySelectorAll("app-product-card .counter__value")].map((v) => v.textContent);
  assert.deepEqual(values, ["1", "2", "4"], "each card's counter shows its meal's count");
  assertCheckedOut(h, page, "/order?mpid=21");
});

test("R2-09d: the store shows no count and no control after a press — one press, then a stop naming the counts", async () => {
  const page = await orderPage({ afterFirstPress: "gone" });
  const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), document: page.document });
  run(await script(), h.window);
  h.timers.drain();
  // Fill C presses one unit and waits for the store's count; with none shown and nothing to press again, it stops.
  assert.deepEqual(Object.fromEntries(page.presses), { [MEALS[0]]: [ADD] });
  assert.deepEqual(h.events, [["replaceState", "/order?mpid=21"]], "fragment removed; /checkout NOT opened");
  assert.ok(
    h.info.some((line) => line.endsWith(`stopped: the store counted 0 of 7; short: ${ALL_SHORT}; no control`)),
    JSON.stringify(h.info),
  );
});

test("R2-09e: look-alikes are never pressed — favourites, wishlist, a bare 'add', or an Increase value outside the actions", async () => {
  const page = await orderPage({ afterFirstPress: "decoys" });
  const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), document: page.document });
  run(await script(), h.window);
  h.timers.drain();
  const pressed = [...page.presses.values()].flat();
  for (const decoy of DECOY_LABELS) assert.ok(!pressed.includes(decoy), `pressed ${decoy}`);
  assert.deepEqual(Object.fromEntries(page.presses), { [MEALS[0]]: [ADD] });
  assert.deepEqual(h.events, [["replaceState", "/order?mpid=21"]]);
});

test("R2-09f: every meal gets its first press before any meal gets a second", async () => {
  const page = await orderPage();
  const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), page });
  run(await script(), h.window);
  h.timers.drain();
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
