// PR-14 (SPEC-plan-page-refinement § 8 item 3), as written: no step numbers; the centring is measured in Chrome
// (tools/storybook's pr-chrome case).
import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { renderPage } from "../build.mjs";
import { PLANS } from "./cc-harness.mjs";

test("PR-14: no step number", async () => {
  const { document } = parseHTML(await renderPage(PLANS));
  const headings = [...document.querySelectorAll(".step-label")].map((h) => h.textContent.trim());
  assert.deepEqual(headings, ["What's your goal?", "Which meals should we cover?"]);
  assert.equal(document.querySelectorAll(".step-num").length, 0);
});
