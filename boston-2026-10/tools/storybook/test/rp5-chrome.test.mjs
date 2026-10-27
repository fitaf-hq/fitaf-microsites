// RP5 (the site's SPEC-ui-and-copy-pass.md § 7 item 6, item 2: "The struck line is smaller than the lead and muted, as
// the grid's (`.cell small s`): `--muted`, the browser's line-through, on a line of its own directly above the lead … the
// lead keeps its 34px … Neither line wraps at 390 or 1280"), here because this package drives Chrome and the site never
// installs a driver. While the Boston offer is current, at 390 and 1280, on both builds that carry it (the production
// build as committed, `production` true, and the development build): the result card's price draws exactly two lines,
// the struck one and then the lead; the struck one directly above the lead, on a line of its own, struck through
// (text-decoration line-through), in --muted, smaller than the lead; the lead's figure at 34 px; neither wrapped, none
// past the card's edge, no sideways scroll. And on a clock after the offer's valid_to, at 1280: the lead alone (RP2 as
// drawn). The figures themselves are RP1's (the site's node cases); here only that each line is a weekly price.
// The page is the site's own build (`node build.mjs [--env dev] --out`, as the stories' pages are built), its clock fixed
// (microsite/clock.mjs's fixClock, before the page's own scripts), served on 127.0.0.1; nothing else is requested.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixClock } from "../microsite/clock.mjs";
import { siteBuild } from "../microsite/pages.mjs";
import { VIEWPORTS } from "../microsite/layout.js";
import { freshChrome } from "./chrome.mjs";
import { serveStatic } from "./serve-static.mjs";
import { isLocal } from "./walk.mjs";

const TIMEOUT_MS = 300_000;
/** A day of the Boston offer, noon in New York (the site's page cases' PAGE_NOW_MS). */
const OFFER_DAY_MS = Date.parse("2026-10-24T16:00:00.000Z");
/** The day after the offer's valid_to (2026-10-29), noon in New York. */
const AFTER_OFFER_MS = Date.parse("2026-10-30T16:00:00.000Z");
/** § 7 item 2: the lead keeps its 34 px. */
const LEAD_PX = 34;
/** "Directly above": at most this much between the struck line's box and the lead's (the block's 2 px gap, line boxes). */
const DIRECTLY_PX = 8;
/** Sub-pixel rounding between boxes. */
const EDGE_PX = 1;
/** At its own count, five on the 4 plan, fifteen on the 14, the widest individual total, and Family's two. */
const HASHES = ["#lean-or-7d", "#lean-or-5d", "#signature-and-5d-b", "#performance-and-7d-b", "#family-or", "#family-and"];
const WIDTHS = [VIEWPORTS.w390, VIEWPORTS.w1280];
const WEEKLY = /^\$[\d,]+\.\d{2}\/week$/;

const outs = { production: await mkdtemp(join(tmpdir(), "fitaf-storybook-rp-prod-")), development: await mkdtemp(join(tmpdir(), "fitaf-storybook-rp-dev-")) };
after(() => Promise.all(Object.values(outs).map((d) => rm(d, { recursive: true, force: true }))));
const built = {};
const site = (build) => (built[build] ??= siteBuild({ build, out: outs[build] }));

/** `fn(page)` for each of `hashes` on the build served from `dir`, `width` wide, its clock at `now`, in one fresh Chrome;
 *  each fragment a fresh load. Refuses any request off 127.0.0.1. */
