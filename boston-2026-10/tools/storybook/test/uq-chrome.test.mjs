// The site's SPEC-ui-and-copy-pass.md § 2 (round 2, changeset 1 of the Advisor's UI and copy pass, 2026-10-25), as drawn,
// in Chrome at 390 and 1280, here because this package drives Chrome and the site never installs a driver (uc-chrome is
// the model; the site's UQ1–UQ5 hold the markup and the behaviour):
//   UQ1: the questions drawn top to bottom in the contract's order, the first question (#q-who), the meal questions in
//   today's order, the goal last; the result card below the goal's answers.
//   UQ2: the first question drawn in the look of the other questions: each of its two answers the box of Q1's answers
//   (its size, border, fill, words' type), the pressed one drawn as Q1's pressed answer is.
//   UQ3: Family pressed, the Family section drawn directly below the first question and nothing of the individual plan
//   (the meal questions, the goal, the result); the individual answer pressed, each drawn again where it was.
//   UQ4 (the development page, where the calculator is): directly below the goal's answers the calculator, collapsed to
//   its heading's button; a press draws the rest of it below the button and moves nothing drawn above the button; a
//   second press collapses it.
//   No sideways scroll at either width.
// The pages are the site's own builds (`node build.mjs [--env dev] --out`, as the stories' pages are built) with the week
// delivered 2026-11-01 in #picks-data, the clock at noon in New York on 2026-10-24, served on 127.0.0.1; nothing else is
// requested. No word or rule of the page is written here (SM-4): elements are found by their ids.
// With UC_RENDERS=<directory> the cases also write their PNGs there, for the Advisor's look (never committed).
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
/** § 2 item 1's order, by the headings' ids. */
const ORDER = ["q-who", "q-lunch_dinner", "q-weekends", "q-breakfast", "q-snacks", "q-goal"];
/** Answers that show every meal question (Q1 answered), at a size, with the week's cart for them. */
const ANSWERED = "#lean-or-5d";
/** A layout's tolerance: sub-pixel rounding between equal boxes. */
const EVEN_PX = 1;
/** "Directly below": no more than the page's own gap between a question's parts (its step's margin is 28 px). */
const DIRECTLY_PX = 32;
/** What UQ2 compares of an answer's box, and of its words. */
const LOOK = ["borderTopColor", "borderTopWidth", "borderTopStyle", "borderTopLeftRadius", "backgroundColor", "boxShadow", "paddingTop", "paddingBottom", "textAlign", "minHeight"];
const WORDS_LOOK = ["fontFamily", "fontSize", "fontWeight", "color", "fontStyle"];

const prodOut = await mkdtemp(join(tmpdir(), "fitaf-storybook-uq-prod-"));
const devOut = await mkdtemp(join(tmpdir(), "fitaf-storybook-uq-dev-"));
after(() => Promise.all([prodOut, devOut].map((d) => rm(d, { recursive: true, force: true }))));
let ready = null;
const sites = () => (ready ??= Promise.all([siteBuild({ build: "production", out: prodOut, week: WEEK }), siteBuild({ build: "development", out: devOut, week: WEEK })]));
const BUILDS = [
  ["production", prodOut],
  ["development", devOut],
];

/** `fn(page)` on the page served from `dir` at `hash`, `width` wide, in a fresh Chrome; no photograph requested. */
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

/** A PNG of the page from `from`'s top to `below` px past `to`'s bottom, the whole width, when UC_RENDERS names a directory. */
async function renderSpan(page, from, to, below, name) {
  if (!RENDERS) return;
  await mkdir(RENDERS, { recursive: true });
  const clip = await page.evaluate((a, b, extra) => {
    const top = document.querySelector(a).getBoundingClientRect().top + window.scrollY;
    const bottom = document.querySelector(b).getBoundingClientRect().bottom + window.scrollY + extra;
    return { x: 0, y: Math.max(0, top - 8), width: document.documentElement.clientWidth, height: Math.min(bottom, document.documentElement.scrollHeight) - Math.max(0, top - 8) };
  }, from, to, below);
  await page.screenshot({ path: join(RENDERS, `${name}.png`), clip, captureBeyondViewport: true });
}

