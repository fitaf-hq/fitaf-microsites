// The plan page's cases that need a browser (SPEC-plan-page-refinement.md § 5), here because this package drives Chrome
// and the site never installs a driver (SM-5's Chrome: the watch's chromePath, this package's puppeteer-core):
//   PR-6, the price: the weekly total's element comes first and its computed font size is larger, at 390;
//   PR-4's layout: the three goals in one row (one top) at 390 and at 1280;
//   PR-8, the modal: the link opens a modal dialog holding the grid, focus moves in; Esc closes it and focus returns
//   to the link; a press on the backdrop closes it too;
//   § 8: PR-13, the carousel full bleed (its box the viewport's width, at 390 and 1280) with the logo inside it;
//   PR-14, the two question headings centred; PR-16, the price one untinted block, the weekly total first and larger.
// The page is the site's own production build (`node build.mjs --on --out`, as the stories' pages are built), served on
// 127.0.0.1; nothing else is requested. It carries ONE week, the site's fixture week (a snack list for 7 days, so Q4 is
// shown at #lean-7), put in as the Date control's fixture date puts it: no build embeds a week (SPEC-week-content § 7's
// ruling), so the page is the build's and the week is the content command's (`--picks` the fixture), in its
// #picks-data. Before that contract these cases built --on 2026-09-30 from data/picks/ and the browser chose a week by
// the real clock, so what they read moved with the day they ran.
// ⚠ AMENDED by the site's SPEC-ui-and-copy-pass § 7 (2026-10-26, the Advisor: "Let's do B2 and drop the meal count
// please"): the price a meal and the meals a week are gone; the block's lines are the weekly total and, while an offer with
// a share is current, the struck line above it (the weekly total before the share). So PR-6 and PR-16 hold the total the
// block's largest line, and the struck line the only one above it. The page's clock here is the real one, so the struck
// line is drawn on a day of the offer and not after it: both hold either way (RP5 fixes the clock).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { siteBuild } from "../microsite/pages.mjs";
import { FIXTURE_PICKS, VIEWPORTS } from "../microsite/layout.js";
import { FIXTURE_PICKS_DIR } from "../microsite/paths.mjs";
import { freshChrome } from "./chrome.mjs";
import { serveStatic } from "./serve-static.mjs";
import { isLocal } from "./walk.mjs";

/** The fixture week's delivery Sunday: its one picks file, by name. */
const FIXTURE_WEEK = (await readdir(FIXTURE_PICKS_DIR)).map((f) => /^(\d{4}-\d{2}-\d{2})\.json$/.exec(f)?.[1]).filter(Boolean).sort().at(-1);
const TIMEOUT_MS = 120_000;
const out = await mkdtemp(join(tmpdir(), "fitaf-storybook-pr-"));
after(() => rm(out, { recursive: true, force: true }));

/** The production page at `hash`, `width` wide, in a fresh Chrome; `fn(page)` reads it. Refuses any request off 127.0.0.1. */
async function withPage({ width, hash }, fn) {
  await siteBuild({ build: "production", out, week: FIXTURE_WEEK, picks: FIXTURE_PICKS });
  const server = await serveStatic(out);
  const chrome = await freshChrome();
  try {
    const page = await chrome.browser.newPage();
    await page.setViewport({ width, height: VIEWPORTS.w390.height });
    await page.setRequestInterception(true);
    page.on("request", (r) => (isLocal(r.url()) ? r.continue() : r.abort()));
    await page.goto(`${server.base}/index.html${hash}`, { waitUntil: "load" });
    await page.waitForSelector("#result:not([hidden])");
    return await fn(page);
  } finally {
    await chrome.close();
    await server.close();
  }
}

/** Runs in the page: the price block's drawn lines, each its words, its top, its font size (the total's figure for the
 *  total's line), whether it is the total's and whether it is struck through (an `<s>`). */
