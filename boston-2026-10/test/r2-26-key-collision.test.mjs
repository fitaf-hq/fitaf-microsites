// R2-26 (SPEC-rung2 § 11 item 3): two meal cards on the page whose names share a key, one of them named by the link.
// Fill B cannot tell which the link means, so it refuses the link and presses nothing: `stopped: two meals share a
// key` (the build adds the key: `…: <key>`). The whole refusal is collisionCase() in r2-harness.mjs, which R2-30 runs
// against its mutant. A collision the link does NOT name is not a refusal.
import test from "node:test";
import assert from "node:assert/strict";
import {
  addCard,
  assertCheckedOut,
  CHECKOUT_PAYLOAD,
  COLLIDING,
  COLLISION_PAYLOAD,
  collisionCase,
  fakeWindow,
  fragmentFor,
  orderPage,
  refKey,
  run,
  script,
} from "./r2-harness.mjs";

test("R2-26 fixture control: the two planted names differ and share a key", () => {
  assert.notEqual(COLLIDING[0], COLLIDING[1]);
  assert.equal(refKey(COLLIDING[0]), refKey(COLLIDING[1]));
});

test("R2-26a: both cards on the page, the link naming one — stopped: two meals share a key; nothing pressed", async () => {
  await collisionCase(await script());
});

test("R2-26b: the link naming the OTHER of the two — the same", async () => {
  const page = await orderPage();
  for (const name of COLLIDING) addCard(page.document, name);
  const payload = { ...COLLISION_PAYLOAD, items: COLLISION_PAYLOAD.items.map((it) => (it.name === COLLIDING[0] ? { ...it, name: COLLIDING[1] } : it)) };
  const h = fakeWindow({ fragment: fragmentFor(payload), page });
  run(await script(), h.window);
  h.timers.drain();
  assert.deepEqual(page.all, []);
  assert.ok(h.info.includes(`[fitaf-handoff] stopped: two meals share a key: ${refKey(COLLIDING[1])}`), JSON.stringify(h.info));
});

test("R2-26 control: only one of the two on the page — the link fills, pressing that card", async () => {
  const page = await orderPage();
  addCard(page.document, COLLIDING[0]);
  const h = fakeWindow({ fragment: fragmentFor(COLLISION_PAYLOAD), page });
  run(await script(), h.window);
  h.timers.drain();
  assert.equal(page.presses.get(COLLIDING[0]).length, 4);
  assertCheckedOut(h, page, "/order?mpid=21");
});

test("R2-26 control: both on the page, the link naming neither — the link fills; a collision it does not name is not a refusal", async () => {
  const page = await orderPage();
  for (const name of COLLIDING) addCard(page.document, name);
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  run(await script(), h.window);
  h.timers.drain();
  assert.equal(page.total(), 7);
  assert.ok(!COLLIDING.some((name) => page.presses.has(name)));
  assertCheckedOut(h, page, "/order?mpid=21");
});

test("R2-26c: the same meal rendered in two cards shares its own key — refused too (the rule is two CARDS)", async () => {
  const page = await orderPage();
  addCard(page.document, "Chicken   Pesto Pasta");
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  run(await script(), h.window);
  h.timers.drain();
  assert.deepEqual(page.all, []);
  assert.ok(h.info.includes(`[fitaf-handoff] stopped: two meals share a key: ${refKey("Chicken Pesto Pasta")}`), JSON.stringify(h.info));
});
