// R2-70 (SPEC-rung2-progress-and-checkout § 15.3): the Fit AF logo on the progress screen and on the deep-carted
// checkout is THE STORE'S OWN, the page's img.header__logo-image: an img the block makes with the DOM, whose src is the
// header image's, alt "Fit AF", not a link, nothing focusable. No image URL is in the shipped text (R2-71).
//   R2-70   with a header logo: the screen shows one, 48 px high, as the first element above the title, with a white
//           background, a border radius and padding (the Advisor, 2026-09-30, after seeing it: "Top, on a white plate";
//           the plate is the image's own padding and background, § 15.3), and the checkout one, at the top of the
//           store's checkout component, 40 px high; nothing focusable is added. Without a header logo: none anywhere,
//           and the fill unchanged (the same presses, history writes, lines and timers);
//   R2-70b  the build's reading (§ 16): as the carousel's photos (§ 2 item 2), a logo is made only from a header image
//           that has LOADED (complete, with a width), from its currentSrc, so nothing new is requested; a header logo
//           still loading gives none, and the screen gains it at the next poll once it has loaded;
//   R2-70c  a stop after the screen: the screen (and its logo) gone, and no logo left on the page (the checkout's is
//           placed at done only).
// linkedom loads nothing, so the header's img is given the state a browser would report, as R2-52 gives the cards'
// photos theirs; its image is a generated data: URI, never a photograph. The synthetic order page has no checkout: here
// the store's route to /checkout also draws an app-checkout, as the store's does.
import test from "node:test";
import assert from "node:assert/strict";
import { CHECKOUT_PAYLOAD, fakeWindow, fragmentFor, orderPage, run, script } from "./r2-harness.mjs";
import { focusableIn, screenOf } from "./r2-screen.mjs";

const LOGO = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="#1b2360"/></svg>')}`;
const ALT = "Fit AF";
const OURS = `img[alt="${ALT}"]`;

/** The store's header and its logo, first in <body>, in the state a browser reports: loaded, or still loading. */
function headerLogo(document, { loaded = true } = {}) {
  const header = document.createElement("div");
  header.className = "sticky-header";
  const img = document.createElement("img");
  img.className = "header__logo-image";
  img.setAttribute("alt", "The store's logo (synthetic)");
  img.setAttribute("src", LOGO);
  const state = { loaded };
  Object.defineProperties(img, {
    complete: { get: () => state.loaded },
    naturalWidth: { get: () => (state.loaded ? 120 : 0) },
    currentSrc: { get: () => (state.loaded ? LOGO : "") },
  });
  header.appendChild(img);
  document.body.prepend(header);
  return { load: () => (state.loaded = true) };
}

/** Every <img> the page's document is asked to create from now on. */
function countImgs(document) {
  const created = [];
  const createElement = document.createElement.bind(document);
  document.createElement = (tag, ...rest) => {
    const el = createElement(tag, ...rest);
    if (String(tag).toLowerCase() === "img") created.push(el);
    return el;
  };
  return created;
}

/** What a logo of ours is: its src, height, and whether a person could act on or focus it. */
const describe = (img) => ({
  src: img.getAttribute("src"),
  alt: img.getAttribute("alt"),
  height: img.style.height,
  focusable: img.hasAttribute("tabindex") || img.hasAttribute("href") || Boolean(img.closest("a,button")),
});

/**
 * A 7-meal link on the synthetic page (with the header logo `logo`: "loaded", "loading" or none; `cardsLate`, the cards
 * not yet drawn), started: fill B's first poll has run. The store's route to /checkout draws an app-checkout. Returns
 * the run, the imgs created, and the screen's logos as they were when the store routed (the screen is still up then:
 * R2-41).
 */
async function deepRun({ logo = null, pageOptions = {}, cardsLate = false } = {}) {
  const page = await orderPage(pageOptions);
  if (cardsLate) page.hide(); // the store has not drawn its cards yet: fill B polls, and the screen is up
  const header = logo ? headerLogo(page.document, { loaded: logo === "loaded" }) : null;
  const created = countImgs(page.document);
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  let atRoute = null;
  const pushState = h.window.history.pushState;
  h.window.history.pushState = (...args) => {
    const s = screenOf(page.document);
    atRoute = {
      logos: [...(s?.querySelectorAll(OURS) ?? [])].map((img) => ({ ...describe(img), ...placed(img) })),
      focusable: s ? focusableIn(s).length : null,
    };
    pushState(...args);
    if (h.url.pathname === "/checkout") {
      const checkout = page.document.createElement("app-checkout");
      checkout.innerHTML = '<div class="checkout"><form class="checkout__form"></form></div>';
      page.document.body.appendChild(checkout);
    }
  };
  run(await script(), h.window);
  return { page, h, header, created, atRoute: () => atRoute };
}