function priceLines() {
  const total = document.getElementById("result-total");
  return [...total.closest(".price").children]
    .filter((n) => n.checkVisibility())
    .map((n) => ({
      lead: n.contains(total),
      struck: n.localName === "s",
      top: n.getBoundingClientRect().top,
      size: parseFloat(getComputedStyle(n.contains(total) ? total : n).fontSize),
      text: n.textContent.trim(),
    }));
}

test("PR-6: the weekly total is the price's largest line, and only the struck line is above it (Chrome, 390)", { timeout: TIMEOUT_MS }, async () => {
  const lines = await withPage({ width: VIEWPORTS.w390.width, hash: "#lean-7" }, (page) => page.evaluate(priceLines));
  const lead = lines.find((l) => l.lead);
  assert.ok(lead?.text, `control: the total shown (${JSON.stringify(lines)})`);
  for (const l of lines.filter((x) => !x.lead)) {
    assert.equal(l.struck, true, `only the struck line beside the total: ${JSON.stringify(l)}`);
    assert.ok(l.top < lead.top, `the struck line above the total: ${JSON.stringify(lines)}`);
    assert.ok(lead.size > l.size, `the total larger: ${lead.size}px against ${l.size}px`);
  }
});

test("PR-4: the three goals in one row at 390 and at 1280 (Chrome)", { timeout: TIMEOUT_MS }, async () => {
  for (const { width } of Object.values(VIEWPORTS)) {
    const tops = await withPage({ width, hash: "#lean-7" }, (page) =>
      page.$$eval("[data-goal]", (goals) => goals.map((g) => Math.round(g.getBoundingClientRect().top))),
    );
    assert.equal(tops.length, 3, `${width}: three goals`);
    assert.equal(new Set(tops).size, 1, `${width}: one row, tops ${tops.join(", ")}`);
  }
});

test("PR-8: the link opens a modal dialog with the grid; Esc closes it and focus returns; the backdrop closes it (Chrome, 390)", { timeout: TIMEOUT_MS }, async () => {
  await withPage({ width: VIEWPORTS.w390.width, hash: "#lean-7" }, async (page) => {
    const state = () =>
      page.evaluate(() => {
        const d = document.getElementById("all");
        return {
          open: d.open,
          modal: d.matches(":modal"),
          focusInside: d.contains(document.activeElement),
          focusOnLink: document.activeElement?.id === "all-link",
          links: [...d.querySelectorAll("a.cell")].filter((a) => a.checkVisibility()).length,
        };
      });
    await page.click("#all-link");
    const opened = await state();
    assert.deepEqual([opened.open, opened.modal, opened.focusInside, opened.links], [true, true, true, 6], "open, modal, focus in, the six links shown");
    await page.keyboard.press("Escape");
    const closed = await state();
    assert.deepEqual([closed.open, closed.focusOnLink], [false, true], "Esc closes it; focus back on the link");
    await page.click("#all-link");
    assert.equal((await state()).open, true, "control: open again");
    await page.mouse.click(4, 4); // a corner of the viewport: the backdrop, outside the dialog's box
    assert.equal((await state()).open, false, "a press on the backdrop closes it");
  });
});

/** Where `sel`'s text sits inside its own box: the gaps left and right of the text (a Range over its contents). */
// ⚠ AMENDED by the site's SPEC-ui-and-copy-pass § 2.2 (2026-10-25): the drawn headings only (Family's own question is
// in the markup, hidden on an individual page, and a hidden element has no box to measure).
const textGaps = (sel) =>
  [...document.querySelectorAll(sel)].filter((el) => el.checkVisibility()).map((el) => {
    const box = el.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(el);
    const text = range.getBoundingClientRect();
    return { text: el.textContent.trim(), left: text.left - box.left, right: box.right - text.right };
  });

