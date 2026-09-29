// W6 (SPEC-storefront-watch § 4, § 6): the smoke test's pass rule, on recorded outcomes. Pass: the console shows
// `[fitaf-handoff] done: /checkout`; /checkout lists exactly the 7 chosen names and "7 items"; its total is 7 × the
// line price the order page showed. A missing name, a wrong total, a `stopped:` line: each a fail, each saying why.
import test from "node:test";
import assert from "node:assert/strict";
import { DONE_LINE, smokeVerdict } from "../lib/smoke-verdict.mjs";

const NAMES = ["Meal One", "Meal Two", "Meal Three", "Meal Four", "Meal Five", "Meal Six", "Meal Seven"];

/** A recorded outcome that passes: the shape the smoke records at each width. */
const passing = () => ({
  need: 7,
  chosen: NAMES.map((name) => ({ name, priceCents: 1250 })),
  console: ["[fitaf-handoff] fill B, mpid 21", DONE_LINE],
  checkout: { path: "/checkout", names: [...NAMES].reverse(), itemCounts: [7], totalCents: 8750 },
});

test("W6: done, exactly the chosen names, 7 items and 7 × the line price: pass", () => {
  assert.deepEqual(smokeVerdict(passing()), { pass: true, reasons: [] });
});

test("W6: a chosen name missing from /checkout: fail, naming it", () => {
  const o = passing();
  o.checkout.names = NAMES.filter((n) => n !== "Meal Four");
  const v = smokeVerdict(o);
  assert.equal(v.pass, false);
  assert.ok(v.reasons.some((r) => r.includes("Meal Four")), v.reasons.join("; "));
});

test("W6: a wrong total: fail, with both amounts", () => {
  const o = passing();
  o.checkout.totalCents = 8625;
  const v = smokeVerdict(o);
  assert.equal(v.pass, false);
  const why = v.reasons.join("; ");
  assert.ok(why.includes("$86.25") && why.includes("$87.50"), why);
});

test("W6: a `stopped:` line: fail, quoting it", () => {
  const o = passing();
  o.console = ["[fitaf-handoff] fill B, mpid 21", "[fitaf-handoff] stopped: no checkout control"];
  o.checkout = { path: "/order", names: [], itemCounts: [], totalCents: null };
  const v = smokeVerdict(o);
  assert.equal(v.pass, false);
  assert.ok(v.reasons.some((r) => r.includes("stopped: no checkout control")), v.reasons.join("; "));
});

test("W6: a `stopped:` line fails even beside a done line", () => {
  const o = passing();
  o.console.push("[fitaf-handoff] stopped: /checkout not reached");
  assert.equal(smokeVerdict(o).pass, false);
});

test("W6: a name on /checkout that was not chosen: fail (exactly the chosen names)", () => {
  const o = passing();
  o.checkout.names.push("Meal Eight");
  const v = smokeVerdict(o);
  assert.equal(v.pass, false);
  assert.ok(v.reasons.some((r) => r.includes("Meal Eight")));
});

test("W6: no \"7 items\" on /checkout: fail", () => {
  const o = passing();
  o.checkout.itemCounts = [6];
  assert.equal(smokeVerdict(o).pass, false);
});

test("W6: fewer than 7 meals could be chosen from the page: fail", () => {
  const o = passing();
  o.chosen = o.chosen.slice(0, 5);
  const v = smokeVerdict(o);
  assert.equal(v.pass, false);
  assert.ok(v.reasons.some((r) => /5 of 7/.test(r)), v.reasons.join("; "));
});

test("W6: a chosen meal whose price the page did not show: fail, never a guessed total", () => {
  const o = passing();
  o.chosen[2].priceCents = null;
  assert.equal(smokeVerdict(o).pass, false);
});
