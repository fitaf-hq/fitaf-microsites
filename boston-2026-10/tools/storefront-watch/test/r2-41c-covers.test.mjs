// R2-41c (SPEC-rung2-progress-and-checkout § 2 item 1: "above every layer of the store's, its dialogs included"), in
// Chrome. Found at the build: the store's dialogs and pop-ups are Angular CDK overlays, shown in the browser's TOP LAYER
// (the Popover API), above any z-index. So the screen is a manual popover too, shown when it appears. Here the synthetic
// store shows a pop-up in the top layer at load; once the screen is up, the point at its centre, and at the corners
// and centre of the viewport, is the screen's. The control: before the paste, the pop-up's centre is the pop-up's.
// (An overlay the store opens AFTER the screen, as its extras dialog after CHECKOUT, is above it: see § 8.)
// Headless Chrome against the synthetic store on 127.0.0.1; skipped without Chrome.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { startStore } from "./browser-store.mjs";
import { browserFor, mutate, openDeep, shipped, skip } from "./r2-browser.mjs";

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

/** In the page: for each point, whether the element there is (inside) the screen, and what it is. */
function topAt(points) {
  return points.map(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return { at: [x, y], screen: Boolean(el?.closest("#fitaf-screen")), what: el ? `${el.tagName.toLowerCase()}.${el.className}` : null };
  });
}

/** R2-41c's check over `text`: throws (an AssertionError) unless the screen is on top everywhere. */
async function coversCase(text) {
  store.set({ topLayerPopup: true, routeDelayMs: 5_000 });
  // Paste only once the pop-up is open and on top at its own centre (the fixture control).
  const ready = () => {
    const pop = document.querySelector(".top-layer-popup");
    return pop && pop.matches(":popover-open") && document.elementFromPoint(170, 120) === pop;
  };
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text, ready });
  try {
    assert.ok(await run.until(() => document.getElementById("fitaf-screen")), "the screen is up");
    const { w, h } = await run.page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
    const points = [[170, 120], [2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3], [Math.round(w / 2), Math.round(h / 2)]];
    const top = await run.page.evaluate(topAt, points);
    assert.deepEqual(top.filter((p) => !p.screen), [], "the screen, everywhere, above the pop-up too");
    const state = await run.page.evaluate(() => ({
      popover: document.getElementById("fitaf-screen").matches(":popover-open"),
      popupStillOpen: document.querySelector(".top-layer-popup").matches(":popover-open"),
    }));
    assert.deepEqual(state, { popover: true, popupStillOpen: true }, "in the top layer; the store's pop-up left as it was");
  } finally {
    await run.close();
  }
}

test("R2-41c: the screen is above every layer of the store's, a pop-up it opened in the top layer at load included", { skip, timeout: 60_000 }, async () => {
  await coversCase(site.text);
});

test("R2-41c (mutant): the screen by z-index alone, not in the top layer — the store's pop-up is above it, and R2-41c fails", { skip, timeout: 60_000 }, async () => {
  const flat = mutate(mutate(site.text, 'S.setAttribute("popover", "manual");', ""), "if (S.showPopover) S.showPopover();", "");
  await assert.rejects(coversCase(flat), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    return true;
  });
});
