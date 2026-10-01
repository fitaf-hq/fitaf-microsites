// PR-13 (SPEC-plan-page-refinement § 8 item 2), as written: the top is one element, the carousel with the logo over it,
// and no separate header. Its width (the viewport's, at 390 and 1280) is measured in Chrome: tools/storybook's
// pr-chrome case. Without photographs the logo stays, on its plate, alone.
import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { renderPage } from "../build.mjs";
import { PLANS } from "./cc-harness.mjs";
import { photoPage } from "./pr-harness.mjs";

test("PR-13: the logo is inside the top element with the carousel; no separate header", async () => {
  const { document } = parseHTML(await photoPage("prod"));
  const top = document.getElementById("top");
  assert.ok(top?.querySelector("#carousel"), "the carousel is the top");
  assert.ok(top.querySelector('.logo-plate img[alt="Fit AF"]'), "the logo on its plate, in it");
  assert.equal(document.querySelectorAll("header, .site-head").length, 0, "no separate header");
  assert.ok(!top.closest(".wrap"), "not inside the page's column");
  const bare = parseHTML(await renderPage(PLANS, undefined, null, undefined, { base: null })).document;
  assert.ok(bare.querySelector('#top .logo-plate img[alt="Fit AF"]') && !bare.getElementById("carousel"), "no photographs: the logo alone");
});
