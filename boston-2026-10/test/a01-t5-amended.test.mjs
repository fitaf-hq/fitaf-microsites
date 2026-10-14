// A1 (SPEC-analytics.md § 4, § 7): T5 amended, not removed. The built page (`npm run build`, and every page `npm run
// build:dev` writes) contains exactly one `sendBeacon`, its URL `/a`, and nothing else T5 forbids: no `fetch(`, no
// XMLHttpRequest, no script or stylesheet `src` (the development page's one Turnstile script excepted, as S18 has always
// allowed it), no other host; and each page is still under T5's 60 KB budget.
import test from "node:test";
import assert from "node:assert/strict";
import { TURNSTILE_SCRIPT_URL } from "../build.mjs";
import { builtPage, devPages } from "./a-harness.mjs";
import { isSameOrigin, loadedUrls } from "./helpers.mjs";

const BUDGET_BYTES = 60 * 1024;

/** One sendBeacon, its first argument the string "/a". */
function assertOneBeacon(html, where) {
  const all = [...html.matchAll(/sendBeacon/g)];
  assert.equal(all.length, 1, `${where}: exactly one sendBeacon (found ${all.length})`);
  assert.match(html, /\bnavigator\.sendBeacon\(\s*(["'])\/a\1\s*,/, `${where}: navigator.sendBeacon("/a", …)`);
}

test("A1: the production build has exactly one sendBeacon, to /a, and nothing else T5 forbids", async () => {
  const html = await builtPage();
  assertOneBeacon(html, "production");
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=/i, "no <script src>");
  assert.doesNotMatch(html, /<link\b/i, "no <link> of any kind");
  assert.doesNotMatch(html, /\bfetch\s*\(/, "no fetch(");
  assert.doesNotMatch(html, /XMLHttpRequest|@import|<iframe\b|WebSocket|EventSource/i);
  const urls = loadedUrls(html);
  assert.ok(urls.length > 0, "control: the extractor sees the page's fonts and logo");
  for (const url of urls) assert.ok(isSameOrigin(url), `same-origin or data:, got ${url}`);
  assert.ok(Buffer.byteLength(html) < BUDGET_BYTES, `under the 60 KB budget (${Buffer.byteLength(html)} bytes)`);
});

test("A1: every development page has exactly one sendBeacon, to /a; its only script src is Turnstile's", async () => {
  const pages = await devPages();
  assert.ok(pages.length >= 2, "control: the dev build writes its index and a page per event");
  for (const { path, html } of pages) {
    assertOneBeacon(html, path);
    const srcs = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(srcs, [TURNSTILE_SCRIPT_URL], `${path}: Turnstile's script alone`);
    assert.doesNotMatch(html, /<link\b|XMLHttpRequest|@import|<iframe\b|WebSocket|EventSource/i, path);
    for (const url of loadedUrls(html)) assert.ok(isSameOrigin(url), `${path}: same-origin only, got ${url}`);
    assert.ok(Buffer.byteLength(html) < BUDGET_BYTES, `${path}: under the 60 KB budget, as S18's dev T5 reads it (${Buffer.byteLength(html)} bytes)`);
  }
});
