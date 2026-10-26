// The site's SPEC-ui-and-copy-pass.md § 2.2 (Family's own question, 2026-10-25), as drawn, in Chrome at 390 and 1280 (the
// site's UF1–UF5 hold the markup and the behaviour; uq-chrome.test.mjs is the model): Family pressed and its question
// answered (*or*, five family meals), the page is drawn top to bottom as the first question, the Family card (its name,
// promise and line; its no-script door not drawn), Family's one question, and the result card directly below it, its
// Chef's Choice list drawn; nothing of the individual plan (its questions, the goal) drawn; no sideways scroll. Both
// builds, the week delivered 2026-11-01 (its or-5d cart holds five) in #picks-data, the clock at noon in New York on
// 2026-10-24, served on 127.0.0.1, nothing else requested. No word or rule of the page is written here (SM-4).
// With UC_RENDERS=<directory> the case also writes its PNG there (never committed).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixClock } from "../microsite/clock.mjs";
import { siteBuild } from "../microsite/pages.mjs";
import { VIEWPORTS } from "../microsite/layout.js";
import { freshChrome } from "./chrome.mjs";
import { serveStatic } from "./serve-static.mjs";
import { isLocal } from "./walk.mjs";

const TIMEOUT_MS = 240_000;
const OFFER_DAY_MS = Date.parse("2026-10-24T16:00:00.000Z");
const WEEK = "2026-11-01";
const RENDERS = process.env.UC_RENDERS ?? null;
/** "Directly below": no more than the page's own gap between a question and what follows it (its margin, 28 px). */
const DIRECTLY_PX = 32;
const ORDER = ["#who", "#panel-family .family-card", "#family-question", "#result"];
const INDIVIDUAL = ["#q-lunch_dinner", "#q-weekends", "#q-breakfast", "#q-goal", "#family-door"];

const prodOut = await mkdtemp(join(tmpdir(), "fitaf-storybook-uf-prod-"));
const devOut = await mkdtemp(join(tmpdir(), "fitaf-storybook-uf-dev-"));
after(() => Promise.all([prodOut, devOut].map((d) => rm(d, { recursive: true, force: true }))));
let ready = null;
const sites = () => (ready ??= Promise.all([siteBuild({ build: "production", out: prodOut, week: WEEK }), siteBuild({ build: "development", out: devOut, week: WEEK })]));

/** `fn(page)` on the page served from `dir` at `hash`, `width` wide, in a fresh Chrome; no photograph requested. */
async function withPage({ dir, hash, width }, fn) {
  const server = await serveStatic(dir);
  let chrome = null;
  try {
    chrome = await freshChrome();
    const page = await chrome.browser.newPage();
    await page.setViewport({ width: width.width, height: width.height });
    await page.setRequestInterception(true);
    page.on("request", (r) => (!isLocal(r.url()) || /\.jpe?g$/i.test(new URL(r.url()).pathname) ? r.abort() : r.continue()));
    await page.evaluateOnNewDocument(fixClock, OFFER_DAY_MS);
    await page.goto(`${server.base}/index.html${hash}`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    return await fn(page);
  } finally {
    await chrome?.close();
    await server.close();
  }
}

/** Runs in the page: each selector's box on the page (null when not drawn). */
function boxes(selectors) {
  const out = {};
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    const r = el && el.checkVisibility() ? el.getBoundingClientRect() : null;
    out[sel] = r ? { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, left: r.left, width: r.width } : null;
  }
  return out;
}

for (const width of [VIEWPORTS.w390, VIEWPORTS.w1280]) {
  for (const [build, dir] of [["production", prodOut], ["development", devOut]]) {
    test(`UF (${build}, ${width.width}): Family answered — its card, its one question, the result card directly below with its list; nothing of the individual plan (Chrome)`, { timeout: TIMEOUT_MS }, async () => {
      await sites();
      await withPage({ dir, hash: "#family-or", width }, async (page) => {
        await page.waitForSelector("#result:not([hidden])");
        const b = await page.evaluate(boxes, [...ORDER, ...INDIVIDUAL, "#cc-list"]);
        for (const sel of ORDER) assert.ok(b[sel], `${sel} drawn`);
        const tops = ORDER.map((sel) => b[sel].top);
        assert.deepEqual(tops, [...tops].sort((x, y) => x - y), "top to bottom: the first question, the Family card, its question, the result");
        const gap = b["#result"].top - b["#family-question"].bottom;
        assert.ok(gap >= 0 && gap <= DIRECTLY_PX, `the result directly below Family's question (${gap} px)`);
        assert.ok(b["#cc-list"], "the Chef's Choice list drawn (the week's or-5d holds five)");
        for (const sel of INDIVIDUAL) assert.equal(b[sel], null, `${sel} not drawn on Family`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, "no sideways scroll");
        if (RENDERS && width.width === 390) {
          await mkdir(RENDERS, { recursive: true });
          const clip = { x: 0, y: Math.max(0, b["#who"].top - 8), width: width.width, height: b["#result"].bottom - b["#who"].top + 16 };
          await page.screenshot({ path: join(RENDERS, `uf-family-or-${build}-390.png`), clip, captureBeyondViewport: true });
        }
      });
    });
  }
}
