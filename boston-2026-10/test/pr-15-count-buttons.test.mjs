// PR-15 (SPEC-plan-page-refinement § 8 item 4): the meal-count buttons: the numeral first, then "meals/week" (small caps
// at body weight, faked: uppercase, smaller), then the meals line; centred, as the goal buttons.
import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { renderPage } from "../build.mjs";
import { PLANS } from "./cc-harness.mjs";

const rule = (css, selector) => new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";

test("PR-15: numeral, then meals/week, then the meals line; centred; the unit uppercase at body weight", async () => {
  const html = await renderPage(PLANS);
  const { document } = parseHTML(html);
  for (const b of document.querySelectorAll(".counts [data-count]")) {
    const parts = [...b.children].map((c) => c.className);
    assert.deepEqual(parts, ["count-n", "count-unit", "choice-line"], `${b.getAttribute("data-count")}: the order`);
  }
  const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  assert.match(rule(css, ".goals .choice, .counts .choice"), /text-align:\s*center/, "centred, as the goal buttons");
  assert.match(rule(css, ".count-unit"), /text-transform:\s*uppercase/, "small caps, faked");
  assert.match(rule(css, ".count-unit"), /font:\s*400\b/, "at body weight");
});
