import test from "node:test";
import assert from "node:assert/strict";
import { renderPage } from "../build.mjs";
import { isSameOrigin, loadedUrls, loadPlans } from "./helpers.mjs";

// The branding pass self-hosts the fonts and the logo: the page loads them from its OWN origin
// (relative paths), which is still no request to another host.
test("T5: the built HTML makes no external requests", async () => {
  const html = await renderPage(await loadPlans());
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=/i, "no <script src>");
  assert.doesNotMatch(html, /<link\b/i, "no <link> of any kind");
  assert.doesNotMatch(html, /\bfetch\s*\(/, "no fetch(");
  assert.doesNotMatch(html, /XMLHttpRequest|sendBeacon|@import|<iframe\b/i);
  const urls = loadedUrls(html);
  assert.ok(urls.length > 0, "the extractor sees the page's fonts and logo");
  for (const url of urls) assert.ok(isSameOrigin(url), `must be same-origin or data:, got ${url}`);
  assert.ok(Buffer.byteLength(html) < 60 * 1024, "under the 60 KB budget");
});