test("PR-13: the carousel spans the viewport's width with the logo inside it; no separate header (Chrome, 390 and 1280)", { timeout: TIMEOUT_MS }, async () => {
  for (const { width } of Object.values(VIEWPORTS)) {
    const read = await withPage({ width, hash: "#lean-7" }, (page) =>
      page.evaluate(() => {
        const r = (el) => el && el.getBoundingClientRect().toJSON();
        return { viewport: document.documentElement.clientWidth, column: r(document.body), carousel: r(document.getElementById("carousel")), logo: r(document.querySelector("#top .logo-plate img")), header: document.querySelectorAll("header, .site-head").length };
      }),
    );
    assert.ok(read.carousel, `${width}: control: the committed sheets give a carousel`);
    // ⚠ AMENDED for the site's SPEC-ui-and-copy-pass § 3 (2026-10-26, the desktop column, 0233dbe; found by the Storybook
    // run of its § 4, § 4.1): above 480 px the whole page is one 480 px column, so the carousel spans the page's column
    // (body) edge to edge: the viewport at 390, the column at 1280.
    assert.equal(read.column.width, Math.min(read.viewport, 480), `${width}: control: the page's column`);
    assert.deepEqual([read.carousel.left, read.carousel.width], [read.column.left, read.column.width], `${width}: edge to edge of the page's column`);
    const inside = read.logo && read.logo.left >= read.carousel.left && read.logo.right <= read.carousel.right && read.logo.top >= read.carousel.top && read.logo.bottom <= read.carousel.bottom;
    assert.ok(inside, `${width}: the logo inside the carousel: ${JSON.stringify(read)}`);
    assert.equal(read.header, 0, `${width}: no separate header`);
  }
});

// Updated (SPEC-meal-selection § 1): the page asks the goal and the four meal questions, five headings, all shown once Q1
// is answered (#lean-7 answers it). ⚠ AMENDED by the site's SPEC-ui-and-copy-pass § 2 items 1–2 (2026-10-25): the first
// question, who it is for, is a sixth, in the tabs' place, and the goal is the last. ⚠ AMENDED by the site's
// SPEC-ui-and-copy-pass § 5 item 1 (2026-10-26): the result card's heading takes the questions' heading style, a seventh,
// centred too (on a page whose week has picks, as this one's has).
test("PR-14: the question headings are centred (Chrome, 390 and 1280)", { timeout: TIMEOUT_MS }, async () => {
  for (const { width } of Object.values(VIEWPORTS)) {
    const gaps = await withPage({ width, hash: "#lean-7" }, (page) => page.evaluate(textGaps, ".step-label"));
    assert.equal(gaps.length, 7, `${width}: the first question's heading, the four meal questions', the goal's and the card's`);
    for (const g of gaps) assert.ok(g.left > 4 && Math.abs(g.left - g.right) <= 2, `${width}: ${g.text} centred: ${JSON.stringify(g)}`);
  }
});

test("PR-16: the price is one untinted block, the weekly total its largest line, only the struck line above it; no title (Chrome, 390)", { timeout: TIMEOUT_MS }, async () => {
  const read = await withPage({ width: VIEWPORTS.w390.width, hash: "#lean-7" }, async (page) => ({
    lines: await page.evaluate(priceLines),
    ...(await page.evaluate(() => {
      const t = document.getElementById("result-total");
      const block = t.closest(".price");
      const tinted = [block, ...block.querySelectorAll("*")].filter((el) => getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)").length;
      return {
        sameBlock: block !== null && block === document.getElementById("result-struck")?.closest(".price"),
        tinted,
        title: document.querySelectorAll("#result .result-title").length,
      };
    })),
  }));
  assert.deepEqual([read.sameBlock, read.tinted, read.title], [true, 0, 0], JSON.stringify(read));
  const lead = read.lines.find((l) => l.lead);
  assert.ok(lead?.text, `control: the total shown (${JSON.stringify(read.lines)})`);
  for (const l of read.lines.filter((x) => !x.lead)) {
    assert.ok(l.struck && l.top < lead.top && lead.size > l.size, `only the struck line, above the total and smaller: ${JSON.stringify(read.lines)}`);
  }
});
