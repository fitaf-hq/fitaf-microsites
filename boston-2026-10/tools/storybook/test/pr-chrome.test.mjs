// The plan page's cases that need a browser (SPEC-plan-page-refinement.md § 5), here because this package drives Chrome
// and the site never installs a driver (SM-5's Chrome: the watch's chromePath, this package's puppeteer-core):
//   PR-6, the price: the weekly total's element comes first and its computed font size is larger, at 390;
//   PR-4's layout: the three goals in one row (one top) at 390 and at 1280;
//   PR-8, the modal: the link opens a modal dialog holding the grid, focus moves in; Esc closes it and focus returns
//   to the link; a press on the backdrop closes it too;
//   § 8: PR-13, the carousel full bleed (its box the viewport's width, at 390 and 1280) with the logo inside it;
//   PR-14, the two question headings centred; PR-16, the price one untinted block, the weekly total first and larger.
// The page is the site's own production build (`node build.mjs --on --out`, as the stories' pages are built), served on
// 127.0.0.1; nothing else is requested.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { siteBuild } from "../microsite/pages.mjs";
import { VIEWPORTS } from "../microsite/layout.js";
import { freshChrome } from "./chrome.mjs";
import { serveStatic } from "./serve-static.mjs";
import { isLocal } from "./walk.mjs";

const ON = "2026-09-30";
const TIMEOUT_MS = 120_000;
const out = await mkdtemp(join(tmpdir(), "fitaf-storybook-pr-"));
after(() => rm(out, { recursive: true, force: true }));

/** The production page at `hash`, `width` wide, in a fresh Chrome; `fn(page)` reads it. Refuses any request off 127.0.0.1. */
async function withPage({ width, hash }, fn) {
  await siteBuild({ build: "production", on: ON, out });
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

test("PR-6: the weekly total comes first and its font is larger than the price per meal's (Chrome, 390)", { timeout: TIMEOUT_MS }, async () => {
  const read = await withPage({ width: VIEWPORTS.w390.width, hash: "#lean-7" }, (page) =>
    page.evaluate(() => {
      const box = (id) => {
        const el = document.getElementById(id);
        const r = el.getBoundingClientRect();
        return { top: r.top, left: r.left, size: parseFloat(getComputedStyle(el).fontSize), text: el.textContent };
      };
      return { total: box("result-total"), perMeal: box("result-per-meal") };
    }),
  );
  assert.ok(read.total.text && read.perMeal.text, `control: both figures shown (${read.total.text}, ${read.perMeal.text})`);
  const first = read.total.top < read.perMeal.top || (read.total.top === read.perMeal.top && read.total.left < read.perMeal.left);
  assert.ok(first, `the total first: ${JSON.stringify(read)}`);
  assert.ok(read.total.size > read.perMeal.size, `the total larger: ${read.total.size}px against ${read.perMeal.size}px`);
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
const textGaps = (sel) =>
  [...document.querySelectorAll(sel)].map((el) => {
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
        return { viewport: document.documentElement.clientWidth, carousel: r(document.getElementById("carousel")), logo: r(document.querySelector("#top .logo-plate img")), header: document.querySelectorAll("header, .site-head").length };
      }),
    );
    assert.ok(read.carousel, `${width}: control: the committed sheets give a carousel`);
    assert.deepEqual([read.carousel.left, read.carousel.width], [0, read.viewport], `${width}: edge to edge`);
    const inside = read.logo && read.logo.left >= read.carousel.left && read.logo.right <= read.carousel.right && read.logo.top >= read.carousel.top && read.logo.bottom <= read.carousel.bottom;
    assert.ok(inside, `${width}: the logo inside the carousel: ${JSON.stringify(read)}`);
    assert.equal(read.header, 0, `${width}: no separate header`);
  }
});

test("PR-14: the two question headings are centred (Chrome, 390 and 1280)", { timeout: TIMEOUT_MS }, async () => {
  for (const { width } of Object.values(VIEWPORTS)) {
    const gaps = await withPage({ width, hash: "#lean-7" }, (page) => page.evaluate(textGaps, ".step-label"));
    assert.equal(gaps.length, 2, `${width}: two headings`);
    for (const g of gaps) assert.ok(g.left > 4 && Math.abs(g.left - g.right) <= 2, `${width}: ${g.text} centred: ${JSON.stringify(g)}`);
  }
});

test("PR-16: the price is one untinted block, the weekly total first and larger; no title (Chrome, 390)", { timeout: TIMEOUT_MS }, async () => {
  const read = await withPage({ width: VIEWPORTS.w390.width, hash: "#lean-7" }, (page) =>
    page.evaluate(() => {
      const t = document.getElementById("result-total"), m = document.getElementById("result-per-meal");
      const block = t.closest(".price");
      const tinted = [block, ...block.querySelectorAll("*")].filter((el) => getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)").length;
      return {
        sameBlock: block !== null && block === m.closest(".price"),
        tinted,
        totalFirst: t.getBoundingClientRect().top < m.getBoundingClientRect().top,
        sizes: [parseFloat(getComputedStyle(t).fontSize), parseFloat(getComputedStyle(m).fontSize)],
        title: document.querySelectorAll("#result .result-title").length,
      };
    }),
  );
  assert.deepEqual([read.sameBlock, read.tinted, read.totalFirst, read.title], [true, 0, true, 0], JSON.stringify(read));
  assert.ok(read.sizes[0] > read.sizes[1], `the total larger: ${read.sizes}`);
});
