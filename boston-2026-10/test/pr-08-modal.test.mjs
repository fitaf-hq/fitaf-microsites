// PR-8 (SPEC-plan-page-refinement § 2 item 6, § 5): the modal, as the page is written. "See all plans" is a plain text
// link (a button: it opens, it goes nowhere) naming a <dialog> that holds the 3 × 2 grid and a close button; the grid's
// links are unchanged, seven order links in the page (T2). Opening, Esc, the backdrop and focus run in Chrome:
// tools/storybook's pr-6-8 case.
import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { renderPage } from "../build.mjs";
import { hrefs } from "./helpers.mjs";
import { PLANS } from "./cc-harness.mjs";

test("PR-8: the link names a dialog holding the grid and a close button; the seven order links unchanged", async () => {
  const html = await renderPage(PLANS);
  const { document } = parseHTML(html);
  const link = document.getElementById("all-link");
  const dialog = document.getElementById("all");
  assert.equal(link?.tagName.toLowerCase(), "button", "a control, not a link that goes anywhere");
  assert.equal(link.getAttribute("aria-controls"), "all");
  assert.equal(dialog?.tagName.toLowerCase(), "dialog", "the grid is in a dialog");
  assert.equal(dialog.querySelectorAll("a.cell").length, 6, "the 3 × 2 grid");
  assert.ok(dialog.querySelector("button#all-close"), "a close button");
  assert.equal(hrefs(html).length, 7, "seven order links (T2)");
});
