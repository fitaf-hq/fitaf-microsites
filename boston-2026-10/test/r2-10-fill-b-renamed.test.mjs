// R2-10: fill B with one meal renamed on the page (the mutant fixture of SPEC-rung2 § 5): refused, ZERO presses —
// every meal is looked for before the first press. The wait is bounded: 200 ms polls for at most 10 s. The stop names
// the KEY the link carries (§ 11 item 3), since a payload version 2 link carries no names.
import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCheckedOut,
  assertRefused,
  fakeWindow,
  fragmentFor,
  MAX_WAIT_MS,
  MEALS,
  orderPage,
  POLL_MS,
  refKey,
  run,
  script,
  assertPollsAndPresses,
} from "./r2-harness.mjs";

const COUNTS = [1, 2, 4]; // 7 of mpid 21's 7
const PAYLOAD = { mpid: 21, items: MEALS.map((name, i) => ({ name, qty: COUNTS[i] })) };

function rename(document, from, to) {
  const title = [...document.querySelectorAll(".product__content-title")].find(
    (el) => el.textContent.replace(/\s+/g, " ").trim() === from,
  );
  title.textContent = to;
}

async function runOn(page) {
  const h = fakeWindow({ fragment: fragmentFor(PAYLOAD), page });
  run(await script(), h.window);
  h.timers.drain();
  return h;
}

test("R2-10 control: on the unrenamed fixture the same payload presses every meal", async () => {
  const page = await orderPage();
  const h = await runOn(page);
  assert.equal(page.total(), 7);
  assertCheckedOut(h, page, "/order?mpid=21");
});

test("R2-10a: one meal renamed — refused, zero presses, the wait bounded to 10 s", async () => {
  const page = await orderPage();
  rename(page.document, "Chicken Pesto Pasta", "Chicken Pesto Pasta (new recipe)");
  const h = await runOn(page);
  assert.equal(page.total(), 0, "nothing pressed, not even the meals that were found");
  assertRefused(h, "/order?mpid=21", new RegExp(`stopped: not on this page: ${refKey("Chicken Pesto Pasta")}$`));
  assertPollsAndPresses(h.timers.delays, page.log.length, "fill C:");
  assert.ok(h.timers.delays.length * POLL_MS <= MAX_WAIT_MS, `waited ${h.timers.delays.length} polls`);
});

test("R2-10b: a meal found but without its Add to Cart button — refused, zero presses", async () => {
  const page = await orderPage();
  const card = [...page.document.querySelectorAll("app-product-card")].at(-1);
  card.querySelector(".product__actions").innerHTML = '<button type="button">Sold out</button>';
  const h = await runOn(page);
  assert.equal(page.total(), 0);
  assertRefused(h, "/order?mpid=21", new RegExp(`stopped: not on this page: ${refKey("Jalapeño Lime Chicken")}$`));
});

test("R2-10c: two meals missing — the stop names both keys, in the link's order", async () => {
  const page = await orderPage();
  rename(page.document, "Birria de Res Bowl", "Birria de Res Bowl (new recipe)");
  rename(page.document, "Jalapeño Lime Chicken", "Jalapeño Lime Chicken (new recipe)");
  const h = await runOn(page);
  assert.equal(page.total(), 0);
  const keys = [refKey("Birria de Res Bowl"), refKey("Jalapeño Lime Chicken")];
  assertRefused(h, "/order?mpid=21", new RegExp(`stopped: not on this page: ${keys.join(",")}$`));
});
