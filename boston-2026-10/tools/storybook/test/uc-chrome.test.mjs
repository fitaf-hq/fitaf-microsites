// The site's SPEC-ui-and-copy-pass.md § 1 (round 1 of the Advisor's UI and copy pass, 2026-10-23), its layout items in
// Chrome at 390 and 1280, here because this package drives Chrome and the site never installs a driver:
//   UC1 (§ 1 item 1, "Drop "Your Boston offer" and make the text … more prominent"): the offer box at the top draws the
//   offer's headline as its one heading, more prominent than the heading it replaces (24 px) and the line under it
//   (16 px), with a touch of the printed pieces' treatment of the offer (SPEC-print-pieces §§ 13–15): the orange field
//   (--cta) with the white words of its offer (--on-cta), in the heading font at 700, on a level ribbon (notched ends,
//   nothing turned); the words inside the ribbon, none cut off, no sideways scroll; "Your Boston offer" not drawn, and
//   still the box's accessible name (Chrome's own accessibility tree).
// The page is the site's own development build (`node build.mjs --env dev --out`, as the stories' pages are built), its
// clock fixed at noon in New York on 2026-10-24 (a day of the offer: microsite/clock.mjs's fixClock, before the page's
// own scripts), served on 127.0.0.1; nothing else is requested (Turnstile's script is refused, as SM-8 has it). The words
// are read from the site's data, never written here (SM-4).
// With UC_RENDERS=<directory> the cases also write their PNGs there, for the Advisor's look (never committed).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixClock } from "../microsite/clock.mjs";
import { siteBuild } from "../microsite/pages.mjs";
import { VIEWPORTS } from "../microsite/layout.js";
import { siteFile } from "../microsite/paths.mjs";
import { freshChrome } from "./chrome.mjs";
import { serveStatic } from "./serve-static.mjs";
import { isLocal } from "./walk.mjs";

const TIMEOUT_MS = 180_000;
/** A day of the Boston offer, noon in New York (the site's page cases' PAGE_NOW_MS). */
const OFFER_DAY_MS = Date.parse("2026-10-24T16:00:00.000Z");
/** What § 1 item 1 must be more prominent than: the heading it replaces, 24 px (src/save/style.css before it). */
const REPLACED_HEADING_PX = 24;
/** The words must stay inside the ribbon's notches: at least this far in from either end. */
const NOTCH_CLEARANCE_PX = 8;
const RENDERS = process.env.UC_RENDERS ?? null;
const WIDTHS = [VIEWPORTS.w390, VIEWPORTS.w1280];

const offers = JSON.parse(await readFile(siteFile("data", "offers.json"), "utf8"));
const HEADLINE = offers.offers[0].headline;
/** The box's accessible name before this contract: its heading's words, read from the template's own markup. */
const BOX_NAME = /<span id="save-title" hidden>([^<]+)<\/span>/.exec(await readFile(siteFile("src", "save", "offer-box.html"), "utf8"))?.[1];

const devOut = await mkdtemp(join(tmpdir(), "fitaf-storybook-uc-dev-"));
after(() => rm(devOut, { recursive: true, force: true }));
let devReady = null;
const devSite = () => (devReady ??= siteBuild({ build: "development", out: devOut }));

