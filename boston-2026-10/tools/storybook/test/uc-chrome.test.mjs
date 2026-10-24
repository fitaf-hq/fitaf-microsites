// The site's SPEC-ui-and-copy-pass.md § 1 (round 1 of the Advisor's UI and copy pass, 2026-10-23), its layout items in
// Chrome at 390 and 1280, here because this package drives Chrome and the site never installs a driver:
//   UC1 (§ 1 item 1, "Drop "Your Boston offer" and make the text … more prominent"): the offer box at the top draws the
//   offer's headline as its one heading, more prominent than the heading it replaces (24 px) and the line under it
//   (16 px), with a touch of the printed pieces' treatment of the offer (SPEC-print-pieces §§ 13–15): the orange field
//   (--cta) with the white words of its offer (--on-cta), in the heading font at 700, on a level ribbon (notched ends,
//   nothing turned); the words inside the ribbon, none cut off, no sideways scroll; "Your Boston offer" not drawn, and
//   still the box's accessible name (Chrome's own accessibility tree).
//   UC8 (§ 1 item 8, "I want to fix the menu chips … a circled number overlayed on the top right corner of the meal
//   image"): on the week delivered 2026-11-01 (its five menus; breakfasts twice in a weekday cart), the chips sit evenly,
//   no row of one: three, then two, each row's chips one width and the row the group's, no word cut off, each at least the
//   card's 64 px target; a meal twice is a navy circle (the template's tokens, white figures) on its tile's top-right
//   corner, its "× 2" not drawn but in the row's accessible name (the content's line); a meal once has no badge.
//   The save step's states, in Chrome (§ 1 items 2–3, with the week's card): open beside the card's checkout button; an
//   email refused, its message drawn directly under its field; saved, only the done line; after the offer's end (§ 1.2
//   item 3) no box, and the step with no offer, its own lead, beside the card. And See all plans while the offer is
//   current (item 7, as § 1.2 item 2 corrects it: the store's price, the higher one struck through beside it), and the
//   card of a 5-meal row (§ 1.2 item 1: its meals at the plan's price a meal). Turnstile and /api/save are stood in for.
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

/** § 1 item 8's week: five menus, and the breakfasts twice in the weekday cart with breakfast. */
const WEEK = "2026-11-01";
const TWICE = "#lean-or-5d-b";
/** The card's touch target (SPEC-every-menu-and-nutrition § 10: 64 CSS px, its smaller dimension). */
const TARGET_PX = 64;
/** A layout's tolerance: sub-pixel rounding between equal boxes. */
const EVEN_PX = 1;

const devOut = await mkdtemp(join(tmpdir(), "fitaf-storybook-uc-dev-"));
const weekOut = await mkdtemp(join(tmpdir(), "fitaf-storybook-uc-week-"));
const devWeekOut = await mkdtemp(join(tmpdir(), "fitaf-storybook-uc-devweek-"));
after(() => Promise.all([devOut, weekOut, devWeekOut].map((d) => rm(d, { recursive: true, force: true }))));
let devReady = null;
const devSite = () => (devReady ??= siteBuild({ build: "development", out: devOut }));
let weekReady = null;
const weekSite = () => (weekReady ??= siteBuild({ build: "production", out: weekOut, week: WEEK }));
let devWeekReady = null;
const devWeekSite = () => (devWeekReady ??= siteBuild({ build: "development", out: devWeekOut, week: WEEK }));
const picks = JSON.parse(await readFile(siteFile("data", "picks", `${WEEK}.json`), "utf8"));
const messages = JSON.parse(await readFile(siteFile("data", "messages.json"), "utf8"));
const plansData = JSON.parse(await readFile(siteFile("data", "plans.json"), "utf8"));

/** Turnstile, stood in for in the page (its own script is refused): it passes at once with the test token. */
function standInTurnstile() {
  window.turnstile = {
    render(_selector, options) {
      window.__ucTurnstile = options;
      return "uc-widget";
    },
    reset() {},
    execute() {
      window.__ucTurnstile.callback("XXXX.DUMMY.TOKEN.XXXX");
    },
  };
}

/** `fn(page)` on the page served from `dir` at `hash`, `width` wide, its clock at `now`, in a fresh Chrome. No
 *  photograph is requested (a render never shows one); /api/save answers { ok: true } (the Worker, stood in for). */
