// PR-9 (SPEC-plan-page-refinement § 2 item 7, § 5): the footnote, "Prices as of 2026-09-27.": the phrase is
// data/messages.json's (a placeholder for the Owner or legal), the date data/plans.json's own read date.
// ⚠ AMENDED by SPEC-ui-and-copy-pass § 2 item 5 (2026-10-25): every price re-read on the store that day, unchanged, so the
// read date is 2026-10-25 (UQ5 holds the file otherwise unchanged).
import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { renderPage } from "../build.mjs";
import { MESSAGES, PLANS } from "./cc-harness.mjs";

test("PR-9: the footnote reads \"Prices as of 2026-10-25.\"", async () => {
  const { document } = parseHTML(await renderPage(PLANS));
  // Updated (§ 8 item 7): the foot also holds See all plans, so the footnote is read from its own element.
  assert.equal(document.querySelector("footer.foot .footnote").textContent.trim(), "Prices as of 2026-10-25.");
  assert.equal(MESSAGES.plan_page.prices_as_of.replace("{date}", PLANS.read_on), "Prices as of 2026-10-25.", "data's phrase and date");
});
