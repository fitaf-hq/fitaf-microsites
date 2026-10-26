// SPEC-rung2-progress-and-checkout § 31.2 item 2: the store's page does not move under the screen. While #fitaf-screen
// is up, the page's own scrolling is suppressed (its scrollbar hidden) with its width kept, and both are as they were the
// moment the screen goes, at done or at a stop. Headless Chrome on the synthetic store (127.0.0.1), the shipped text
// pasted as a person pastes it.
//   ⚠ Headless Chrome on macOS draws overlay scrollbars, which take no width, and Puppeteer adds --hide-scrollbars: so
//   this file launches its own Chrome without that flag, and the page carries a 15 px classic scrollbar of its own
//   (`::-webkit-scrollbar`, which always takes its width) and a tall spacer, so there is a scrollbar to hide and a width
//   that would change if it went unanswered.
//   PS1 done: at every frame the screen is up the root's overflow is hidden and the body's width is what it was before;
//       after done the overflow is the page's own again (visible) and the width the same.
//   PS2 a stop (a meal not on the page, refused before any press): the same, the screen gone at the stop.
//   Mutant: the rule put in document.head, which nothing removes (never restored): PS1 fails.
// Built 2026-10-25 on the orchestrator's ruling (§ 31.2.1): until then committed skipped, it did not fit beside item 3.
// Red on 992739f's text (PS1, PS2 fail: the overflow stays visible while the screen is up), then green.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VIEWPORTS } from "../lib/config.mjs";
import { MEALS, startStore } from "./browser-store.mjs";
import { chrome, DONE, linkFor, mutate, shipped } from "./r2-browser.mjs";

const skip = chrome ? false : "no Chrome found (set CHROME_PATH)";
/** The item's rule as § 31.2.1 measured it: in the screen's own style, so it goes with the screen. */
const RULE_SITE = 'make("style", S).textContent = CSS + "html{';

let store;
let browser;
let profile;
let site;
before(async () => {
  if (skip) return;
  store = await startStore();
  const { default: puppeteer } = await import("puppeteer-core");
  profile = await mkdtemp(join(tmpdir(), "storefront-watch-ps-"));
  // Without --hide-scrollbars (Puppeteer's default), so a page's classic scrollbar takes its width.
  browser = await puppeteer.launch({ executablePath: chrome, headless: true, userDataDir: profile, args: ["--no-first-run", "--no-default-browser-check"], ignoreDefaultArgs: ["--hide-scrollbars"] });
  site = await shipped();
});
after(async () => {
  await browser?.close();
  await store?.close();
  if (profile) await rm(profile, { recursive: true, force: true });
});

/** The page's own 15 px classic scrollbar and a tall spacer, as a store's stylesheet would give them. */
const PAGE_STYLE = "::-webkit-scrollbar{width:15px;background:#ccc}::-webkit-scrollbar-thumb{background:#888}body::after{content:'';display:block;height:3000px}";

/** In every document: at every frame, the root's overflow, the scrollbar's width, the body's width, the screen up. */
function recorder() {
  window.__ps = [];
  const frame = () => {
    if (document.body) {
      window.__ps.push({
        screen: Boolean(document.getElementById("fitaf-screen")),
        overflow: getComputedStyle(document.documentElement).overflowY,
        bar: innerWidth - document.documentElement.clientWidth,
        width: Math.round(document.body.getBoundingClientRect().width * 10) / 10,
      });
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** One run of `text` with the link of `meals`; the frames from the paste on, and the block's lines. */
async function stillRun(text, meals = MEALS.slice(0, 7)) {
  store.set({});
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  try {
    await page.setViewport(VIEWPORTS[1280]);
    const lines = [];
    page.on("console", (m) => lines.push(m.text()));
    await page.evaluateOnNewDocument(recorder);
    await page.goto(linkFor(site.code, store.origin, meals), { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelectorAll("app-product-card").length > 0, { timeout: 15_000 });
    await page.addStyleTag({ content: PAGE_STYLE });
    await page.waitForFunction(() => innerWidth - document.documentElement.clientWidth === 15, { timeout: 5_000 });
    await page.evaluate(() => (window.__ps.length = 0));
    await new Promise((resolve) => setTimeout(resolve, 200)); // frames before the paste
    await page.evaluate(text);
    await page.waitForFunction(() => window.__ps.some((f) => f.screen), { timeout: 15_000 });
    await page.waitForFunction(() => window.__ps.at(-1) && !window.__ps.at(-1).screen, { timeout: 40_000 });
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { frames: await page.evaluate(() => window.__ps), lines };
  } finally {
    await context.close();
  }
}

/** PS1/PS2's check: the page's scrollbar there before, hidden while the screen is up, back after; the width one. */
function assertStill(r, what) {
  const before = r.frames.filter((f, i) => !f.screen && !r.frames.slice(0, i).some((g) => g.screen));
  const up = r.frames.filter((f) => f.screen);
  const after = r.frames.filter((f, i) => !f.screen && r.frames.slice(0, i).some((g) => g.screen));
  assert.ok(before.length > 0 && up.length > 5 && after.length > 0, `fixture control: frames before, during, after (${before.length}, ${up.length}, ${after.length}) ${what}`);
  assert.ok(before.every((f) => f.overflow === "visible" && f.bar === 15), `fixture control: the page scrolls, its 15 px scrollbar shown ${JSON.stringify(before[0])} ${what}`);
  const width = before[0].width;
  assert.deepEqual([...new Set(up.map((f) => f.overflow))], ["hidden"], `the root's overflow hidden at every frame the screen is up ${what}`);
  assert.ok(up.every((f) => f.bar === 0), `no scrollbar while the screen is up ${what}`);
  assert.deepEqual([...new Set(up.map((f) => f.width))], [width], `the page's width unchanged at the hide ${what}`);
  // The root's overflow is the page's own from the first frame after; the scrollbar's own reading (innerWidth minus the
  // root's clientWidth) was measured to lag one frame at the restore, while the body's width held at every frame.
  assert.ok(after.every((f) => f.overflow === "visible"), `the root's overflow the page's own after ${what}`);
  assert.equal(after.at(-1).bar, 15, `the page's 15 px scrollbar back ${what}`);
  assert.deepEqual([...new Set(after.map((f) => f.width))], [width], `the page's width unchanged at the restore ${what}`);
}

/** PS1 over `text`: a run to done. */
async function doneCase(text) {
  const r = await stillRun(text);
  assert.ok(r.lines.includes(DONE), JSON.stringify(r.lines.filter((l) => l.startsWith("[fitaf-handoff]"))));
  assertStill(r, "(done)");
}

test("PS1: done — the page's scrolling suppressed while the screen is up, its width kept; both as they were after", { skip, timeout: 90_000 }, async () => {
  await doneCase(site.text);
});

test("PS2: a stop (a meal not on the page) — the same, restored when the screen goes", { skip, timeout: 90_000 }, async () => {
  const r = await stillRun(site.text, [...MEALS.slice(0, 6), "A Meal This Store Does Not Sell"]);
  assert.ok(r.lines.some((l) => /^\[fitaf-handoff\] stopped: not on this page/.test(l)), JSON.stringify(r.lines.filter((l) => l.startsWith("[fitaf-handoff]"))));
  assertStill(r, "(stop)");
});

test("PS1 (mutant): the rule in document.head, never removed — PS1 fails", { skip, timeout: 90_000 }, async () => {
  const mutant = mutate(site.text, RULE_SITE, 'make("style", S).textContent = CSS; make("style", w.document.head).textContent = "html{');
  await assert.rejects(doneCase(mutant), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    return true;
  });
});
