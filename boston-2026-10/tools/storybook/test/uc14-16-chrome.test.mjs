// The site's SPEC-ui-and-copy-pass.md § 5 (round 2, changeset 3, 2026-10-26: the result card reordered, Choose my own
// meals a menu, the page's scroll stops), as drawn, in Chrome at 390 and 1280, both builds, with the week delivered
// 2026-11-01 (its five menus): the card drawn top to bottom as item 1 orders it (the heading, the chips, the list's box,
// the price, the checkout, Not ready?); the meal names at weight 600 (item 4); the list's box at most 80 % of the
// screen's height, scrolling inside (item 5); the root snapping by proximity with three stops, the questions' top
// (start), the list's box (center) and the checkout (center) (item 6); and Choose my own meals pressed, the box holding
// its note and the week's full list (item 3). The site's UC14–UC16 hold the markup and the behaviour. No word or rule of
// the page is written here (SM-4). With UC_RENDERS=<directory> the cases write their PNGs there (never committed).
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
const WIDTHS = [VIEWPORTS.w390, VIEWPORTS.w1280];
const RENDERS = process.env.UC_RENDERS ?? null;
const CHECKOUT = "#lean-or-7d";
/** § 5 item 5: the box at most 80 % of the screen's height; item 4: the names' weight. */
const BOX_SHARE = 0.8;
const NAME_WEIGHT = "600";
const EVEN_PX = 1;

const prodOut = await mkdtemp(join(tmpdir(), "fitaf-storybook-uc14-prod-"));
const devOut = await mkdtemp(join(tmpdir(), "fitaf-storybook-uc14-dev-"));
after(() => Promise.all([prodOut, devOut].map((d) => rm(d, { recursive: true, force: true }))));
let ready = null;
const sites = () => (ready ??= Promise.all([siteBuild({ build: "production", out: prodOut, week: WEEK }), siteBuild({ build: "development", out: devOut, week: WEEK })]));
const BUILDS = [
  ["production", prodOut],
  ["development", devOut],
];

async function withPage({ dir, hash = "", width }, fn) {
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

async function render(page, selector, name) {
  if (!RENDERS) return;
  await mkdir(RENDERS, { recursive: true });
  await (await page.$(selector)).screenshot({ path: join(RENDERS, `${name}.png`) });
}

/** Runs in the page: what the case reads of the card as drawn. */
function readCard() {
  const box = (el) => (el && el.checkVisibility() ? el.getBoundingClientRect().toJSON() : null);
  const q = (s) => document.querySelector(s);
  const list = q("#cc-box");
  const s = list ? getComputedStyle(list) : null;
  return {
    tops: ["#result .step-label", "#cc-menus", "#cc-box", "#result .price", "#cc-checkout", "#not-ready"].map((sel) => box(q(sel))?.top ?? null),
    weight: q("#cc-meals .cc-name") ? getComputedStyle(q("#cc-meals .cc-name")).fontWeight : null,
    boxHeight: box(list)?.height ?? null,
    maxHeight: s ? parseFloat(s.maxHeight) : null,
    overflowY: s?.overflowY ?? null,
    border: s ? s.borderTopStyle !== "none" && parseFloat(s.borderTopWidth) > 0 : null,
    screen: window.innerHeight,
    snapType: getComputedStyle(document.documentElement).scrollSnapType,
    stops: Object.fromEntries(["#who", "#cc-box", "#cc-checkout"].map((sel) => [sel, q(sel) ? getComputedStyle(q(sel)).scrollSnapAlign : null])),
  };
}

for (const width of WIDTHS) {
  for (const [build, dir] of BUILDS) {
    test(`UC14–UC16 (${build}, ${width.width}): the card drawn in order; names at 600; the list's box at most 80 % of the screen, scrolling; the three stops by proximity; Choose my own meals pressed (Chrome)`, { timeout: TIMEOUT_MS }, async () => {
      await sites();
      await withPage({ dir, hash: CHECKOUT, width }, async (page) => {
        await page.waitForSelector("#cc-box", { visible: true });
        const c = await page.evaluate(readCard);
        assert.ok(c.tops.every((t) => t !== null), `every part drawn: ${JSON.stringify(c.tops)}`);
        assert.deepEqual([...c.tops].sort((a, b) => a - b), c.tops, `heading, chips, list, price, checkout, Not ready? top to bottom: ${JSON.stringify(c.tops)}`);
        assert.equal(c.weight, NAME_WEIGHT, "the meal names at 600");
        assert.ok(Math.abs(c.maxHeight - BOX_SHARE * c.screen) <= EVEN_PX, `the box's maximum ${c.maxHeight} px, 80 % of ${c.screen}`);
        assert.ok(c.boxHeight <= BOX_SHARE * c.screen + EVEN_PX, `the box ${c.boxHeight} px tall at most`);
        assert.equal(c.overflowY, "auto", "it scrolls inside");
        assert.equal(c.border, true, "its edge drawn");
        // Chrome's computed value leaves out the default strictness, so `y proximity` reads `y` (`y mandatory` would not).
        assert.match(c.snapType, /^y( proximity)?$/, `the root snaps by proximity (${c.snapType})`);
        assert.deepEqual(c.stops, { "#who": "start", "#cc-box": "center", "#cc-checkout": "center" }, "the three stops");
        await render(page, "#result", `uc14-card-${build}-${width.width}`);
        await page.click("#cc-menus label:last-child");
        await page.waitForFunction(() => document.querySelector("#cc-menus label:last-child input").checked);
        const own = await page.evaluate(() => ({
          note: [...document.querySelectorAll("#result p")].some((p) => p.checkVisibility() && p.compareDocumentPosition(document.querySelector("#cc-meals")) & Node.DOCUMENT_POSITION_FOLLOWING && p.id === "cc-own-note"),
          checkout: document.querySelector("#cc-checkout").getAttribute("href"),
          plan: document.querySelector("#result-cta").getAttribute("href"),
        }));
        assert.deepEqual([own.note, own.checkout], [true, own.plan], "Choose my own meals pressed: its note above the list, the checkout to the plan page");
        await render(page, "#result", `uc15-own-${build}-${width.width}`);
      });
    });
  }
}
