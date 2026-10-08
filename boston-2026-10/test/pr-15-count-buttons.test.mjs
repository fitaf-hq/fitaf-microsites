// PR-15 (SPEC-plan-page-refinement § 8 item 4): the meal-count buttons: the numeral first, then "meals/week" (small caps
// at body weight, faked: uppercase, smaller), then the meals line; centred, as the goal buttons.
// Updated (SPEC-meal-selection § 9 item 2, ruled "Words only": "these numbers change whether or not weekends are
// included"): the numeral and its unit are gone. Every answer of the four questions is its words alone, in the count
// buttons' style: centred, as the goal buttons, the check above.
import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { renderPage } from "../build.mjs";
import { PLANS } from "./cc-harness.mjs";

const rule = (css, selector) => new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";

test("PR-15: each answer is its words alone, centred as the goal buttons; no numeral and no unit are left", async () => {
  const html = await renderPage(PLANS);
  const { document } = parseHTML(html);
  const answers = [...document.querySelectorAll(".counts [data-q]")];
  assert.equal(answers.length, 8, "four questions, two answers each");
  for (const b of answers) {
    assert.deepEqual([...b.children].map((c) => c.className), ["choice-name"], `${b.getAttribute("data-q")} ${b.getAttribute("data-a")}: its words alone`);
  }
  const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  assert.match(rule(css, ".goals .choice, .counts .choice"), /text-align:\s*center/, "centred, as the goal buttons");
  assert.equal(rule(css, ".count-n") + rule(css, ".count-unit"), "", "the numeral's and the unit's rules are gone");
});
