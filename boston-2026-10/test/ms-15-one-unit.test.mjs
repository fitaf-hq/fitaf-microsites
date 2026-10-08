// MS-15 (SPEC-meal-selection.md § 9 item 1), the markup and the stylesheet: each goal button's calorie and protein facts
// are ONE block (`.facts`) holding both lines, calories first, with one background (the token of today's fact chips,
// `--ice`), and no per-fact background or tile; each line is kept whole (`white-space: nowrap`). The words are unchanged.
// That "25–35 g protein" sits on one line at 390 and the three blocks are one height is measured in Chrome
// (tools/storybook/test/ms-chrome.test.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { PLANS } from "./cc-harness.mjs";
import { pageOf } from "./ms-harness.mjs";
import { devPage } from "./dev-page.mjs";

const css = (html) => [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
/** Every rule whose selector list names `cls` as a class, with its declarations. */
const rulesFor = (sheet, cls) =>
  [...sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, sel]) => new RegExp(`\\.${cls}(?![\\w-])`).test(sel))
    .map(([, sel, body]) => ({ sel: sel.trim(), body }));

for (const [label, read] of [["production", () => pageOf()], ["development", () => devPage()]]) {
  test(`MS-15 (${label}): each goal button has one facts block holding both lines, calories first, the words unchanged`, async () => {
    const html = await read();
    const { document } = parseHTML(html);
    const goals = [...document.querySelectorAll(".goals [data-goal]")];
    assert.equal(goals.length, PLANS.individual.length, "fixture control: the goal buttons");
    for (const [i, button] of goals.entries()) {
      const plan = PLANS.individual[i];
      const blocks = button.querySelectorAll(".facts");
      assert.equal(blocks.length, 1, `${plan.id}: one facts block`);
      const lines = [...blocks[0].children].map((c) => c.textContent);
      assert.deepEqual(lines, [`${plan.calories.min}–${plan.calories.max} cal`, `${plan.protein_g.min}–${plan.protein_g.max} g protein`], `${plan.id}: both lines, calories first`);
      assert.equal(button.querySelectorAll(".fact").length, 0, `${plan.id}: no per-fact tile`);
    }
  });

  test(`MS-15 (${label}): one background on the block, none on a line; each line kept whole`, async () => {
    const sheet = css(await read());
    assert.equal(rulesFor(sheet, "fact").length, 0, "no .fact rule (the per-fact tile) is left");
    const block = rulesFor(sheet, "facts").map((r) => r.body).join(";");
    assert.match(block, /background:\s*var\(--ice\)/, "the block's one background is today's fact token");
    const line = rulesFor(sheet, "fact-line").map((r) => r.body).join(";");
    assert.match(line, /white-space:\s*nowrap/, "a line never breaks inside");
    assert.doesNotMatch(line, /background/, "a line has no background of its own");
  });
}
