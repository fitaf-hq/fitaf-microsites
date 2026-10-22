import test from "node:test";
import assert from "node:assert/strict";
import { renderPage } from "../build.mjs";
import { assertOneWhyFrame, isSameOrigin, loadedUrls, loadPlans } from "./helpers.mjs";
import { assertPageBudget } from "./page-budget.mjs";

// The branding pass self-hosts the fonts and the logo: the page loads them from its OWN origin
// (relative paths), which is still no request to another host.
// Amended, not removed, by SPEC-analytics.md § 4: the page may contain exactly one sendBeacon, and its URL is /a (the
// page's own origin); still no fetch, no XMLHttpRequest, no script or stylesheet src, no other host. A1 reads the same
// rule on every page the builds write. The 60 KB budget is the page gzip-compressed (SPEC.md § 1's note of 2026-10-18;
// test/page-budget.mjs, its one definition), the raw size printed.
// Amended, not removed, by SPEC-why-fit-af.md § 2 item 2: the page may hold exactly one <iframe>, the /why/ page's frame,
// its src same-origin (helpers.mjs assertOneWhyFrame; loadedUrls reads it, so the same-origin check below covers it).
// Amended for production, once and by name, by SPEC-save-offer-production.md § 3 item 3: with data/save.json's
// `production` TRUE the production page may load exactly one third-party script, Turnstile's (build.mjs
// TURNSTILE_SCRIPT_URL), and make one request, Flow 1's POST to its own origin's /api/save; every other rule here stands.
// SP5 holds that page to it. With `production` false (as committed) the page is the one below, and this case stands as
// written: no script src and no fetch.
test("T5: the built HTML makes no external requests", async (t) => {
  const html = await renderPage(await loadPlans());
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=/i, "no <script src>");
  assert.doesNotMatch(html, /<link\b/i, "no <link> of any kind");
  assert.doesNotMatch(html, /\bfetch\s*\(/, "no fetch(");
  assert.doesNotMatch(html, /XMLHttpRequest|@import/i);
  assertOneWhyFrame(html, "T5");
  assert.equal([...html.matchAll(/sendBeacon/g)].length, 1, "exactly one sendBeacon");
  assert.match(html, /\bnavigator\.sendBeacon\(\s*(["'])\/a\1\s*,/, "its URL is /a");
  const urls = loadedUrls(html);
  assert.ok(urls.length > 0, "the extractor sees the page's fonts and logo");
  for (const url of urls) assert.ok(isSameOrigin(url), `must be same-origin or data:, got ${url}`);
  assertPageBudget(html, "T5, the production page", t);
});
