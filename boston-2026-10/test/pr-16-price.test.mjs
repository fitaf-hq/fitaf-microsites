// PR-16 (SPEC-plan-page-refinement § 8 item 5), as written: no result-card title; the two figures in one block, no
// label beside them. The order, the sizes and that the block is not tinted are measured in Chrome (tools/storybook's
// pr-chrome case).
// ⚠ AMENDED by SPEC-ui-and-copy-pass § 7 (2026-10-26, the Advisor: "Let's do B2 and drop the meal count please"): the
// block's two lines are the weekly total before the offer's share, struck through (#result-struck, shown only while an
// offer with a share is current), and the weekly total (#result-total); the price a meal and the meals a week are gone.
import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { renderPage } from "../build.mjs";
import { PLANS } from "./cc-harness.mjs";

test("PR-16: no result-card title; one price block holding the struck line and the total, nothing else; no dt label", async () => {
  const { document } = parseHTML(await renderPage(PLANS));
  const result = document.getElementById("result");
  assert.equal(result.querySelectorAll(".result-title, #result-title").length, 0, "no title");
  const total = document.getElementById("result-total");
  const struck = document.getElementById("result-struck");
  assert.ok(total && total.closest(".price") && total.closest(".price") === struck?.closest(".price"), "one block");
  assert.deepEqual([...total.closest(".price").children].map((n) => n.className), ["fig-struck", "fig-total"], "the struck line, then the total");
  assert.equal(result.querySelectorAll("dt, .figures").length, 0, "no label, no second box");
});