async function withPage({ dir, hash = "", width, now = OFFER_DAY_MS }, fn) {
  const server = await serveStatic(dir);
  const chrome = await freshChrome();
  try {
    const page = await chrome.browser.newPage();
    await page.setViewport({ width: width.width, height: width.height });
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      const url = new URL(r.url());
      if (url.pathname === "/api/save") return r.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      if (!isLocal(r.url()) || /\.jpe?g$/i.test(url.pathname)) return r.abort();
      return r.continue();
    });
    await page.evaluateOnNewDocument(fixClock, now);
    await page.evaluateOnNewDocument(standInTurnstile);
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

/** A PNG of the page from `fromSelector`'s top to `below` px past `toSelector`'s bottom (the whole width), when UC_RENDERS
 *  names a directory: what follows an element, or the lack of it, is in the picture. */
async function renderSpan(page, fromSelector, toSelector, below, name) {
  if (!RENDERS) return;
  await mkdir(RENDERS, { recursive: true });
  const clip = await page.evaluate((a, b, extra) => {
    const top = document.querySelector(a).getBoundingClientRect().top + window.scrollY;
    const bottom = document.querySelector(b).getBoundingClientRect().bottom + window.scrollY + extra;
    return { x: 0, y: Math.max(0, top), width: document.documentElement.clientWidth, height: Math.min(bottom, document.documentElement.scrollHeight) - Math.max(0, top) };
  }, fromSelector, toSelector, below);
  await page.screenshot({ path: join(RENDERS, `${name}.png`), clip, captureBeyondViewport: true });
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

/** Runs in the page: the chips as drawn (each a menu's span, its label's look), and the group's box. */
function readChips() {
  const group = document.getElementById("cc-menus");
  const g = group.getBoundingClientRect();
  return {
    drawn: group.checkVisibility(),
    group: { left: g.left, right: g.right },
    chips: [...group.querySelectorAll(".cc-menu span")].map((span) => {
      const r = span.getBoundingClientRect();
      return { text: span.textContent, left: r.left, right: r.right, top: Math.round(r.top), width: r.width, height: r.height, cut: span.scrollWidth > span.clientWidth + 1 };
    }),
  };
}

/** Runs in the page: each meal row's tile, its badge (if any) and what of its name is hidden, and the tokens' colours. */
function readRows() {
  const token = (name) => {
    const probe = document.body.appendChild(document.createElement("div"));
    probe.style.color = `var(${name})`;
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  };
  const rows = [...document.getElementById("cc-meals").children].map((li) => {
    const tile = li.querySelector(".cc-thumb").getBoundingClientRect();
    const badge = li.querySelector(".cc-thumb .cc-qty");
    const hidden = [...li.querySelector(".cc-name").querySelectorAll(".visually-hidden")].map((n) => n.getBoundingClientRect()).map((r) => [r.width, r.height]);
    if (!badge) return { badge: null, hidden, button: Boolean(li.querySelector("button.cc-meal")) };
    const b = badge.getBoundingClientRect();
    const cs = getComputedStyle(badge);
    return {
      button: Boolean(li.querySelector("button.cc-meal")),
      hidden,
      tile: { right: tile.right, top: tile.top },
      badge: {
        drawn: badge.checkVisibility(),
        width: b.width,
        height: b.height,
        cx: b.left + b.width / 2,
        cy: b.top + b.height / 2,
        radius: parseFloat(cs.borderTopLeftRadius),
        background: cs.backgroundColor,
        color: cs.color,
        figure: getComputedStyle(badge, "::before").content,
      },
    };
  });
  return { rows, navy: token("--navy"), white: token("--white") };
}

/** The content's line of a meal, as the card's words write it (data/messages.json meal_qty), worked out here. */
const lineOf = (m) => (m.qty > 1 ? messages.chefs_choice.meal_qty.replace("{meal}", m.display).replace("{n}", String(m.qty)) : m.display);

test("UC8 (Chrome, 390 and 1280): the five chips sit evenly, no row of one; a meal twice is a circled count on its tile's corner", { timeout: TIMEOUT_MS }, async () => {
  const cart = picks.lists["chefs-choice"].carts.find((c) => c.lunch_dinner === "or" && !c.weekends && c.breakfast);
  assert.ok(Object.keys(picks.lists).length === 5 && cart.items.some((m) => m.qty > 1), "control: five menus, and a meal twice in the cart");
  await weekSite();
  for (const width of WIDTHS) {
    await withPage({ dir: weekOut, hash: TWICE, width }, async (page) => {
      const where = `${width.width}`;
      await page.waitForSelector("#cc-list:not([hidden])");
      const { drawn, chips, group } = await page.evaluate(readChips);
      assert.equal(drawn, true, `${where}: the chooser is drawn`);
      assert.equal(chips.length, 5, `${where}: five chips`);
      const rows = [...new Set(chips.map((c) => c.top))].sort((a, b) => a - b).map((top) => chips.filter((c) => c.top === top));
      assert.deepEqual(rows.map((r) => r.length), [3, 2], `${where}: three, then two (${rows.map((r) => r.map((c) => c.text).join(" | ")).join(" / ")})`);
      for (const row of rows) {
        const widths = row.map((c) => c.width);
        assert.ok(Math.max(...widths) - Math.min(...widths) <= EVEN_PX, `${where}: a row's chips one width (${widths.map(Math.round)})`);
        assert.ok(Math.abs(row[0].left - group.left) <= EVEN_PX && Math.abs(row.at(-1).right - group.right) <= EVEN_PX, `${where}: each row the group's width`);
        const heights = row.map((c) => c.height);
        assert.ok(Math.max(...heights) - Math.min(...heights) <= EVEN_PX, `${where}: a row's chips one height (${heights.map(Math.round)})`);
      }
      for (const c of chips) {
        assert.equal(c.cut, false, `${where}: ${c.text}: no word cut off`);
        assert.ok(Math.min(c.width, c.height) >= TARGET_PX - 0.5, `${where}: ${c.text}: at least ${TARGET_PX} px (${Math.round(c.width)} × ${Math.round(c.height)})`);
      }

      const { rows: meals, navy, white } = await page.evaluate(readRows);
      assert.equal(meals.length, cart.items.length, `${where}: control: a row per meal`);
      let named = 0;
      for (const [i, meal] of cart.items.entries()) {
        const row = meals[i];
        const at = `${where}, ${meal.display}`;
        if (meal.qty === 1) {
          assert.equal(row.badge, null, `${at}: once, no badge`);
          assert.deepEqual(row.hidden, [], `${at}: nothing of its line hidden`);
          continue;
        }
        const b = row.badge;
        assert.ok(b && b.drawn, `${at}: a badge drawn`);
        assert.ok(Math.abs(b.width - b.height) <= EVEN_PX && b.radius >= b.height / 2 - 0.5, `${at}: a circle (${Math.round(b.width)} × ${Math.round(b.height)}, radius ${b.radius})`);
        assert.ok(Math.abs(b.cx - row.tile.right) <= b.height / 2 && Math.abs(b.cy - row.tile.top) <= b.height / 2, `${at}: on the tile's top-right corner`);
        assert.deepEqual([b.background, b.color], [navy, white], `${at}: navy with white figures, the template's tokens`);
        assert.equal(b.figure, `"${meal.qty}"`, `${at}: the figure ${meal.qty}`);
        assert.ok(row.hidden.length > 0 && row.hidden.every(([w, h]) => w <= 1 && h <= 1), `${at}: its "× ${meal.qty}" not drawn`);
        if (row.button) {
          const handle = (await page.$$("#cc-meals > li"))[i];
          const name = (await page.accessibility.snapshot({ root: await handle.$("button.cc-meal") }))?.name;
          assert.equal(name, lineOf(meal), `${at}: the count in the row's accessible name`);
          named++;
        }
      }
      assert.ok(named > 0, `${where}: control: a meal twice whose row is a button, its name read from Chrome's accessibility tree`);
      await render(page, "#result", `uc8-card-${width.width}`);
    });
  }
});

test("The save step's states and See all plans, in Chrome at 390 (items 2, 3, 7): drawn as the cases say; their PNGs with UC_RENDERS", { timeout: TIMEOUT_MS }, async () => {
  await devWeekSite();
  const width = VIEWPORTS.w390;
  const plan = "#lean-or-7d";
  const drawn = (page, id) => page.evaluate((x) => Boolean(document.getElementById(x)?.checkVisibility()), id);
  await withPage({ dir: devWeekOut, hash: plan, width }, async (page) => {
    await page.waitForSelector("#cc-list:not([hidden])");
    assert.equal(await drawn(page, "save"), true, "open: the step, beside the card's checkout button");
    assert.equal(await drawn(page, "save-form"), true, "open: its form");
    await render(page, "#offer-box", "uc1-offer-box-in-page-390");
    await renderSpan(page, "#result", "#save", 8, "uc2-step-open-390");
    await page.type("#save-email", "not-an-address");
    await page.click("#save-submit");
    const under = await page.evaluate(() => {
      const input = document.getElementById("save-email").getBoundingClientRect();
      const error = document.getElementById("save-email-error").getBoundingClientRect();
      const zip = document.getElementById("save-zip").closest("label").getBoundingClientRect();
      return { drawn: document.getElementById("save-email-error").checkVisibility(), below: error.top >= input.bottom - 1, above: error.bottom <= zip.top + 1 };
    });
    assert.deepEqual(under, { drawn: true, below: true, above: true }, "an email refused: its message drawn under the email field, above the ZIP code's");
    await render(page, "#save", "uc3-step-email-error-390");
    await page.$eval("#save-email", (el) => { el.value = ""; });
    await page.type("#save-email", "dummy-uc@example.com");
    await page.type("#save-zip", "02118");
    await page.click("#save-submit");
    await page.waitForSelector("#save-done:not([hidden])");
    const left = await page.evaluate(() => [...document.querySelectorAll("#save *")].filter((n) => n.checkVisibility() && [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())).map((n) => n.id || n.className));
    assert.deepEqual(left.filter((n) => n !== "draft-tag"), ["save-done", "save-done-email"], "saved: only the done line drawn (the DRAFT tag apart)");
    await render(page, "#save", "uc2-step-saved-390");
    await page.click("#all-link");
    await page.waitForSelector("#all[open]");
    const prices = await page.evaluate(() => [...document.querySelectorAll("#all .cell small")].map((small) => ({
      struck: small.querySelector("s")?.checkVisibility() ? small.querySelector("s").textContent : null,
      now: small.querySelector(".cell-now")?.textContent ?? null,
    })));
    assert.ok(prices.length > 0 && prices.every((p) => p.struck && p.now), "See all plans: each weekly price beside its struck one");
    const cents = (s) => Number(s.replace(/[^\d]/g, ""));
    assert.ok(prices.every((p) => cents(p.struck) > cents(p.now)), "the struck price above the price paid, never below it");
    await render(page, "#all .all-box", "uc7-all-plans-390");
  });
  await withPage({ dir: devWeekOut, hash: plan, width, now: Date.parse("2026-10-30T16:00:00.000Z") }, async (page) => {
    await page.waitForSelector("#cc-list:not([hidden])");
    assert.equal(await drawn(page, "offer-box"), false, "after the offer's end: no box");
    assert.equal(await drawn(page, "save"), true, "the step, with no offer (§ 1.2 item 3)");
    assert.deepEqual(
      await page.evaluate(() => ["save-step-offer", "save-lead", "save-lead-later", "save-submit-later"].map((id) => document.getElementById(id).checkVisibility())),
      [false, false, true, true],
      "no offer line, its own lead and button",
    );
    await renderSpan(page, "#top", "main .tabs", 40, "uc9-after-the-offer-top-390");
    await renderSpan(page, "#result", "#save", 8, "uc9-step-after-the-offer-390");
  });
  await withPage({ dir: devWeekOut, hash: "#lean-or-5d", width }, async (page) => {
    await page.waitForSelector("#cc-list:not([hidden])");
    const card = await page.evaluate(() => ({
      meals: document.querySelectorAll("#cc-meals > li").length,
      figures: ["result-total", "result-per-meal", "result-meals"].map((id) => document.getElementById(id).textContent.trim()),
    }));
    assert.equal(card.meals, 5, "control: a row of five meals on the 4 plan");
    const lean4 = plansData.individual.find((p) => p.id === "lean").counts.find((c) => c.meals_per_week === 4).price_per_meal_cents;
    assert.deepEqual(card.figures.slice(1), [`$${(lean4 / 100).toFixed(2)}`, "5"], "the plan's price a meal; the five meals it lists");
    assert.equal(card.figures[0], `$${((lean4 * 5) / 100).toFixed(2)}`, "its weekly price, five at the plan's price a meal (§ 1.2 item 1)");
    await render(page, "#result", "uc6-card-5-meals-390");
  });
});