async function eachPage({ dir, width, now, hashes }, fn) {
  const server = await serveStatic(dir);
  let chrome = null;
  try {
    chrome = await freshChrome();
    const page = await chrome.browser.newPage();
    await page.setViewport({ width: width.width, height: width.height });
    await page.setRequestInterception(true);
    page.on("request", (r) => (isLocal(r.url()) && !/\.jpe?g$/i.test(new URL(r.url()).pathname) ? r.continue() : r.abort()));
    await page.evaluateOnNewDocument(fixClock, now);
    for (const hash of hashes) {
      await page.goto("about:blank");
      await page.goto(`${server.base}/index.html${hash}`, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForSelector("#result:not([hidden])");
      await fn(page, hash);
    }
  } finally {
    await chrome?.close();
    await server.close();
  }
}

/** Runs in the page: the result's price as drawn. A line is one line when every piece of its text shares the others'
 *  line box (a wrapped line's pieces sit one below the other). */
function readPrice() {
  const price = document.querySelector("#result .price");
  const card = document.getElementById("result").getBoundingClientRect();
  const drawn = [...price.children].filter((n) => n.checkVisibility());
  const struck = drawn.find((n) => n.localName === "s") ?? null;
  const lead = price.querySelector(".fig-total");
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
  };
  const oneLine = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    return rects.length > 0 && rects.every((a) => rects.every((b) => a.top < b.bottom - 1 && b.top < a.bottom - 1));
  };
  const probe = document.body.appendChild(document.createElement("div"));
  probe.style.color = "var(--muted)";
  const muted = getComputedStyle(probe).color;
  probe.remove();
  const s = struck && getComputedStyle(struck);
  return {
    lines: drawn.map((n) => (n === struck ? "struck" : n === lead ? "lead" : n.className || n.localName)),
    struck: struck && { text: struck.textContent.trim(), box: box(struck), oneLine: oneLine(struck), decoration: s.textDecorationLine, color: s.color, size: parseFloat(s.fontSize) },
    lead: { text: lead.textContent.trim(), box: box(lead), oneLine: oneLine(lead), size: parseFloat(getComputedStyle(document.getElementById("result-total")).fontSize) },
    muted,
    card: { left: card.left, right: card.right },
    sideways: document.documentElement.scrollWidth > window.innerWidth,
  };
}

for (const build of ["production", "development"]) {
  test(`RP5 (Chrome, 390 and 1280, ${build}): the struck line directly above the lead, muted, smaller, struck through; neither wrapped`, { timeout: TIMEOUT_MS }, async () => {
    await site(build);
    for (const width of WIDTHS) {
      await eachPage({ dir: outs[build], width, now: OFFER_DAY_MS, hashes: HASHES }, async (page, hash) => {
        const at = `${build}, ${width.width}, ${hash}`;
        const p = await page.evaluate(readPrice);
        assert.deepEqual(p.lines, ["struck", "lead"], `${at}: two lines drawn, the struck one first`);
        assert.match(p.struck.text, WEEKLY, `${at}: the struck line a weekly price (${p.struck.text})`);
        assert.match(p.lead.text, WEEKLY, `${at}: the lead a weekly price (${p.lead.text})`);
        assert.ok(p.struck.box.bottom <= p.lead.box.top + EDGE_PX, `${at}: the struck line above the lead: ${JSON.stringify([p.struck.box, p.lead.box])}`);
        assert.ok(p.lead.box.top - p.struck.box.bottom <= DIRECTLY_PX, `${at}: directly above it (${p.lead.box.top - p.struck.box.bottom} px between)`);
        assert.equal(p.struck.oneLine, true, `${at}: the struck line not wrapped`);
        assert.equal(p.lead.oneLine, true, `${at}: the lead not wrapped`);
        assert.match(p.struck.decoration, /line-through/, `${at}: struck through (${p.struck.decoration})`);
        assert.equal(p.struck.color, p.muted, `${at}: in --muted (${p.struck.color})`);
        assert.equal(p.lead.size, LEAD_PX, `${at}: the lead's figure at ${LEAD_PX} px`);
        assert.ok(p.struck.size < p.lead.size, `${at}: the struck line smaller than the lead (${p.struck.size} px)`);
        for (const [name, b] of [["struck line", p.struck.box], ["lead", p.lead.box]]) {
          assert.ok(b.left >= p.card.left - EDGE_PX && b.right <= p.card.right + EDGE_PX, `${at}: the ${name} inside the card`);
        }
        assert.equal(p.sideways, false, `${at}: no sideways scroll`);
      });
    }
  });
}

test("RP5 (Chrome, 1280, production): after the offer's valid_to, the lead alone", { timeout: TIMEOUT_MS }, async () => {
  await site("production");
  await eachPage({ dir: outs.production, width: VIEWPORTS.w1280, now: AFTER_OFFER_MS, hashes: ["#lean-or-5d", "#family-or"] }, async (page, hash) => {
    const p = await page.evaluate(readPrice);
    assert.deepEqual(p.lines, ["lead"], `${hash}: the lead alone`);
    assert.match(p.lead.text, WEEKLY, `${hash}: a weekly price`);
  });
});