/** `fn(page)` on the page served from `dir` at `hash`, `width` wide, its clock at `now`, in a fresh Chrome. */
async function withPage({ dir, hash = "", width, now = OFFER_DAY_MS }, fn) {
  const server = await serveStatic(dir);
  const chrome = await freshChrome();
  try {
    const page = await chrome.browser.newPage();
    await page.setViewport({ width: width.width, height: width.height });
    await page.setRequestInterception(true);
    page.on("request", (r) => (isLocal(r.url()) ? r.continue() : r.abort()));
    await page.evaluateOnNewDocument(fixClock, now);
    await page.goto(`${server.base}/index.html${hash}`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    return await fn(page);
  } finally {
    await chrome.close();
    await server.close();
  }
}

/** A PNG of `selector`'s box for the Advisor, when UC_RENDERS names a directory. */
async function render(page, selector, name) {
  if (!RENDERS) return;
  await mkdir(RENDERS, { recursive: true });
  const el = await page.$(selector);
  await el.screenshot({ path: join(RENDERS, `${name}.png`) });
}

/** Runs in the page: the offer box as drawn, and the colours of the tokens it must use (read off probes). */
function readBox(clearance) {
  const box = document.getElementById("offer-box");
  const heading = document.getElementById("save-offer-label");
  const token = (name) => {
    const probe = document.body.appendChild(document.createElement("div"));
    probe.style.color = `var(${name})`;
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  };
  const b = box.getBoundingClientRect();
  const h = heading.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(heading);
  const words = range.getBoundingClientRect();
  const hs = getComputedStyle(heading);
  const bs = getComputedStyle(box);
  return {
    drawn: box.checkVisibility(),
    text: heading.textContent,
    tag: heading.localName,
    family: hs.fontFamily,
    weight: hs.fontWeight,
    size: parseFloat(hs.fontSize),
    color: hs.color,
    background: bs.backgroundColor,
    clip: bs.clipPath,
    transform: bs.transform,
    cta: token("--cta"),
    onCta: token("--on-cta"),
    inside: words.left >= b.left + clearance && words.right <= b.right - clearance && words.top >= b.top && words.bottom <= b.bottom,
    // A word wider than the line is cut at the ribbon's clip (the words' own box is held inside it by `inside`).
    cut: heading.scrollWidth > heading.clientWidth + 1,
    sideways: document.documentElement.scrollWidth > window.innerWidth,
    nameDrawn: document.getElementById("save-title").checkVisibility(),
    headingBox: { width: Math.round(h.width), height: Math.round(h.height) },
  };
}

test("UC1 (Chrome, 390 and 1280): the offer box draws the headline, more prominent, on the print's orange ribbon; its name kept", { timeout: TIMEOUT_MS }, async () => {
  assert.ok(HEADLINE, "control: data/offers.json gives the Boston offer a headline");
  assert.ok(BOX_NAME, "control: the box's accessible name is in its markup");
  await devSite();
  for (const width of WIDTHS) {
    await withPage({ dir: devOut, width }, async (page) => {
      const where = `${width.width}`;
      const box = await page.evaluate(readBox, NOTCH_CLEARANCE_PX);
      assert.equal(box.drawn, true, `${where}: the box is drawn`);
      assert.equal(box.text, HEADLINE, `${where}: its heading is the headline`);
      assert.equal(box.tag, "h2", `${where}: as the box's heading`);
      assert.match(box.family, /^"?Poppins"?,/, `${where}: in the heading font (${box.family})`);
      assert.equal(box.weight, "700", `${where}: at 700`);
      assert.ok(box.size > REPLACED_HEADING_PX, `${where}: more prominent than the ${REPLACED_HEADING_PX} px heading it replaces (${box.size} px)`);
      assert.equal(box.background, box.cta, `${where}: the orange field (--cta)`);
      assert.equal(box.color, box.onCta, `${where}: its words in --on-cta, the pair the store button already passes`);
      assert.match(box.clip, /^polygon\(/, `${where}: the ribbon's notched ends (${box.clip})`);
      assert.equal(box.transform, "none", `${where}: level, nothing turned`);
      assert.equal(box.inside, true, `${where}: the words inside the ribbon, clear of its notches`);
      assert.equal(box.cut, false, `${where}: no word cut off`);
      assert.equal(box.sideways, false, `${where}: no sideways scroll`);
      assert.equal(box.nameDrawn, false, `${where}: "${BOX_NAME}" is not drawn`);
      const region = await page.accessibility.snapshot({ root: await page.$("#offer-box"), interestingOnly: false });
      assert.equal(region?.name, BOX_NAME, `${where}: the box keeps its accessible name (Chrome's accessibility tree)`);
      await render(page, "#offer-box", `uc1-offer-box-${width.width}`);
    });
  }
});
