// PR-12 (SPEC-plan-page-refinement § 8 item 1): the carousel has no dots; it still advances (PR-2).
import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { photoPage } from "./pr-harness.mjs";

test("PR-12: no dot element", async () => {
  const { document } = parseHTML(await photoPage("prod"));
  assert.equal(document.querySelectorAll("#carousel .slide").length, 5, "control: the carousel is on the page");
  assert.equal(document.querySelectorAll(".dots, .dot, #carousel button").length, 0, "no dot");
});
