// The site's SPEC-ui-and-copy-pass.md § 4 (round 2, changeset 2 of the Advisor's UI and copy pass, 2026-10-26), as drawn,
// in Chrome at 390 and 1280 (the 1280 page in § 3's desktop column), here because this package drives Chrome and the
// site never installs a driver (uq-chrome is the model; the site's UC11–UC13 hold the markup and the behaviour):
//   UC11 (A): the start drawn, the first question and the first meal question alone; a tap draws the next question and
//   moves neither the scroll nor the focus off the tapped answer; the meal size draws the result card with Not ready?.
//   UC12 (B): Not ready? drawn below the card's checkout, centred, at least 44 px, never orange; pressed, the save step
//   drawn in a modal dialog (the top layer); Esc (the browser's own), its close button and a press on the backdrop
//   close it, focus back on Not ready?; the dialog named as the step is.
//   UC13 (C): the banner drawn after the result card (and Not ready?) and before the foot, at the start and on Family
//   too: the column's width, at least 64 px, --ice, the radius, the words at its left and the arrow at its right;
//   hover darkens its border to --field.
//   No sideways scroll at either width.
// The pages are the site's own builds (`node build.mjs [--env dev] --out`, as the stories' pages are built) with the week
// delivered 2026-11-01 in #picks-data, the clock at noon in New York on 2026-10-24, served on 127.0.0.1; nothing else is
// requested. No word or rule of the page is written here (SM-4): elements are found by their ids, colours by the
// page's own tokens. With UC_RENDERS=<directory> the cases also write their PNGs there, for the Advisor's look (never
// committed): § 4 D item 4's states, the start, the middle of the sequence, all revealed with the result and Not ready?,
// the dialog open and the banner, at both widths.
// ⚠ AMENDED by § 4.2 item 1 (2026-10-26): the start is the first question alone, so UC11's walk begins with Just me.
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
/** Answers with the week's cart (lunch or dinner, every day): the card's checkout, so Not ready?. */
const CHECKOUT = "#lean-or-7d";
/** The sequence a visitor taps (A item 1, snacks carted as committed: the meal size after breakfast), each answer, from
 *  the start's first question (§ 4.2 item 1). */
const WALK = [
  ["#who-individual", "#q-lunch_dinner"],
  ['[data-q="lunch_dinner"][data-a="or"]', "#q-weekends"],
  ['[data-q="weekends"][data-a="yes"]', "#q-breakfast"],
  ['[data-q="breakfast"][data-a="no"]', "#q-goal"],
  ['[data-goal="lean"]', "#result"],
];
/** B item 1, C item 2: the least heights. */
const NOT_READY_PX = 44;
const BANNER_PX = 64;
/** A layout's tolerance: sub-pixel rounding. */
const EVEN_PX = 1;

const prodOut = await mkdtemp(join(tmpdir(), "fitaf-storybook-uc11-prod-"));
const devOut = await mkdtemp(join(tmpdir(), "fitaf-storybook-uc11-dev-"));
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

/** The viewport as it is (a dialog open over the page), when UC_RENDERS names a directory. */
async function renderViewport(page, name) {
  if (!RENDERS) return;
  await mkdir(RENDERS, { recursive: true });
  await page.screenshot({ path: join(RENDERS, `${name}.png`) });
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
    out[sel] = { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, left: r.left, right: r.right, width: r.width, height: r.height };
  }
  return out;
}

/** Runs in the page: how far the page scrolls sideways. */
const sideways = () => document.documentElement.scrollWidth - document.documentElement.clientWidth;

/** Runs in the page: a token's colour as the browser computes a colour (rgb()), read off the page's own :root. */
function tokenColour(name) {
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  document.body.append(probe);
  const rgb = getComputedStyle(probe).color;
  probe.remove();
  return rgb;
}

/** Runs in the page: the drawn look of `sel` that UC12 and UC13 read. */
function lookOf(sel) {
  const el = document.querySelector(sel);
  const s = getComputedStyle(el);
  const after = getComputedStyle(el, "::after");
  const text = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
  const range = document.createRange();
  range.selectNodeContents(text);
  const words = range.getBoundingClientRect();
  const box = el.getBoundingClientRect();
  return {
    color: s.color,
    background: s.backgroundColor,
    border: s.borderTopColor,
    radius: s.borderTopLeftRadius,
    decoration: s.textDecorationLine,
    family: s.fontFamily,
    weight: s.fontWeight,
    size: s.fontSize,
    arrow: after.content,
    wordsLeft: words.left - box.left,
    wordsRight: box.right - words.right,
    width: box.width,
    height: box.height,
    centre: box.left + box.width / 2,
  };
}

