// SN-2 (SPEC-snacks-in-the-cart § 3.3, § 3.6, § 5 item 2; § 1a's store): the press of a snack, on the synthetic store's
// snack cards. Every meal's units first, exactly as fill C presses a link with no snack; then each snack's: a card that
// shows Select Options has it pressed ONCE, then the expansion's Add to Cart, then its "+" for a second unit; a card with
// Add to Cart directly has that pressed. Select Options is never pressed again (the block never closes an expansion),
// and nothing in the expansion is touched (the size is the store's default, never chosen). An expansion that comes 2 s
// late is waited for; one that never comes stops the fill (`; no control`) with CHECKOUT never pressed. The progress
// screen's bar and step line count the link's units (17: 14 meals, 3 snack units), and the checkout's recap reads
// data/messages.json's `recap_snacks` with the meals' count and the snack units.
import test from "node:test";
import assert from "node:assert/strict";
import { ADD, INC, LOG_PREFIX, MIN_GAP_MS } from "./r2-harness.mjs";
import { FC_PAYLOAD, FC_TOTAL } from "./fc-harness.mjs";
import { deepState, percent, screenState, stepLine, WORDS } from "./r2-screen.mjs";
import { assertFullCart, DIRECT, labelsOf, snRun, snStart, SN_UNITS, TOGGLED, unitPresses } from "./sn-harness.mjs";

const TOGGLE = "Select Options";
const ADD_SNACK = `${ADD} $9.00`;

test("SN-2a: meals first (as with no snack), then Select Options once, the expansion's Add to Cart, its \"+\"; the direct card's Add to Cart twice over by \"+\"", async () => {
  const r = await snRun();
  assert.equal(r.last, `${LOG_PREFIX} done: /checkout`, JSON.stringify(r.ours));
  const meals = r.page.log.slice(0, FC_TOTAL);
  assert.ok(meals.every(([name]) => FC_PAYLOAD.items.some((it) => it.name === name)), "the first 14 presses are the meals'");
  assert.deepEqual(r.page.log.slice(FC_TOTAL), [[TOGGLED, TOGGLE], [TOGGLED, ADD_SNACK], [DIRECT, ADD_SNACK], [DIRECT, INC]], "then the snacks, one after the other");
  assert.deepEqual(labelsOf(r.page, TOGGLED), [TOGGLE, ADD_SNACK], "Select Options once, never Hide Options; the size's own control never pressed");
  assertFullCart(r.page);
});

test("SN-2b: the same link without its snacks presses exactly what it pressed before (the meals' presses unchanged)", async () => {
  const withSnacks = await snRun();
  const without = await snRun({ payload: FC_PAYLOAD });
  assert.equal(without.last, `${LOG_PREFIX} done: /checkout`);
  assert.deepEqual(without.page.log, withSnacks.page.log.slice(0, FC_TOTAL));
  assert.deepEqual(without.page.cartAtCheckout, [], "control: no snack carted");
});

test("SN-2c: an expansion 2 s late is waited for, by polls, with no second press of Select Options", async () => {
  const r = await snRun({ cards: [{ name: TOGGLED, expandMs: 2000 }, { name: DIRECT, toggle: false }] });
  assert.equal(r.last, `${LOG_PREFIX} done: /checkout`, JSON.stringify(r.ours));
  assert.deepEqual(labelsOf(r.page, TOGGLED), [TOGGLE, ADD_SNACK]);
  const [pressedAt, addAt] = r.page.log.map((e, i) => [e, r.page.at[i]]).filter(([[name]]) => name === TOGGLED).map(([, t]) => t);
  assert.ok(addAt - pressedAt >= 2000 && addAt - pressedAt <= 2000 + MIN_GAP_MS, `Add to Cart at the first read after the expansion: ${addAt - pressedAt} ms`);
  assertFullCart(r.page);
});

test("SN-2d: an expansion that never comes stops the fill, naming the snack short and no control; CHECKOUT never pressed", async () => {
  const r = await snRun({ cards: [{ name: TOGGLED, expands: false }, { name: DIRECT, toggle: false }] });
  assert.match(r.last ?? "", /^\[fitaf-handoff\] stopped: the store counted 14 of 17; short: [0-9a-z,]+; no control$/, JSON.stringify(r.ours));
  assert.deepEqual(labelsOf(r.page, TOGGLED), [TOGGLE], "Select Options pressed once, never again");
  assert.deepEqual(r.page.controls, [], "CHECKOUT never pressed");
  const waited = r.timers.now - r.page.at.at(-1);
  assert.ok(waited >= 5000 && waited <= 5300, `the stop about ACK_MS after Select Options: ${waited} ms`);
});

test("SN-2e: the screen counts units: after the last press, the step line is the last snack's \"17 of 17\" and the bar 17 of 18", async () => {
  const { h, page } = await snStart();
  while (unitPresses(page).length < SN_UNITS) assert.ok(h.timers.step(), "the fill still pressing");
  const s = screenState(page.document);
  assert.equal(s.step, stepLine(DIRECT, SN_UNITS, SN_UNITS));
  assert.equal(s.progress, percent(SN_UNITS, SN_UNITS + 1));
  assert.ok(s.slides.some((sl) => sl.name === TOGGLED) && s.slides.some((sl) => sl.name === DIRECT), "each snack has its slide");
});

test("SN-2f: the checkout's recap with snacks reads recap_snacks: the meals' count and the snack units", async () => {
  assert.ok(WORDS.recap_snacks?.includes("{n}") && WORDS.recap_snacks.includes("{s}"), "control: the words carry {n} and {s}");
  const r = await snRun();
  const recap = JSON.stringify(WORDS.recap_snacks.replace("{s}", "3").replace("{n}", "14"));
  assert.ok(deepState(r.page.document).css.includes(`content:${recap}`), `the recap ${recap}`);
  const plain = await snRun({ payload: FC_PAYLOAD });
  assert.ok(deepState(plain.page.document).css.includes(`content:${JSON.stringify(WORDS.recap.replace("{n}", "14"))}`), "with no snack, today's recap");
});

test("SN-2g: a meal's card is pressed as before; a snack card's \"+\" is the store's counter's, inside .product__actions", async () => {
  const r = await snRun({ payload: { ...FC_PAYLOAD, snacks: [{ name: TOGGLED, qty: 3 }] } });
  assert.deepEqual(labelsOf(r.page, TOGGLED), [TOGGLE, ADD_SNACK, INC, INC]);
  assertFullCart(r.page, { ...FC_PAYLOAD, snacks: [{ name: TOGGLED, qty: 3 }] });
});
