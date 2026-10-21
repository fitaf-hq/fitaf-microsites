// A1 (SPEC-analytics.md § 4, § 7): T5 amended, not removed. The built page (`npm run build`, and every page `npm run
// build:dev` writes) contains exactly one `sendBeacon`, its URL `/a`, and nothing else T5 forbids: no `fetch(`, no
// XMLHttpRequest, no script or stylesheet `src` (the development page's one Turnstile script excepted, as S18 has always
// allowed it), no other host; and each page is still under SPEC.md § 1's 60 KB budget, which since the orchestrator's
// ruling of 2026-10-18 (SPEC.md § 1's note) is the page gzip-compressed, the raw size printed (test/page-budget.mjs,
// its one definition). Since SPEC-why-fit-af.md § 2 item 2, T5 also allows exactly one <iframe>, the /why/ page's frame,
// its src same-origin (helpers.mjs assertOneWhyFrame).
import test from "node:test";
import assert from "node:assert/strict";
import { DEV_ASSET_PREFIX, TURNSTILE_SCRIPT_URL } from "../build.mjs";
import { builtPage, devPages } from "./a-harness.mjs";
import { assertOneWhyFrame, isSameOrigin, loadedUrls } from "./helpers.mjs";
import { assertPageBudget } from "./page-budget.mjs";

/** One sendBeacon, its first argument the string "/a". */
function assertOneBeacon(html, where) {
  const all = [...html.matchAll(/sendBeacon/g)];
  assert.equal(all.length, 1, `${where}: exactly one sendBeacon (found ${all.length})`);
  assert.match(html, /\bnavigator\.sendBeacon\(\s*(["'])\/a\1\s*,/, `${where}: navigator.sendBeacon("/a", …)`);
}

test("A1: the production build has exactly one sendBeacon, to /a, and nothing else T5 forbids", async (t) => {
  const html = await builtPage();
  assertOneBeacon(html, "production");
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=/i, "no <script src>");
  assert.doesNotMatch(html, /<link\b/i, "no <link> of any kind");
  assert.doesNotMatch(html, /\bfetch\s*\(/, "no fetch(");
  assert.doesNotMatch(html, /XMLHttpRequest|@import|WebSocket|EventSource/i);
  assertOneWhyFrame(html, "production"); // T5 as SPEC-why-fit-af § 2 item 2 amends it
  const urls = loadedUrls(html);
  assert.ok(urls.length > 0, "control: the extractor sees the page's fonts and logo");
  for (const url of urls) assert.ok(isSameOrigin(url), `same-origin or data:, got ${url}`);
  assertPageBudget(html, "A1, production /index.html", t);
});

test("A1: every development page has exactly one sendBeacon, to /a; its only script src is Turnstile's", async (t) => {
  const pages = await devPages();
  assert.ok(pages.length >= 2, "control: the dev build writes its index and a page per event");
  for (const { path, html } of pages) {
    assertOneBeacon(html, path);
    const srcs = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(srcs, [TURNSTILE_SCRIPT_URL], `${path}: Turnstile's script alone`);
    assert.doesNotMatch(html, /<link\b|XMLHttpRequest|@import|WebSocket|EventSource/i, path);
    assertOneWhyFrame(html, path, DEV_ASSET_PREFIX); // T5 as SPEC-why-fit-af § 2 item 2 amends it
    for (const url of loadedUrls(html)) assert.ok(isSameOrigin(url), `${path}: same-origin only, got ${url}`);
    assertPageBudget(html, `A1, development ${path}`, t);
  }
});