/**
 * Where the screen's logo is, and its plate: the first element of the screen's box, the title (the h2) next, and a white
 * background (the screen's own --white token, not a raw colour), a border radius and padding of its own.
 */
const placed = (img) => ({
  first: img.parentElement?.firstElementChild === img,
  aboveTitle: img.nextElementSibling?.localName === "h2",
  plate: {
    background: img.style.background,
    radius: Boolean(img.style.borderRadius && img.style.borderRadius !== "0px"),
    padding: Boolean(img.style.padding && img.style.padding !== "0px"),
  },
});
const PLATE = { first: true, aboveTitle: true, plate: { background: "var(--white)", radius: true, padding: true } };

const theCheckout = (document) => {
  const c = document.querySelector("app-checkout");
  return c ? { first: c.firstElementChild?.localName, logos: [...c.querySelectorAll("img")].map(describe) } : null;
};

test("R2-70: with a header logo, one on the screen (first, above the title, on a white plate) and one on the checkout; without one, none, and the fill unchanged", async () => {
  const withLogo = await deepRun({ logo: "loaded" });
  withLogo.h.timers.drain();
  const without = await deepRun();
  without.h.timers.drain();
  for (const r of [withLogo, without]) assert.ok(r.h.info.includes("[fitaf-handoff] done: /checkout"), JSON.stringify(r.h.info));

  const screen = withLogo.atRoute();
  assert.deepEqual(screen.logos, [{ src: LOGO, alt: ALT, height: "48px", focusable: false, ...PLATE }], "the screen: one logo, the header's src, the first element above the title, on a white plate");
  assert.equal(screen.focusable, 0, "nothing focusable on the screen");
  const checkout = theCheckout(withLogo.page.document);
  assert.deepEqual(checkout, { first: "img", logos: [{ src: LOGO, alt: ALT, height: "40px", focusable: false }] }, "the checkout: one logo, first in app-checkout");
  assert.equal(withLogo.page.document.querySelectorAll(OURS).length, 1, "at done: the checkout's logo alone (the screen is gone)");
  assert.equal(withLogo.created.length, 2, "two imgs made: the screen's and the checkout's");

  assert.deepEqual(without.atRoute(), { logos: [], focusable: 0 }, "no header logo: none on the screen");
  assert.deepEqual(theCheckout(without.page.document), { first: "div", logos: [] }, "and none on the checkout");
  assert.equal(without.created.length, 0, "no img made at all");
  for (const key of ["events", "info"]) assert.deepEqual(withLogo.h[key], without.h[key], `the fill unchanged: ${key}`);
  assert.deepEqual(withLogo.page.all, without.page.all, "the fill unchanged: the presses");
  assert.deepEqual(withLogo.h.timers.delays, without.h.timers.delays, "the fill unchanged: its timers");
});

test("R2-70b: a header logo still loading gives none, and nothing is made from it; the screen gains it at the next poll once loaded", async () => {
  const r = await deepRun({ logo: "loading", cardsLate: true });
  const { page, h } = r;
  for (let n = 0; n < 5; n++) h.timers.step();
  const s = screenOf(page.document);
  assert.ok(s, "the screen is up while fill B waits");
  assert.equal(s.querySelectorAll(OURS).length, 0, "no logo while the header's image loads");
  assert.equal(r.created.length, 0, "no img made from an image not yet loaded");
  r.header.load();
  h.timers.step();
  const logos = [...s.querySelectorAll(OURS)].map(describe);
  assert.deepEqual(logos, [{ src: LOGO, alt: ALT, height: "48px", focusable: false }], "the next poll places it");
  page.show();
  h.timers.drain();
  assert.ok(h.info.includes("[fitaf-handoff] done: /checkout"), JSON.stringify(h.info));
  assert.equal(theCheckout(page.document).logos.length, 1, "and the checkout shows it");
  assert.equal(r.created.length, 2, "one img for the screen, placed once, and one for the checkout");
});

test("R2-70c: a stop after the screen — the screen and its logo gone, and no logo left on the page", async () => {
  const { page, h } = await deepRun({ logo: "loaded", pageOptions: { need: 8 } }); // the store keeps CHECKOUT disabled
  h.timers.step();
  assert.equal(screenOf(page.document)?.querySelectorAll(OURS).length, 1, "fixture control: the screen carried the logo");
  h.timers.drain();
  assert.ok(h.info.includes("[fitaf-handoff] stopped: no checkout control"), JSON.stringify(h.info));
  assert.equal(screenOf(page.document), null);
  assert.equal(page.document.querySelectorAll(OURS).length, 0, "no logo of ours left on the page");
});
