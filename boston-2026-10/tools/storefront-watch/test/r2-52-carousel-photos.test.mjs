// R2-52 (SPEC-rung2-progress-and-checkout § 2 item 2), with real images in Chrome: a card whose photo the page has
// loaded gives a slide with that photo (the card's own currentSrc); a card whose img has no src yet (as the store's
// lazy images before they scroll into view) and a card whose image is still loading give the name alone, and no <img>
// is made from either. ⭐ Nothing new is requested: the server counts every request for each image, and the images are
// sent `no-store`, so a second fetch would reach it. The images are generated rectangles, never photographs.
// Headless Chrome against the synthetic store on 127.0.0.1; skipped without Chrome.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { MEALS, startStore } from "./browser-store.mjs";
import { browserFor, DONE, openDeep, screenRead, shipped, skip } from "./r2-browser.mjs";

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

test("R2-52: a loaded photo on its slide (the card's currentSrc); no src yet, or still loading: the name alone; nothing requested", { skip, timeout: 60_000 }, async () => {
  store.set({ photos: { [MEALS[0]]: "loaded", [MEALS[1]]: "none", [MEALS[2]]: "pending", [MEALS[3]]: "loaded" }, routeDelayMs: 3_000 });
  // Paste once the page has loaded the two photos it loads, as a visitor's page would have by the time they press.
  const ready = () => ["meal-0", "meal-3"].every((n) => [...document.images].some((i) => i.src.includes(n) && i.complete && i.naturalWidth > 0));
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text: site.text, ready });
  try {
    const cards = await run.page.evaluate((names) => names.map((name) => {
      const card = [...document.querySelectorAll("app-product-card")].find((c) => c.querySelector(".product__content-title").textContent.trim() === name);
      const img = card.querySelector("img");
      return img ? { complete: img.complete, width: img.naturalWidth, src: img.currentSrc } : null;
    }), MEALS.slice(0, 4));
    assert.ok(cards[0].complete && cards[0].width > 0, `fixture control: the first card's photo is loaded ${JSON.stringify(cards[0])}`);
    assert.ok(cards[1].complete && cards[1].width === 0 && cards[1].src === "", "fixture control: the second card's img has no src");
    assert.equal(cards[2].complete, false, "fixture control: the third card's image is still loading");
    const before = { a: store.hits("/img/meal-0.svg"), b: store.hits("/img/meal-3.svg"), c: store.hits("/img/pending-2.svg") };
    assert.deepEqual(before, { a: 1, b: 1, c: 1 }, "fixture control: each card fetched its own image once");

    const all = await run.until(() => {
      const s = document.getElementById("fitaf-screen");
      return s && s.querySelectorAll(".c > *").length === 7 ? true : null;
    });
    assert.ok(all, "the seven slides");
    const screen = await run.page.evaluate(screenRead);
    const origin = store.origin;
    assert.deepEqual(screen.slides.slice(0, 4), [
      { name: MEALS[0], img: `${origin}/img/meal-0.svg` },
      { name: MEALS[1], img: null },
      { name: MEALS[2], img: null },
      { name: MEALS[3], img: `${origin}/img/meal-3.svg` },
    ]);
    assert.ok(screen.slides.slice(4).every((s) => s.img === null), "cards with no photo: the name alone");
    const imgs = await run.page.evaluate(() => [...document.querySelectorAll("#fitaf-screen img")].map((i) => ({ complete: i.complete, width: i.naturalWidth })));
    assert.deepEqual(imgs, [{ complete: true, width: 320 }, { complete: true, width: 320 }], "two imgs, each already drawn from the page's own copy");
    assert.equal(await run.verdict(10_000), DONE);
    assert.deepEqual({ a: store.hits("/img/meal-0.svg"), b: store.hits("/img/meal-3.svg"), c: store.hits("/img/pending-2.svg") }, before, "not one new request");
  } finally {
    await run.close();
  }
});
