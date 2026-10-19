import test from "node:test";
import assert from "node:assert/strict";
import { renderPage } from "../build.mjs";
import { isSameOrigin, loadedUrls, loadPlans } from "./helpers.mjs";
import { assertPageBudget } from "./page-budget.mjs";

// The branding pass self-hosts the fonts and the logo: the page loads them from its OWN origin
// (relative paths), which is still no request to another host.
// Amended, not removed, by SPEC-analytics.md § 4: the page may contain exactly one sendBeacon, and its URL is /a (the
// page's own origin); still no fetch, no XMLHttpRequest, no script or stylesheet src, no other host. A1 reads the same
// rule on every page the builds write. The 60 KB budget is the page gzip-compressed (SPEC.md § 1's note of 2026-10-18;
// test/page-budget.mjs, its one definition), the raw size printed.
test("T5: the built HTML makes no external requests", async (t) => {
  const html = await renderPage(await loadPlans());
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=/i, "no <script src>");
  assert.doesNotMatch(html, /<link\b/i, "no <link> of any kind");
  assert.doesNotMatch(html, /\bfetch\s*\(/, "no fetch(");
  assert.doesNotMatch(html, /XMLHttpRequest|@import|<iframe\b/i);
  assert.equal([...html.matchAll(/sendBeacon/g)].length, 1, "exactly one sendBeacon");
  assert.match(html, /\bnavigator\.sendBeacon\(\s*(["'])\/a\1\s*,/, "its URL is /a");
  const urls = loadedUrls(html);
  assert.ok(urls.length > 0, "the extractor sees the page's fonts and logo");
  for (const url of urls) assert.ok(isSameOrigin(url), `must be same-origin or data:, got ${url}`);
  assertPageBudget(html, "T5, the production page", t);
});
