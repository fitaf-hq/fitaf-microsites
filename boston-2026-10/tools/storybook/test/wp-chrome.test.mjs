// SP15's Chrome half (the site's SPEC-save-offer-production.md § 10.3 item 4), here because this package drives Chrome
// and the site never installs a driver: the Worker's pages in the site's look, as a visitor's browser draws them.
//   - The saved offer's page (/o/<token>) at 390 and 1280: the template's body font in use and loaded (its family read
//     from the template's --body token), the logo drawn and linking to /?via=email (§ 10, below), the page's one action
//     (the orange button) at least 64 CSS px tall in the store button's orange (read from the template's --cta token),
//     the content in one column (16 px from the edge at 390; at most 680 px wide and centred at 1280), and nothing wider
//     than the viewport.
//   - The confirmation page and the ended offer's page (a lapse page) at 390: the same stylesheet as the saved offer's,
//     the font loaded and the logo drawn; the ended offer's link back the quieter style (no orange button).
// The Worker is the site's development Worker in Miniflare with its local D1 (test/worker-harness.mjs), the saves made by
// the site's own helpers; its static files (the fonts, the logo) are answered as its assets would be, from the site's
// own build (copyStatic), since a Worker's assets are served before it. Nothing else is requested. The page's words and
// rules are read from the site, never written here (SM-4).
// SPEC-the-redirect.md § 4 (2026-10-27): the saved offer's link back to the page carries via=email before its fragment,
// /?e=<event>&via=email#from-email, as the site's SP15 has read it since that contract; this half was left for the
// Storybook run (its § 9, "Not done here") and amended at the merge into the dev line (its § 9.1).
// SPEC-the-redirect.md § 10 item 1 (2026-10-27): on the offer page (/o/<code>, the saved offer's and the ended offer's
// here) the logo links to /?via=email; every other Worker page's (the confirmation's here) to /, as the site's SP15 reads
// them since § 10. Left for the Storybook run (its § 10.1, "Not done here"); amended at the merge (its § 10.2).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { VIEWPORTS } from "../microsite/layout.js";
import { siteFile } from "../microsite/paths.mjs";
import { freshChrome } from "./chrome.mjs";

const site = (...parts) => import(pathToFileURL(siteFile(...parts)).href);
const { copyStatic } = await site("build.mjs");
const { insertRows, saveRows } = await site("scripts", "dummy-saves.mjs");
const { validateSave } = await site("src", "worker", "validate-save.js");
const { startWorker, TEST_NOW_MS, validSave } = await site("test", "worker-harness.mjs");
const { savedAndSent } = await site("test", "confirm-fixture.mjs");

/** § 10.3 item 2: the button "at least 64 CSS px tall". */
const TARGET_PX = 64;
/** § 10.3 item 1: one column, at most 680 px, with 16 px side gutters at 390. */
const COLUMN_MAX_PX = 680;
const GUTTER_PX = 16;
const TYPES = { ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };

