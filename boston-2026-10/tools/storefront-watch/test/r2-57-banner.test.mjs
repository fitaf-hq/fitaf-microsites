// R2-57 (SPEC-rung2-progress-and-checkout § 10 item 3, H8): the app banner (.smartbanner, a third-party app-install
// banner the store shows on phones, prepended to <body>) hidden on the deep-carted checkout, and the top margin its
// library reserves on <html> (inline, its original kept in data-smartbanner-original-margin-top) undone with it: the
// page's top margin back to the store's own. The one exception to hiding only, because the space is the banner's.
// The control: the same page with our style disabled shows the banner and its margin.
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

/** In the page: the banner displayed or not, <html>'s top margin as drawn, and the store's own (the library's record). */
function banner() {
  const html = document.documentElement;
  return {
    banner: document.querySelector(".smartbanner").getClientRects().length > 0,
    margin: getComputedStyle(html).marginTop,
    own: `${html.getAttribute("data-smartbanner-original-margin-top")}px`,
  };
}

test("R2-57: the banner hidden, and the page's top margin back to the store's own (390 px)", { skip, timeout: 60_000 }, async () => {
  store.set({ banner: true });
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text: site.text, width: 390 });
  try {
    assert.equal(await run.verdict(), DONE);
    await run.until(() => document.querySelector("app-checkout .summary__items .item"));
    assert.deepEqual(await run.page.evaluate(banner), { banner: false, margin: "0px", own: "0px" });
    const bare = await run.page.evaluate(() => {
      document.getElementById("fitaf-deep").disabled = true;
      return { banner: document.querySelector(".smartbanner").getClientRects().length > 0, margin: getComputedStyle(document.documentElement).marginTop };
    });
    assert.deepEqual(bare, { banner: true, margin: "80px" }, "fixture control: the banner and its margin, without our style");
  } finally {
    await run.close();
  }
});