/** Runs in the page: each element's box on the page (null when not drawn), by selector. */
function boxes(selectors) {
  const out = {};
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el || !el.checkVisibility()) {
      out[sel] = null;
      continue;
    }
    const r = el.getBoundingClientRect();
    out[sel] = { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, left: r.left, width: r.width, height: r.height };
  }
  return out;
}

/** Runs in the page: how far the page scrolls sideways. */
const sideways = () => document.documentElement.scrollWidth - document.documentElement.clientWidth;

/** Runs in the page: every drawn element whose box ends above `y` (page coordinates), as "tag#id x,y,w,h" (no class:
 *  the carousel's timer moves its shown class while the case runs, and that is not a box moving). */
function drawnAbove(y) {
  return [...document.querySelectorAll("body *")]
    .filter((el) => el.checkVisibility())
    .map((el) => [el, el.getBoundingClientRect()])
    .filter(([, r]) => r.bottom + window.scrollY <= y && r.height > 0)
    .map(([el, r]) => `${el.localName}#${el.id} ${[r.left, r.top + window.scrollY, r.width, r.height].map((n) => Math.round(n * 10) / 10).join(",")}`);
}

/** Runs in the page: `look` of the element at `sel`, and `words` of its words' span. */
function lookOf(sel, look, words) {
  const el = document.querySelector(sel);
  const name = el.querySelector(".choice-name");
  const r = el.getBoundingClientRect();
  return {
    box: Object.fromEntries(look.map((k) => [k, getComputedStyle(el)[k]])),
    words: Object.fromEntries(words.map((k) => [k, getComputedStyle(name)[k]])),
    width: r.width,
    height: r.height,
  };
}