const template = await readFile(siteFile("src", "template.html"), "utf8");
const token = (name) => new RegExp(`${name}:\\s*([^;]+);`).exec(template)[1].trim();
const firstFamily = (stack) => stack.split(",")[0].trim().replace(/^["']|["']$/g, "");
const BODY_FAMILY = firstFamily(token("--body"));
const HEAD_FAMILY = firstFamily(token("--head"));
const rgbOf = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
const CTA_RGB = rgbOf(token("--cta"));

// The Worker's static files, as the site's build copies them (fonts/, assets/).
const statics = await mkdtemp(join(tmpdir(), "fitaf-storybook-wp-static-"));
after(() => rm(statics, { recursive: true, force: true }));
await copyStatic(statics, { base: null, sheets: [] });

// The Workers' clocks are the site harness's (SPEC-save-offer-production § 10.7): one on a day of the offer, for the saved
// offer and the confirmation; one after its last day, for the ended offer's page (the lapse).
const { mf, db } = await startWorker();
const late = await startWorker({ now: Date.parse("2026-10-30T16:00:00.000Z") });
after(() => Promise.all([mf.dispose(), late.mf.dispose()]));
const origin = new URL(await mf.ready).origin;
const lateOrigin = new URL(await late.mf.ready).origin;

// The saves, made on the harness's day: one for each Worker, and the confirmation fixture's (a token the system minted).
const live = saveRows(validateSave(validSave({ email: "dummy-wp-live@example.com" })), { nowMs: TEST_NOW_MS });
const ended = saveRows(validateSave(validSave({ email: "dummy-wp-ended@example.com" })), { nowMs: TEST_NOW_MS });
await insertRows(db, [live]);
await insertRows(late.db, [ended]);
const tokens = await savedAndSent(mf, db);
const PAGES = {
  saved: { origin, path: `/o/${live.saveRow.offer_code}` },
  ended: { origin: lateOrigin, path: `/o/${ended.saveRow.offer_code}` },
  confirmation: { origin, path: `/confirm/${tokens.yes.token}` },
};

/** `fn(page)` on the Worker's `path`, `width` wide, in a fresh Chrome; the Worker's static paths answered from the build,
 *  every other request to the Worker passed on, any other origin refused (and recorded). */
async function withPage({ origin, path }, width, fn) {
  const chrome = await freshChrome();
  try {
    const page = await chrome.browser.newPage();
    const viewport = width === VIEWPORTS.w390.width ? VIEWPORTS.w390 : VIEWPORTS.w1280;
    await page.setViewport({ width, height: viewport.height });
    await page.setRequestInterception(true);
    const outside = [];
    page.on("request", async (r) => {
      const url = new URL(r.url());
      if (url.origin !== origin) {
        outside.push(r.url());
        return r.abort();
      }
      if (/^\/(fonts|assets)\//.test(url.pathname)) {
        const body = await readFile(join(statics, url.pathname)).catch(() => null);
        return body
          ? r.respond({ status: 200, contentType: TYPES[extname(url.pathname)] ?? "application/octet-stream", body })
          : r.respond({ status: 404, body: "" });
      }
      return r.continue();
    });
    const response = await page.goto(`${origin}${path}`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const result = await fn(page, response);
    assert.deepEqual(outside, [], "nothing requested outside the Worker");
    return result;
  } finally {
    await chrome.close();
  }
}

/** Runs in the page: what § 10.3's cases read. */
function readLook() {
  const main = document.querySelector("main") ?? document.body; // a page without its column is read whole, and fails
  const logo = document.querySelector("main a.logo img");
  const actions = [...document.querySelectorAll(".action a")];
  const box = (el) => el.getBoundingClientRect().toJSON();
  const style = getComputedStyle;
  return {
    bodyFamily: style(document.body).fontFamily,
    headFamily: style(document.querySelector("h1")).fontFamily,
    loaded: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/^["']|["']$/g, "")),
    logo: logo ? { complete: logo.complete, natural: logo.naturalWidth, href: logo.closest("a").getAttribute("href"), box: box(logo) } : null,
    actions: actions.map((a) => ({ box: box(a), background: style(a).backgroundColor, href: a.getAttribute("href") })),
    links: [...document.querySelectorAll("main a:not(.logo)")].map((a) => ({ decoration: style(a).textDecorationLine, background: style(a).backgroundColor })),
    main: box(main),
    content: { left: box(main.firstElementChild).left, right: Math.max(...[...main.children].map((c) => box(c).right)) },
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    sheet: [...document.querySelectorAll("style")].map((s) => s.textContent).join("\n"),
  };
}

/** § 10 item 1: the offer page's logo link, and every other Worker page's. */
const OFFER_LOGO_HREF = "/?via=email";
const LOGO_HREF = "/";

function assertLook(look, where, logoHref) {
  assert.equal(firstFamily(look.bodyFamily), BODY_FAMILY, `${where}: the body in the template's --body font`);
  assert.equal(firstFamily(look.headFamily), HEAD_FAMILY, `${where}: the heading in the template's --head font`);
  assert.ok(look.loaded.includes(BODY_FAMILY), `${where}: ${BODY_FAMILY} loaded from the site's /fonts/ (${look.loaded})`);
  assert.ok(look.logo, `${where}: the logo`);
  assert.ok(look.logo.complete && look.logo.natural > 0, `${where}: the logo drawn`);
  assert.equal(look.logo.href, logoHref, `${where}: the logo links to ${logoHref}`);
  assert.ok(look.scrollWidth <= look.innerWidth, `${where}: nothing wider than the viewport`);
}

for (const viewport of [VIEWPORTS.w390, VIEWPORTS.w1280]) {
  test(`SP15 (Chrome): the saved offer's page at ${viewport.width} — the site's look, the logo, one orange button at least ${TARGET_PX} px tall`, { timeout: 120_000 }, async () => {
    const look = await withPage(PAGES.saved, viewport.width, async (page, response) => {
      assert.equal(response.status(), 200);
      return page.evaluate(readLook);
    });
    const where = `/o at ${viewport.width}`;
    assertLook(look, where, OFFER_LOGO_HREF);
    assert.equal(look.actions.length, 1, `${where}: one action`);
    const [action] = look.actions;
    assert.ok(action.box.height >= TARGET_PX, `${where}: the button ${action.box.height} px tall`);
    assert.equal(action.background, CTA_RGB, `${where}: the store button's orange`);
    assert.match(action.href, /^\/\?e=[a-z0-9-]+&via=email#from-email$/, `${where}: back to the page, via=email since SPEC-the-redirect.md § 4`);
    if (viewport.width === VIEWPORTS.w390.width) {
      assert.equal(Math.round(look.content.left), GUTTER_PX, `${where}: ${GUTTER_PX} px from the left edge`);
      assert.ok(Math.round(look.innerWidth - look.content.right) >= GUTTER_PX, `${where}: and from the right`);
    } else {
      assert.ok(look.main.width <= COLUMN_MAX_PX, `${where}: the column at most ${COLUMN_MAX_PX} px (${look.main.width})`);
      assert.ok(Math.abs(look.main.left - (look.innerWidth - look.main.right)) <= 1, `${where}: centred`);
    }
  });
}

test("SP15 (Chrome): the confirmation page and the ended offer's page at 390 — the same stylesheet, the font, the logo; the ended page's link back the quieter style", { timeout: 120_000 }, async () => {
  const saved = await withPage(PAGES.saved, VIEWPORTS.w390.width, (page) => page.evaluate(readLook));
  for (const [name, path, logoHref] of [["the confirmation", PAGES.confirmation, LOGO_HREF], ["the ended offer", PAGES.ended, OFFER_LOGO_HREF]]) {
    const look = await withPage(path, VIEWPORTS.w390.width, async (page, response) => {
      assert.equal(response.status(), 200, `${name}: 200`);
      return page.evaluate(readLook);
    });
    assertLook(look, name, logoHref);
    assert.equal(look.sheet, saved.sheet, `${name}: the saved offer's stylesheet`);
    assert.equal(look.actions.length, 0, `${name}: no orange button`);
    if (name === "the ended offer") {
      assert.ok(look.links.length >= 1, "control: the ended offer's link back");
      for (const link of look.links) {
        assert.equal(link.decoration, "underline", "the quieter style: underlined");
        assert.notEqual(link.background, CTA_RGB, "and not orange");
      }
    }
  }
});
