import test from "node:test";
import assert from "node:assert/strict";
import { renderPage } from "../build.mjs";
import { loadPlans } from "./helpers.mjs";

test("T5: the built HTML makes no external requests", async () => {
  const html = await renderPage(await loadPlans());
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=/i, "no <script src>");
  assert.doesNotMatch(html, /<link\b/i, "no <link> of any kind");
  assert.doesNotMatch(html, /\bfetch\s*\(/, "no fetch(");
  assert.doesNotMatch(html, /XMLHttpRequest|sendBeacon|@import|<img\b|<iframe\b/i);
  for (const m of html.matchAll(/url\(\s*["']?([^"')]+)/g)) {
    assert.ok(m[1].startsWith("data:"), `CSS url() must be a data: URI, got ${m[1]}`);
  }
  assert.ok(Buffer.byteLength(html) < 60 * 1024, "under the 60 KB budget");
});
