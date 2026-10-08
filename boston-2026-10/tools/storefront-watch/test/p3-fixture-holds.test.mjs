// P3, plumbing for the Storybook's Hand-off stories (SPEC-storybook-microsite § 8.3): the synthetic store's two holds,
// in headless Chrome on 127.0.0.1, with the SHIPPED block placed as the store's Custom Scripts Footer places it (the
// Footer file's text, injected by the fixture as the store's injectSlot does) and the link the site's own payload code
// writes. Skipped without Chrome.
//   P3a `hangAtStart`: the block's first poll is its last: the screen comes up and stays, with no slide, nothing pressed
//       and nothing counted. Control: the same link and block without it gets its first slide.
//   P3b `routeHeld`: every meal added and CHECKOUT pressed, the store does not route: the page stays at /order, the
//       screen at its last step (the bar full), window.__fixtureRoute a function; calling it routes to /checkout and the
//       block finishes there (its done line, the step bar). Control: without it, done with no call.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sleep } from "../lib/browser.mjs";
import { VIEWPORTS } from "../lib/config.mjs";
import { scriptFromFile } from "../lib/smoke.mjs";
import { startStore } from "./browser-store.mjs";
import { browserFor, DONE, linkFor, shipped, skip } from "./r2-browser.mjs";

/** Longer than the block's polls (200 ms) and its gap between presses (300 ms) several times over. */
const HOLD_LOOK_MS = 2_000;
const WIDTH = 1280;

let store;
let browser;
let site;
let footer;
before(async () => {
  if (skip) return;
  store = await startStore();
  browser = await browserFor();
  site = await shipped();
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-p3-"));
  try {
    await site.code.buildStorefront({ outDir: dir });
    footer = scriptFromFile(await readFile(join(dir, "fitaf-handoff.html"), "utf8"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
after(async () => {
  await browser?.close();
  await store?.close();
});

/** The link opened in a fresh context, the block in the store's Footer; `fn({ page, lines })` reads it. */
async function withFooterRun(cfg, fn) {
  store.set({ footer, photos: {}, ...cfg });
  const context = await browser.browser.createBrowserContext();
  try {
    const page = await context.newPage();
    await page.setViewport(VIEWPORTS[WIDTH]);
    const lines = [];
    page.on("console", (m) => lines.push(m.text()));
    await page.goto(linkFor(site.code, store.origin), { waitUntil: "load" });
    return await fn({ page, lines });
  } finally {
    await context.close();
  }
}

/** In the page: the screen, its slides, its bar's width, the store's pending meals, the path. */
const read = () => ({
  screen: Boolean(document.getElementById("fitaf-screen")),
  slides: document.querySelectorAll("#fitaf-screen .c > *").length,
  bar: document.querySelector("#fitaf-screen .b i")?.style.width ?? null,
  pending: JSON.parse(localStorage.getItem("hmp_pending_plan_items") || "{}")["21"] ?? [],
  cards: document.querySelectorAll("app-product-card").length,
  path: location.pathname,
  route: typeof window.__fixtureRoute,
  steps: Boolean(document.getElementById("fitaf-bar")),
});

test("P3a: hangAtStart — the block's first poll is its last: the screen up, no slide, nothing pressed; control: without it, the first slide", { skip, timeout: 60_000 }, async () => {
  await withFooterRun({ hangAtStart: true }, async ({ page, lines }) => {
    await page.waitForFunction(() => document.getElementById("fitaf-screen") && document.querySelectorAll("app-product-card").length > 0, { timeout: 15_000 });
    await sleep(HOLD_LOOK_MS);
    const r = await page.evaluate(read);
    assert.deepEqual([r.screen, r.slides, r.pending, r.cards > 0], [true, 0, [], true], `held before the first press: ${JSON.stringify(r)}`);
    assert.deepEqual(lines.filter((l) => l.startsWith("[fixture] pressed") || l.startsWith("[fitaf-handoff] done")), []);
  });
  await withFooterRun({}, async ({ page }) => {
    await page.waitForFunction(() => document.querySelectorAll("#fitaf-screen .c > *").length > 0, { timeout: 15_000 });
    assert.ok((await page.evaluate(read)).pending.length > 0, "control: without the hold, the block presses");
  });
});

test("P3b: routeHeld — CHECKOUT pressed, the store holds its route until window.__fixtureRoute(); then done at /checkout; control: without it, done at once", { skip, timeout: 90_000 }, async () => {
  await withFooterRun({ routeHeld: true }, async ({ page, lines }) => {
    await page.waitForFunction(() => typeof window.__fixtureRoute === "function", { timeout: 30_000 });
    await sleep(HOLD_LOOK_MS);
    const held = await page.evaluate(read);
    assert.deepEqual([held.path, held.screen, held.bar, held.pending.length, held.route], ["/order", true, "100%", 7, "function"], `held: ${JSON.stringify(held)}`);
    assert.ok(lines.includes("[fixture] pressed CHECKOUT NOW"), "the store's CHECKOUT was pressed");
    assert.ok(!lines.includes(DONE), "no done while the route is held");
    await page.evaluate(() => window.__fixtureRoute());
    await page.waitForFunction(() => document.getElementById("fitaf-bar"), { timeout: 15_000 });
    const released = await page.evaluate(read);
    assert.deepEqual([released.path, released.screen, released.steps, released.route], ["/checkout", false, true, "object"], `released: ${JSON.stringify(released)}`);
    assert.ok(lines.includes(DONE), "the block's done line");
  });
  await withFooterRun({}, async ({ page, lines }) => {
    await page.waitForFunction(() => document.getElementById("fitaf-bar"), { timeout: 30_000 });
    assert.ok(lines.includes(DONE), "control: done with no call");
    assert.equal(await page.evaluate(() => typeof window.__fixtureRoute), "undefined", "control: nothing held");
  });
});
