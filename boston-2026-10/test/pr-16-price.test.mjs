// PR-16 (SPEC-plan-page-refinement § 8 item 5), as written: no result-card title; the two figures in one block, no
// label beside them. The order, the sizes and that the block is not tinted are measured in Chrome (tools/storybook's
// pr-chrome case).
import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { renderPage } from "../build.mjs";
import { PLANS } from "./cc-harness.mjs";

test("PR-16: no result-card title; one price block holding both figures; no dt label", async () => {
  const { document } = parseHTML(await renderPage(PLANS));
  const result = document.getElementById("result");
  assert.equal(result.querySelectorAll(".result-title, #result-title").length, 0, "no title");
  const total = document.getElementById("result-total");
  assert.ok(total && total.closest(".price") && total.closest(".price") === document.getElementById("result-per-meal")?.closest(".price"), "one block");
  assert.equal(result.querySelectorAll("dt, .figures").length, 0, "no label, no second box");
});
