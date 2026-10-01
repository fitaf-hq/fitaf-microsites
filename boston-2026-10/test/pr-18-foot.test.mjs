// PR-18 (SPEC-plan-page-refinement § 8 item 7): See all plans and the footnote together in the foot, centred, no rule.
import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { renderPage } from "../build.mjs";
import { PLANS } from "./cc-harness.mjs";

test("PR-18: the foot holds See all plans and the footnote, centred, with no rule", async () => {
  const html = await renderPage(PLANS);
  const foot = parseHTML(html).document.querySelector("footer.foot");
  assert.ok(foot?.querySelector("#all-link") && foot.querySelector(".footnote"), "both in the foot");
  const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  const rules = [...css.matchAll(/(^|\})\s*([^{}]*\.foot\b[^{}]*)\{([^}]*)\}/g)].map((m) => m[3]);
  assert.ok(rules.length > 0, "control: the foot's rules were read");
  assert.ok(rules.every((r) => !/border/.test(r)), "no rule above it");
  assert.ok(rules.some((r) => /text-align:\s*center/.test(r)), "centred");
});
