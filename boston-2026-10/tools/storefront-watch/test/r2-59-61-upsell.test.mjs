// SPEC-rung2-progress-and-checkout § 12, in Chrome, on the synthetic store (127.0.0.1; never the live store):
//   R2-59  a store that honours sessionStorage['ecc_additions_prompt_handled'] (as the store does: its order page clears
//          it when it starts; its CHECKOUT skips the extras pop-up while it is "true"): the key is absent at every meal's
//          Add to Cart and "true" at CHECKOUT; no pop-up opens; done: /checkout.
//   R2-60  a store that ignores the key (a release that renamed it): the pop-up opens under the screen, invisible; fill B
//          presses CONTINUE TO CHECKOUT; done: /checkout (§ 10's path, the fallback, unchanged).
//   R2-61  the store's pop-up opened as a top-layer popover while the screen is up: the screen is one element, shown
//          once, never closed before it is removed at done; its bar and its count never go back. Read every frame.
//          ⭐ Mutant (in the suite): the screen as an AUTO popover; with the store's pop-up an auto popover too, it is
//          light-dismissed, and R2-61 fails. (Found at the build: the screen has been a MANUAL popover since ed422ad,
//          and the store opens its overlays as manual popovers, which close no other; see § 12's build note.)
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { startStore } from "./browser-store.mjs";
import { browserFor, DONE, mutate, openDeep, shipped, skip } from "./r2-browser.mjs";

let store;
let browser;
let site;
before(async () => {
  if (skip) return;
  store = await startStore();
  browser = await browserFor();
  site = await shipped();
});
after(async () => {
  await browser?.close();
  await store?.close();
});

async function runOn(cfg, { text = site.text, ready = null } = {}) {
  store.set(cfg);
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text, ready });
  const verdict = await run.verdict(20_000);
  // The done line is written just after the screen goes; let the page draw a frame after it before reading the frames.
  await run.until(() => !document.getElementById("fitaf-screen"), undefined, 3_000);
  await run.page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))));
  const page = await run.page.evaluate(() => ({ key: window.__fixtureKey, extras: window.__fixtureExtras, frames: window.__frames ?? null }));
  await run.close();
  return { verdict, ...page };
}

test("R2-59: a store that honours the key — absent at every Add to Cart, \"true\" at CHECKOUT; no pop-up; done", { skip, timeout: 60_000 }, async () => {
  const r = await runOn({ extrasDialog: true, honoursKey: true });
  assert.equal(r.verdict, DONE);
  assert.deepEqual(r.key, [...Array(7).fill(["add", null]), ["checkout", "true"]]);
  assert.equal(r.extras, false, "the store skipped its extras pop-up");
});

test("R2-60: a store that ignores the key — the pop-up opens under the screen, invisible; fill B presses CONTINUE; done", { skip, timeout: 60_000 }, async () => {
  store.set({ extrasDialog: true, extrasOpenMs: 600, continueDelayMs: 1_500 });
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text: site.text });
  try {
    const seen = await run.until(() => {
      const pane = document.querySelector(".cdk-overlay-pane");
      return pane && pane.querySelector("app-extra-products-dialog") ? getComputedStyle(pane).visibility : null;
    });
    assert.equal(seen, "hidden", "the pop-up opened, invisible");
    assert.equal(await run.verdict(), DONE, "fill B pressed CONTINUE TO CHECKOUT");
    const key = await run.page.evaluate(() => window.__fixtureKey.at(-1));
    assert.deepEqual(key, ["checkout", "true"], "the key was set all the same; this store ignores it");
  } finally {
    await run.close();
  }
});

/** In the page, before the paste: every frame, the screen's element (a count of the distinct ones), whether it is open,
 * its bar's width and its count ("n of t"; the checkout line counts as t + 1). */
function recordFrames() {
  if (window.__frames) return true;
  const frames = (window.__frames = { screens: 0, log: [] });
  let last = "";
  const tick = () => {
    const s = document.getElementById("fitaf-screen");
    if (s && !s.__counted) {
      s.__counted = true;
      frames.screens += 1;
    }
    let row = "none";
    if (s) {
      const step = s.querySelector('[role="status"]')?.textContent ?? "";
      const m = /(\d+) of (\d+)/.exec(step);
      const n = m ? Number(m[1]) : step ? 99 : 0;
      row = `${s.matches(":popover-open") ? "open" : "closed"} ${parseFloat(s.querySelector(".b > *").style.width || "0")} ${n}`;
    }
    if (row !== last) frames.log.push((last = row));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return true;
}

/** R2-61's check over `text` with the store's pop-up opened as `popover`: throws (an AssertionError) on any going back. */
async function steadyCase(text, popover) {
  const r = await runOn({ extrasDialog: true, extrasPopover: popover, extrasOpenMs: 700, continueDelayMs: 1_500 }, { text, ready: recordFrames });
  assert.equal(r.verdict, DONE);
  assert.equal(r.extras, true, "fixture control: the store's pop-up opened while the screen was up");
  const { screens, log } = r.frames;
  assert.equal(screens, 1, "one screen element, shown once");
  const shown = log.filter((row) => row !== "none");
  assert.ok(shown.length >= 8, `fixture control: the screen was read through the run: ${log.join(" | ")}`);
  assert.deepEqual(shown.filter((row) => !row.startsWith("open ")), [], `never closed before it went: ${log.join(" | ")}`);
  assert.equal(log.at(-1), "none", "and it went, at done");
  for (let i = 1; i < shown.length; i++) {
    const [, w0, n0] = shown[i - 1].split(" ").map(Number);
    const [, w1, n1] = shown[i].split(" ").map(Number);
    assert.ok(w1 >= w0 && n1 >= n0, `its progress never goes back: ${shown[i - 1]} -> ${shown[i]}`);
  }
}

for (const popover of ["manual", "auto"]) {
  test(`R2-61: the store's pop-up opened as a top-layer ${popover} popover while the screen is up — the screen steady, its progress only rising`, { skip, timeout: 60_000 }, async () => {
    await steadyCase(site.text, popover);
  });
}

test("R2-61 (mutant): the screen as an auto popover — the store's auto pop-up light-dismisses it, and R2-61 fails", { skip, timeout: 60_000 }, async () => {
  const auto = mutate(site.text, 'S.setAttribute("popover", "manual");', 'S.setAttribute("popover", "auto");');
  await assert.rejects(steadyCase(auto, "auto"), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    assert.match(err.message, /never closed/);
    return true;
  });
});