for (const width of WIDTHS) {
  for (const [build, dir] of BUILDS) {
    test(`UQ1 (${build}, ${width.width}): the questions drawn in order, who it is for first and the goal last, the result below the goal (Chrome)`, { timeout: TIMEOUT_MS }, async () => {
      await sites();
      await withPage({ dir, hash: ANSWERED, width }, async (page) => {
        await page.waitForSelector("#result:not([hidden])");
        const b = await page.evaluate(boxes, [...ORDER.map((id) => `#${id}`), ".goals", "#result"]);
        const drawn = ORDER.filter((id) => b[`#${id}`]);
        for (const id of ["q-who", "q-lunch_dinner", "q-weekends", "q-breakfast", "q-goal"]) assert.ok(b[`#${id}`], `#${id} drawn`);
        const tops = drawn.map((id) => b[`#${id}`].top);
        assert.deepEqual(tops, [...tops].sort((x, y) => x - y), `top to bottom in the contract's order: ${drawn.join(", ")}`);
        assert.ok(b["#result"].top >= b[".goals"].bottom, "the result below the goal's answers");
        assert.equal(await page.evaluate(sideways), 0, "no sideways scroll");
        if (width.width === 390) await renderSpan(page, "#who", "#result", 8, `uq1-questions-${build}-390`);
      });
    });
  }

  test(`UQ2 (${width.width}): the first question's answers drawn as Q1's — the pressed one as Q1's pressed one, the other as its other (Chrome)`, { timeout: TIMEOUT_MS }, async () => {
    await sites();
    await withPage({ dir: prodOut, hash: ANSWERED, width }, async (page) => {
      await page.waitForSelector("#result:not([hidden])");
      const pairs = [
        ['#who [data-who][aria-pressed="true"]', '[data-q="lunch_dinner"][aria-pressed="true"]'],
        ['#who [data-who][aria-pressed="false"]', '[data-q="lunch_dinner"][aria-pressed="false"]'],
      ];
      for (const [who, q1] of pairs) {
        const [a, b] = [await page.evaluate(lookOf, who, LOOK, WORDS_LOOK), await page.evaluate(lookOf, q1, LOOK, WORDS_LOOK)];
        assert.deepEqual(a.box, b.box, `${who}: its box's look is ${q1}'s`);
        assert.deepEqual(a.words, b.words, `${who}: its words' type is ${q1}'s`);
        assert.ok(Math.abs(a.width - b.width) <= EVEN_PX && Math.abs(a.height - b.height) <= EVEN_PX, `${who}: ${a.width} × ${a.height}, Q1's ${b.width} × ${b.height}`);
      }
    });
  });

  test(`UQ3 (${width.width}): Family drawn directly below the first question, nothing of the individual plan; back, each where it was (Chrome)`, { timeout: TIMEOUT_MS }, async () => {
    await sites();
    await withPage({ dir: devOut, hash: ANSWERED, width }, async (page) => {
      await page.waitForSelector("#result:not([hidden])");
      const parts = ["#who", ...ORDER.slice(1).map((id) => `#${id}`), ".goals", "#result", "#panel-family .family-card"];
      const individual = await page.evaluate(boxes, parts);
      await page.click("#who-family");
      await page.waitForSelector("#panel-family:not([hidden])");
      const family = await page.evaluate(boxes, parts);
      const card = family["#panel-family .family-card"];
      assert.ok(card && card.top >= family["#who"].bottom && card.top - family["#who"].bottom <= DIRECTLY_PX, `the Family section directly below the question: ${JSON.stringify({ who: family["#who"], card })}`);
      for (const sel of [...ORDER.slice(1).map((id) => `#${id}`), ".goals", "#result"]) assert.equal(family[sel], null, `${sel} not drawn on Family`);
      assert.deepEqual(family["#who"], individual["#who"], "the question itself does not move");
      if (width.width === 390) await renderSpan(page, "#who", "#panel-family", 8, "uq3-family-390");
      await page.click("#who-individual");
      await page.waitForSelector("#result:not([hidden])");
      assert.deepEqual(await page.evaluate(boxes, parts), individual, "the individual answer: every part drawn again where it was");
      assert.equal(await page.evaluate(sideways), 0, "no sideways scroll");
    });
  });

  test(`UQ4 (${width.width}): the calculator directly below the goal's answers, collapsed to its heading's button; opened below it, nothing above it moved (Chrome)`, { timeout: TIMEOUT_MS }, async () => {
    await sites();
    await withPage({ dir: devOut, hash: ANSWERED, width }, async (page) => {
      await page.waitForSelector("#result:not([hidden])");
      const shut = await page.evaluate(boxes, [".goals", "#share", "#share-toggle", "#share-body", "#result"]);
      assert.ok(shut["#share-toggle"], "its button drawn");
      assert.equal(shut["#share-body"], null, "collapsed: the rest of it not drawn");
      assert.ok(shut["#share"].top >= shut[".goals"].bottom && shut["#share"].top - shut[".goals"].bottom <= DIRECTLY_PX, `directly below the goal's answers: ${JSON.stringify({ goals: shut[".goals"], share: shut["#share"] })}`);
      assert.ok(shut["#result"].top >= shut["#share"].bottom, "the result below it");
      if (width.width === 390) await renderSpan(page, "#q-goal", "#share", 8, "uq4-calculator-closed-390");
      const above = await page.evaluate(drawnAbove, shut["#share-toggle"].top);
      assert.ok(above.length > 10, `control: the page above the button (${above.length} boxes)`);
      await page.click("#share-toggle");
      await page.waitForSelector("#share-body:not([hidden])");
      const open = await page.evaluate(boxes, ["#share-toggle", "#share-body", "#result"]);
      assert.deepEqual(open["#share-toggle"], shut["#share-toggle"], "the button stays where it was");
      assert.deepEqual(await page.evaluate(drawnAbove, shut["#share-toggle"].top), above, "nothing drawn above the button moved");
      assert.ok(open["#share-body"] && open["#share-body"].top >= open["#share-toggle"].bottom, "opened: the rest of it below the button");
      assert.ok(open["#result"].top >= open["#share-body"].bottom, "the result below it, moved down");
      assert.equal(await page.evaluate(sideways), 0, "no sideways scroll, opened");
      if (width.width === 390) await renderSpan(page, "#q-goal", "#share", 8, "uq4-calculator-open-390");
      await page.click("#share-toggle");
      assert.equal((await page.evaluate(boxes, ["#share-body"]))["#share-body"], null, "a second press collapses it");
    });
  });
}
