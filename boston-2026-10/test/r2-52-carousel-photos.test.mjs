// R2-52 (SPEC-rung2-progress-and-checkout § 2 item 2), on the synthetic page: each slide is the meal as its own card
// shows it — its name, and its photograph ONLY when the page has already loaded it (the card's img `complete` with a
// `naturalWidth`), reusing the card's `currentSrc`. A card whose photo is not loaded (not complete, or complete with no
// width: no src yet, or a broken one) gives the name alone, and no <img> is created from it. linkedom loads nothing,
// so each card's img is given the state a browser would report; the watch package's R2-52 runs real images in Chrome
// and counts the requests. The image here is a generated data: URI, never a photograph.
import test from "node:test";
import assert from "node:assert/strict";
import { CHECKOUT_PAYLOAD, fakeWindow, fragmentFor, MEALS, orderPage, run, script } from "./r2-harness.mjs";
import { screenState } from "./r2-screen.mjs";

const PIXEL = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"><rect width="4" height="3" fill="#48aeee"/></svg>')}`;

/** Give a card an img in the state a browser would report. */
function photo(document, name, { complete, naturalWidth, currentSrc }) {
  const card = [...document.querySelectorAll("app-product-card")].find(
    (c) => c.querySelector(".product__content-title").textContent.replace(/\s+/g, " ").trim() === name,
  );
  const img = document.createElement("img");
  img.setAttribute("alt", "");
  Object.defineProperties(img, {
    complete: { value: complete },
    naturalWidth: { value: naturalWidth },
    currentSrc: { value: currentSrc },
  });
  card.prepend(img);
  return img;
}

test("R2-52: a card's loaded photo is its slide's (its currentSrc); a photo not loaded gives the name alone", async () => {
  const page = await orderPage();
  const doc = page.document;
  photo(doc, MEALS[0], { complete: true, naturalWidth: 640, currentSrc: PIXEL });
  photo(doc, MEALS[1], { complete: false, naturalWidth: 0, currentSrc: "" }); // still loading
  photo(doc, MEALS[2], { complete: true, naturalWidth: 0, currentSrc: "" }); // no src yet (a lazy image), or broken
  const imgsBefore = doc.querySelectorAll("img").length;
  const created = [];
  const createElement = doc.createElement.bind(doc);
  doc.createElement = (tag, ...rest) => {
    const el = createElement(tag, ...rest);
    if (String(tag).toLowerCase() === "img") created.push(el);
    return el;
  };
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  let atRoute = null;
  const pushState = h.window.history.pushState;
  h.window.history.pushState = (...args) => {
    atRoute = screenState(doc);
    pushState(...args);
  };
  run(await script(), h.window);
  h.timers.drain();
  assert.ok(atRoute, "the screen, read when the store routes");
  assert.deepEqual(atRoute.slides, [
    { name: MEALS[0], img: PIXEL },
    { name: MEALS[1], img: null },
    { name: MEALS[2], img: null },
  ]);
  assert.equal(created.length, 1, "one <img> created, for the one loaded photo, none for the others");
  assert.equal(doc.querySelectorAll("img").length, imgsBefore, "the screen and its img are gone at done; the cards' own imgs stay");
});

test("R2-52b: a card with no img at all gives the name alone", async () => {
  const page = await orderPage();
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  let atRoute = null;
  const pushState = h.window.history.pushState;
  h.window.history.pushState = (...args) => {
    atRoute = screenState(page.document);
    pushState(...args);
  };
  run(await script(), h.window);
  h.timers.drain();
  assert.deepEqual(atRoute?.slides, MEALS.map((name) => ({ name, img: null })));
});
