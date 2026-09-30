// R2-47 (SPEC-rung2-progress-and-checkout § 3 items 1 and 2): the style applies only while the store's checkout component
// is on the page. After a deep-carted run the visitor goes back to the order page inside the app (the summary's own
// "Edit plan" link, a route in the app, no reload): app-checkout leaves the page, and nothing is hidden: the header,
// the footer, the credit line and the pop-up host are displayed again, the mark and the style still in the document.
// R2-47b: a reload of /checkout shows the store's full checkout: no mark, no style (nothing was stored).
// Headless Chrome against the synthetic store on 127.0.0.1; skipped without Chrome.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { startStore } from "./browser-store.mjs";
import { browserFor, DONE, displayedMap, openDeep, shipped, skip } from "./r2-browser.mjs";

const SHELL = [".sticky-header", ".footer", ".app-hmp-credit", "app-storefront-popup-host"];
const IN_CHECKOUT = ["a.checkout__guest-signin-banner", "a.contact__sign-in", ".summary__plan-subscription-controls"];

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

test("R2-47: the checkout component gone from the page (the visitor routed back in the app): nothing hidden", { skip, timeout: 60_000 }, async () => {
  store.set({});
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text: site.text });
  try {
    assert.equal(await run.verdict(), DONE);
    await run.until(() => document.querySelector("app-checkout .summary__items .item"));
    const onCheckout = await run.page.evaluate(displayedMap, SHELL);
    assert.deepEqual(Object.values(onCheckout), SHELL.map(() => false), "fixture control: hidden while app-checkout is on the page");
    await run.page.evaluate(() => document.querySelector("a.summary__plan-return").click());
    await run.until(() => location.pathname === "/order" && !document.querySelector("app-checkout") && document.querySelector("app-product-card"));
    const state = await run.page.evaluate(() => ({
      mark: document.documentElement.classList.contains("fitaf-deep"),
      style: document.querySelectorAll("style#fitaf-deep").length,
    }));
    assert.deepEqual(state, { mark: true, style: 1 }, "the mark and the style are still in the document");
    const shown = await run.page.evaluate(displayedMap, SHELL);
    assert.deepEqual(shown, Object.fromEntries(SHELL.map((s) => [s, true])), "the store's header, footer, credit line and pop-ups are back");
  } finally {
    await run.close();
  }
});

test("R2-47b: a reload of /checkout shows the store's full checkout: no mark, no style, nothing hidden", { skip, timeout: 60_000 }, async () => {
  store.set({});
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text: site.text });
  try {
    assert.equal(await run.verdict(), DONE);
    await run.page.reload({ waitUntil: "load" });
    await run.until(() => document.querySelector("app-checkout"));
    const state = await run.page.evaluate(() => ({
      path: location.pathname,
      mark: document.documentElement.classList.contains("fitaf-deep"),
      style: document.querySelectorAll("style#fitaf-deep").length,
      screen: Boolean(document.getElementById("fitaf-screen")),
    }));
    assert.deepEqual(state, { path: "/checkout", mark: false, style: 0, screen: false });
    const shown = await run.page.evaluate(displayedMap, [...SHELL, ...IN_CHECKOUT]);
    for (const sel of [...SHELL, ...IN_CHECKOUT]) assert.equal(shown[sel], true, `${sel} displayed`);
  } finally {
    await run.close();
  }
});
