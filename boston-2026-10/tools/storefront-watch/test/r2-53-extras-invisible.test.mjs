// R2-53 (SPEC-rung2-progress-and-checkout § 10 item 1): the store's extras pop-up opens while the progress screen is up.
// It is made INVISIBLE, never removed: `visibility: hidden` on the overlay pane that holds app-extra-products-dialog and
// on that overlay's backdrop, only while the screen is shown. Fill B still finds CONTINUE TO CHECKOUT (a hidden control
// keeps its boxes) and presses it as before. After a stop (the store's CONTINUE never enabled: fill B's 30 s wait after
// CHECKOUT runs out) the screen goes, and the pop-up is visible again: a store dialog that stopped fill B is seen.
// The synthetic store opens its dialog as the store's overlays are opened (a manual popover in the top layer).
// Headless Chrome against the synthetic store on 127.0.0.1; skipped without Chrome.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { startStore } from "./browser-store.mjs";
import { browserFor, DONE, openDeep, shipped, skip } from "./r2-browser.mjs";

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

/** In the page: the extras overlay's pane and backdrop, whether each is visible, and what is on top at the pane's centre. */
function extras() {
  const pane = document.querySelector(".cdk-overlay-pane");
  if (!pane || !pane.querySelector("app-extra-products-dialog")) return null;
  const backdrop = document.querySelector(".cdk-overlay-backdrop");
  const r = pane.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return {
    pane: getComputedStyle(pane).visibility,
    backdrop: getComputedStyle(backdrop).visibility,
    open: pane.parentElement.matches(":popover-open"),
    onTop: top?.closest("#fitaf-screen") ? "screen" : top?.closest("app-extra-products-dialog") ? "dialog" : String(top?.className),
    screen: Boolean(document.getElementById("fitaf-screen")),
  };
}

test("R2-53: the extras pop-up opens while the screen is up — invisible; fill B presses CONTINUE TO CHECKOUT as before", { skip, timeout: 60_000 }, async () => {
  store.set({ extrasDialog: true, extrasOpenMs: 600, continueDelayMs: 2_000 });
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text: site.text });
  try {
    const seen = await run.until(extras, undefined, 15_000);
    assert.ok(seen, "fixture control: the extras dialog opened");
    assert.deepEqual(seen, { pane: "hidden", backdrop: "hidden", open: true, onTop: "screen", screen: true }, "invisible, not removed");
    assert.equal(await run.verdict(), DONE, "fill B pressed its CONTINUE TO CHECKOUT and reached /checkout");
    const left = await run.page.evaluate(() => ({ dialog: Boolean(document.querySelector("app-extra-products-dialog")), path: location.pathname }));
    assert.deepEqual(left, { dialog: false, path: "/checkout" }, "the store closed its dialog on CONTINUE, as ever");
  } finally {
    await run.close();
  }
});

test("R2-53b: after a stop (CONTINUE never enabled) the screen goes and the pop-up is visible again", { skip, timeout: 90_000 }, async () => {
  store.set({ extrasDialog: true, continueNever: true });
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text: site.text });
  try {
    const during = await run.until(extras, undefined, 15_000);
    assert.equal(during?.pane, "hidden", "invisible while the screen is up");
    assert.equal(await run.verdict(45_000), "[fitaf-handoff] stopped: /checkout not reached");
    const after = await run.page.evaluate(extras);
    assert.deepEqual(after, { pane: "visible", backdrop: "visible", open: true, onTop: "dialog", screen: false }, "the store's dialog is seen");
  } finally {
    await run.close();
  }
});
