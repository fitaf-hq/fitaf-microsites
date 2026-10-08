// W21 (SPEC-snacks-in-the-cart § 6): the smoke with a link carrying snacks, on recorded outcomes (no browser, no store).
// `--link`'s choice reads the snack items (a leading "_") against the menu as it reads meals, apart from them: the meals
// are the plan's (their count is the `need` the smoke checks), the snacks beside it. The pass rule (W6) then expects every
// snack listed on /checkout by name and priced into its total, and still "<need> items" for the meals; a snack missing, or
// a total without the snacks, fails, saying why. A link without snacks reads exactly as before (no snacks, W6 unchanged).
import test from "node:test";
import assert from "node:assert/strict";
import * as smoke from "../lib/smoke.mjs";
import { siteCode } from "../lib/site-code.mjs";
import { DONE_LINE, smokeVerdict } from "../lib/smoke-verdict.mjs";

const MENU = [
  { name: "Meal One", priceCents: 1200 },
  { name: "Meal Two", priceCents: 1200 },
  { name: "Smart Oats: Almond Joy", priceCents: 400, snack: true },
  { name: "🟠NEW: Caramel Apple ProNuts", priceCents: 700, snack: true },
];

test("W21a: --link with snacks — the meals chosen as before, the snacks apart, each as many times as the link says", async () => {
  const code = await siteCode();
  const args = ["--mpid", "21", "--item", "Meal One:5", "--item", "Meal Two:2", "--snack", "Smart Oats: Almond Joy:2", "--snack", "🟠NEW: Caramel Apple ProNuts:1"];
  const href = code.handoffLink(code.plans, code.payloadFromArgs(args, code.counts));
  assert.match(href, /\._[0-9a-z]{5}\*2\._[0-9a-z]{5}$/, "control: the link carries two snack items last");
  const choice = smoke.linkChoice(href, MENU, code);
  assert.deepEqual(choice.chosen.map((c) => c.name), [...Array(5).fill("Meal One"), "Meal Two", "Meal Two"]);
  assert.deepEqual(choice.snacks.map((c) => c.name), ["Smart Oats: Almond Joy", "Smart Oats: Almond Joy", "🟠NEW: Caramel Apple ProNuts"]);
  assert.throws(() => smoke.linkChoice(href, MENU.slice(0, 3), code), /a snack not on the menu/);
  const plain = smoke.linkChoice(code.handoffLink(code.plans, code.payloadFromArgs(args.slice(0, 6), code.counts)), MENU, code);
  assert.deepEqual(plain.snacks, [], "a link without snacks: none");
});

const passing = () => ({
  need: 7,
  chosen: [...Array(5).fill({ name: "Meal One", priceCents: 1200 }), ...Array(2).fill({ name: "Meal Two", priceCents: 1200 })],
  snacks: [{ name: "Smart Oats: Almond Joy", priceCents: 400 }, { name: "Smart Oats: Almond Joy", priceCents: 400 }],
  console: ["[fitaf-handoff] fill C, mpid 21", DONE_LINE],
  checkout: { path: "/checkout", names: ["Meal One", "Meal Two", "Smart Oats: Almond Joy"], itemCounts: [7, 9], totalCents: 7 * 1200 + 2 * 400 },
});

test("W21b: the snacks listed and priced into the total, the plan's 7 items: pass", () => {
  assert.deepEqual(smokeVerdict(passing()), { pass: true, reasons: [] });
});

test("W21b: a snack not listed on /checkout: fail, naming it", () => {
  const o = passing();
  o.checkout.names = ["Meal One", "Meal Two"];
  const v = smokeVerdict(o);
  assert.equal(v.pass, false);
  assert.ok(v.reasons.some((r) => r.includes("chosen but not listed") && r.includes("Smart Oats: Almond Joy")), v.reasons.join("; "));
});

test("W21b: a total without the snacks: fail, with both amounts", () => {
  const o = passing();
  o.checkout.totalCents = 7 * 1200;
  const v = smokeVerdict(o);
  assert.equal(v.pass, false);
  assert.ok(v.reasons.some((r) => r.includes("$84.00") && r.includes("$92.00")), v.reasons.join("; "));
});

test("W21b: the snacks are never the plan's meals: 7 meals short by a snack's units still fails the count", () => {
  const o = passing();
  o.chosen = o.chosen.slice(0, 5);
  const v = smokeVerdict(o);
  assert.ok(v.reasons.some((r) => r.startsWith("only 5 of 7 meals")), v.reasons.join("; "));
});
