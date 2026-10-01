// The signage slideshow's cases that need a browser (SPEC-slideshow.md § 2), here beside the plan page's (pr-chrome),
// because this package drives Chrome and the site never installs a driver. The slideshow is the mock-ups' own build
// (`buildMockups`, no PNGs), into a temporary directory, opened at 1920 × 1080 over 127.0.0.1:
//   SS-2, the button: with the legend hidden the Legend (L) toggle is not displayed; with it open, displayed;
//   SS-4, the dissolve: during the fade both slides are drawn and their opacities move; under reduced motion, none.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildMockups, MOCKUPS_DIR } from "../../../mockups/build-mockups.mjs";
import { freshChrome } from "./chrome.mjs";
import { serveStatic } from "./serve-static.mjs";
import { isLocal } from "./walk.mjs";

const TIMEOUT_MS = 120_000;
/** A moment after load before a case presses anything (the page at rest, well inside the first slide's 7 s). */
const SETTLE_MS = 300;
const out = await mkdtemp(join(tmpdir(), "fitaf-storybook-ss-"));
after(() => rm(out, { recursive: true, force: true }));
await buildMockups({ outDir: out, png: false, photosDir: join(MOCKUPS_DIR, "no-such-folder") });

async function withSlideshow({ reducedMotion = false } = {}, fn) {
  const server = await serveStatic(out);
  const chrome = await freshChrome();
  try {
    const page = await chrome.browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setRequestInterception(true);
    page.on("request", (r) => (isLocal(r.url()) ? r.continue() : r.abort()));
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: reducedMotion ? "reduce" : "no-preference" }]);
    await page.goto(`${server.base}/slideshow.html`, { waitUntil: "load" });
    await new Promise((r) => setTimeout(r, SETTLE_MS));
    return await fn(page);
  } finally {
    await chrome.close();
    await server.close();
  }
}

const toggleShown = (page) => page.$eval(".legend-toggle", (b) => getComputedStyle(b).display !== "none" && b.getClientRects().length > 0);
const legendOpen = (page) => page.evaluate(() => document.body.classList.contains("legend-open"));
/** Each slide's computed opacity and whether it is drawn at all. */
const slides = (page) =>
  page.$$eval(".slide", (all) => all.map((s) => ({ opacity: Number(getComputedStyle(s).opacity), drawn: getComputedStyle(s).visibility === "visible" && s.getClientRects().length > 0, duration: getComputedStyle(s).transitionDuration })));

test("SS-2: with the legend hidden the Legend (L) toggle is not displayed; with it open, displayed (Chrome)", { timeout: TIMEOUT_MS }, async () => {
  await withSlideshow({}, async (page) => {
    assert.deepEqual([await legendOpen(page), await toggleShown(page)], [true, true], "1920 wide: the legend opens, its toggle shows");
    await page.keyboard.press("l");
    assert.deepEqual([await legendOpen(page), await toggleShown(page)], [false, false], "L hides the legend, and the toggle with it");
    await page.keyboard.press("l");
    assert.deepEqual([await legendOpen(page), await toggleShown(page)], [true, true], "L opens it again; the toggle is back");
  });
});

test("SS-4: during the fade both slides are drawn and their opacities move; under reduced motion no transition (Chrome)", { timeout: TIMEOUT_MS }, async () => {
  await withSlideshow({}, async (page) => {
    await page.keyboard.press("ArrowRight");
    await new Promise((r) => setTimeout(r, 150));
    const a = await slides(page);
    await new Promise((r) => setTimeout(r, 150));
    const b = await slides(page);
    const [out0, in1] = [a[0], a[1]];
    assert.ok(out0.drawn && in1.drawn, `both drawn mid-fade: ${JSON.stringify(a.slice(0, 2))}`);
    assert.ok(out0.opacity > 0 && out0.opacity < 1 && in1.opacity > 0 && in1.opacity < 1, `both part-way: ${JSON.stringify(a.slice(0, 2))}`);
    assert.ok(b[0].opacity < out0.opacity && b[1].opacity > in1.opacity, `the old fading out, the new in: ${JSON.stringify([a.slice(0, 2), b.slice(0, 2)])}`);
  });
  await withSlideshow({ reducedMotion: true }, async (page) => {
    await page.keyboard.press("ArrowRight");
    await new Promise((r) => setTimeout(r, 50));
    const s = await slides(page);
    assert.deepEqual(s.slice(0, 2).map((x) => [x.drawn, x.opacity, x.duration]), [[false, 0, "0s"], [true, 1, "0s"]], "reduced motion: at once, no transition");
  });
});