for (const width of WIDTHS) {
  for (const [build, dir] of BUILDS) {
    test(`UC11 (${build}, ${width.width}): the start drawn, a tap drawing the next question, the scroll and focus left where they were; the meal size the result (Chrome)`, { timeout: TIMEOUT_MS }, async () => {
      await sites();
      await withPage({ dir, width }, async (page) => {
        await page.waitForSelector("#q-who", { visible: true });
        const start = await page.evaluate(boxes, ["#q-who", "#q-lunch_dinner", "#panel-family .family-card", "#q-weekends", "#q-breakfast", "#q-goal", "#result", "#not-ready", "#why-link", "footer"]);
        assert.ok(start["#q-who"], "the first question drawn");
        for (const sel of ["#q-lunch_dinner", "#panel-family .family-card", "#q-weekends", "#q-breakfast", "#q-goal", "#result", "#not-ready"]) assert.equal(start[sel], null, `${sel} not drawn at the start`);
        assert.ok(start["#why-link"] && start.footer, "the foot drawn at the start (§ 4.2 item 4)");
        await renderSpan(page, "#top", "footer", 0, `uc11-start-${build}-${width.width}`);
        for (const [i, [press, next]] of WALK.entries()) {
          // The answer in view first, so the press itself scrolls nothing (puppeteer scrolls a control into view to press
          // it); the next question drawn after the browser's hashchange (asynchronous), hence the wait for it visible.
          await page.$eval(press, (el) => el.scrollIntoView({ block: "center" }));
          const scrolled = await page.evaluate(() => window.scrollY);
          await page.click(press);
          await page.waitForSelector(next, { visible: true });
          const drawn = await page.evaluate(boxes, [next]);
          assert.ok(drawn[next], `after ${press}: ${next} drawn`);
          assert.equal(await page.evaluate(() => window.scrollY), scrolled, `after ${press}: the page did not scroll`);
          assert.equal(await page.evaluate((sel) => document.activeElement === document.querySelector(sel), press), true, `after ${press}: the focus is still on the tapped answer`);
          if (i === 1) await renderSpan(page, "#q-who", "#q-weekends + .choices", 16, `uc11-middle-${build}-${width.width}`);
        }
        const end = await page.evaluate(boxes, ["#result", "#not-ready", "#cc-checkout"]);
        assert.ok(end["#result"] && end["#cc-checkout"] && end["#not-ready"], "the result card, its checkout and Not ready? drawn");
        await renderSpan(page, "#q-who", "#not-ready", 16, `uc11-all-revealed-${build}-${width.width}`);
        assert.equal(await page.evaluate(sideways), 0, "no sideways scroll");
      });
    });

    test(`UC12 (${build}, ${width.width}): Not ready? below the checkout; the save step in a modal dialog that Esc, × and the backdrop close, focus back (Chrome)`, { timeout: TIMEOUT_MS }, async () => {
      await sites();
      await withPage({ dir, hash: CHECKOUT, width }, async (page) => {
        await page.waitForSelector("#not-ready:not([hidden])");
        const b = await page.evaluate(boxes, ["#cc-checkout", "#not-ready", "#result", "#save", "#save-dialog"]);
        assert.ok(b["#not-ready"].top >= b["#cc-checkout"].bottom, "Not ready? below the card's checkout");
        assert.ok(b["#not-ready"].bottom <= b["#result"].bottom, "inside the result card");
        assert.equal(b["#save"], null, "nothing of the save step drawn in the page");
        assert.equal(b["#save-dialog"], null, "the dialog closed");
        const look = await page.evaluate(lookOf, "#not-ready");
        assert.ok(look.height >= NOT_READY_PX, `at least ${NOT_READY_PX} px tall (${look.height})`);
        assert.equal(look.color, await page.evaluate(tokenColour, "--navy"), "navy");
        assert.equal(look.decoration, "underline", "underlined");
        for (const token of ["--cta", "--orange"]) assert.notEqual(look.background, await page.evaluate(tokenColour, token), `never ${token}`);
        assert.ok(Math.abs(look.centre - (b["#result"].left + b["#result"].width / 2)) <= EVEN_PX, "centred in the card");
        const open = async () => {
          await page.click("#not-ready");
          await page.waitForSelector("#save-dialog[open]");
          return page.evaluate(() => ({
            modal: document.querySelector("#save-dialog").matches(":modal"),
            form: document.querySelector("#save-form").checkVisibility(),
            inside: document.querySelector("#save-dialog").contains(document.querySelector("#save")),
          }));
        };
        const closedTo = () => page.evaluate(() => ({ open: document.querySelector("#save-dialog").open, focus: document.activeElement?.id ?? null }));
        assert.deepEqual(await open(), { modal: true, form: true, inside: true }, "pressed: a modal dialog, the step's form drawn in it");
        const name = await page.evaluate(() => document.getElementById(document.querySelector("#save-dialog").getAttribute("aria-labelledby")).textContent.trim());
        const node = await page.accessibility.snapshot({ root: await page.$("#save-dialog"), interestingOnly: false });
        assert.equal(node?.name, name, "the dialog named as the step is");
        await renderViewport(page, `uc12-dialog-${build}-${width.width}`);
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => !document.querySelector("#save-dialog").open);
        assert.deepEqual(await closedTo(), { open: false, focus: "not-ready" }, "Esc closes it, focus back on Not ready?");
        await open();
        await page.click('#save-dialog [aria-label="Close"]');
        await page.waitForFunction(() => !document.querySelector("#save-dialog").open);
        assert.deepEqual(await closedTo(), { open: false, focus: "not-ready" }, "× closes it, focus back");
        await open();
        await page.mouse.click(2, 2);
        await page.waitForFunction(() => !document.querySelector("#save-dialog").open);
        assert.deepEqual(await closedTo(), { open: false, focus: "not-ready" }, "a press on the backdrop closes it, focus back");
        assert.equal(await page.evaluate(sideways), 0, "no sideways scroll");
      });
    });

    test(`UC13 (${build}, ${width.width}): the banner drawn before the foot, at the start, on Family and after Not ready? — the column's width, --ice, its words left and its arrow right (Chrome)`, { timeout: TIMEOUT_MS }, async () => {
      await sites();
      for (const hash of ["", "#family", CHECKOUT]) {
        await withPage({ dir, hash, width }, async (page) => {
          await page.waitForSelector("#q-who");
          if (hash === CHECKOUT) await page.waitForSelector("#not-ready:not([hidden])");
          const b = await page.evaluate(boxes, ["#why-link", "#result", "#not-ready", "footer", "main"]);
          const where = hash || "(no fragment)";
          assert.ok(b["#why-link"], `${where}: drawn`);
          for (const above of ["#result", "#not-ready"]) if (b[above]) assert.ok(b["#why-link"].top >= b[above].bottom, `${where}: below ${above}`);
          assert.ok(b["#why-link"].bottom <= b.footer.top, `${where}: above the foot`);
          const column = await page.evaluate(() => {
            const m = document.querySelector("main");
            const s = getComputedStyle(m);
            return m.getBoundingClientRect().width - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
          });
          const look = await page.evaluate(lookOf, "#why-link");
          assert.ok(Math.abs(look.width - column) <= EVEN_PX, `${where}: the column's width (${look.width} of ${column})`);
          assert.ok(look.height >= BANNER_PX, `${where}: at least ${BANNER_PX} px tall (${look.height})`);
          assert.equal(look.background, await page.evaluate(tokenColour, "--ice"), `${where}: on --ice`);
          assert.equal(look.color, await page.evaluate(tokenColour, "--navy"), `${where}: navy words`);
          assert.equal(look.weight, "600", `${where}: the heading type's weight`);
          assert.match(look.family, /Poppins/, `${where}: the heading type`);
          assert.ok(look.wordsLeft < look.wordsRight, `${where}: its words at its left (${look.wordsLeft} px in; ${look.wordsRight} px to the right edge, the arrow's side)`);
          assert.match(look.arrow, /→/, `${where}: the arrow`);
          assert.notEqual(look.radius, "0px", `${where}: the radius`);
          assert.ok(parseFloat(look.radius) < look.height / 2, `${where}: not a pill (${look.radius})`);
          if (hash === CHECKOUT) {
            await renderSpan(page, "#result", "footer", 0, `uc13-banner-${build}-${width.width}`);
            await page.hover("#why-link");
            assert.equal((await page.evaluate(lookOf, "#why-link")).border, await page.evaluate(tokenColour, "--field"), "hover: its border --field, as the cards'");
          }
          assert.equal(await page.evaluate(sideways), 0, `${where}: no sideways scroll`);
        });
      }
    });
  }
}
