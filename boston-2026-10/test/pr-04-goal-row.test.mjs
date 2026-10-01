// PR-4 (SPEC-plan-page-refinement § 2 item 2, § 5): the goals, one row. Three choices, each its name and its calorie
// and protein ranges and no promise line; the stylesheet sets three columns at every width (Chrome at 390 and 1280:
// tools/storybook's pr-6-8 case).
import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { renderPage } from "../build.mjs";
import { PLANS } from "./cc-harness.mjs";

test("PR-4: three choices in one row, no promise line, the ranges present", async () => {
  const html = await renderPage(PLANS);
  const { document } = parseHTML(html);
  const goals = [...document.querySelectorAll(".goals [data-goal]")];
  assert.deepEqual(goals.map((g) => g.getAttribute("data-goal")), PLANS.individual.map((p) => p.id), "three choices");
  goals.forEach((g, i) => {
    const p = PLANS.individual[i];
    const text = g.textContent.replace(/\s+/g, " ");
    assert.ok(text.includes(`${p.calories.min}–${p.calories.max} cal`) && text.includes(`${p.protein_g.min}–${p.protein_g.max} g protein`), `${p.id}: the ranges`);
    assert.ok(!text.includes(p.promise), `${p.id}: no promise line`);
  });
  const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  const columns = [...css.matchAll(/\.goals\s*\{[^}]*grid-template-columns:\s*([^;}]+)/g)].map((m) => m[1].trim());
  assert.deepEqual(columns, ["repeat(3, 1fr)"], "one rule sets the goals' columns, three, under no media query");
});
