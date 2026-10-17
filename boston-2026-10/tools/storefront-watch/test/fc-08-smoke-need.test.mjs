// FC-8w (SPEC-rung2-fill-c § 8; its § 8.1, found at the build): the smoke's `need`, on recorded outcomes (no browser,
// no store). § 8 makes a link's meals one of its plan's ALLOWED TOTALS (5 on the 4 plan, 15 on the 14), so a link is no
// longer always its plan's count. The smoke's `need` (the meals it chooses, and the "<need> items" its pass rule, W6,
// expects on /checkout) is therefore a given link's own meals, and the plan's count only for a run without --link.
// § 8 item 6's smoke is exactly such a run: `--link <a 5-meal Chef's Choice link on Lean 4>`. The site's code gives the
// watch both tables: `counts` (the link tool's argument, the allowed totals) and `planCounts` (the plan's own count).
import test from "node:test";
import assert from "node:assert/strict";
import * as smoke from "../lib/smoke.mjs";
import { siteCode } from "../lib/site-code.mjs";
import { DONE_LINE, smokeVerdict } from "../lib/smoke-verdict.mjs";

const LEAN_4 = 20;
const LEAN_7 = 21;
const meals = (n) => Array.from({ length: n }, (_, i) => ["--item", `Meal ${i + 1}:1`]).flat();

test("FC-8w: the site's code gives the watch the allowed totals for links and the plan's own count for the probes", async () => {
  const code = await siteCode();
  assert.deepEqual(code.counts.get(LEAN_4), [4, 5], "the link tool's table: 4 takes 4 or 5");
  assert.deepEqual(code.counts.get(LEAN_7), [7]);
  assert.equal(code.planCounts.get(LEAN_4), 4, "the plan's own count");
  assert.equal(code.planCounts.get(LEAN_7), 7);
});

test("FC-8w: a given link's meals are its own — 5 on Lean 4 is 5; snacks and a code are not meals; no fragment, no count", async () => {
  const code = await siteCode();
  const five = code.handoffLink(code.plans, code.payloadFromArgs(["--mpid", String(LEAN_4), ...meals(5)], code.counts));
  assert.equal(smoke.linkMeals(five), 5);
  const counted = code.handoffLink(code.plans, code.payloadFromArgs(["--mpid", String(LEAN_4), "--item", "Meal 1:3", "--item", "Meal 2:2", "--snack", "Snack 1:2", "--code", "SPRING-10"], code.counts));
  assert.equal(smoke.linkMeals(counted), 5, "3 + 2 meals; the snack's 2 and the code are not counted");
  const seven = code.handoffLink(code.plans, code.payloadFromArgs(["--mpid", String(LEAN_7), ...meals(7)], code.counts));
  assert.equal(smoke.linkMeals(seven), 7, "a link of its plan's count: as before");
  assert.equal(smoke.linkMeals("https://fitafnutrition.com/order?mpid=20"), null);
});

const passing = (need, n) => ({
  need,
  chosen: Array.from({ length: n }, (_, i) => ({ name: `Meal ${i + 1}`, priceCents: 1300 })),
  console: [`[fitaf-handoff] fill C, mpid ${LEAN_4}`, DONE_LINE],
  checkout: { path: "/checkout", names: Array.from({ length: n }, (_, i) => `Meal ${i + 1}`), itemCounts: [n], totalCents: n * 1300 },
});

test("FC-8w: the pass rule with the link's need — /checkout saying 5 items passes; held to the plan's 4 it would fail", () => {
  const ok = smokeVerdict(passing(5, 5));
  const held = smokeVerdict(passing(4, 5));
  assert.equal(ok.pass, true, JSON.stringify(ok));
  assert.equal(held.pass, false, "control: the plan's count as `need` fails a store that took the fifth meal");
  assert.ok(held.reasons.some((r) => r === '/checkout does not say "4 items" (it says: 5 items)'), JSON.stringify(held.reasons));
});
