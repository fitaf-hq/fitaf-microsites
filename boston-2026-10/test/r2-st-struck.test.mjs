// SPEC-rung2-progress-and-checkout § 36, the site's block cases for the struck prices (the SHIPPED text, run as the
// rung 2 cases run it: in a vm whose only globals are `window` and, here, a fixed `Date`; the page a linkedom document).
// What a browser draws (each surface of the stand-in store, a redraw, the boxes at 1280 and 390, ST1–ST9 in full and the
// four mutants) is measured in Chrome by the watch package's st-struck; these are the rules a vm can hold.
//   STs1  item 9: the struck prices are their own source file, src/storefront/fitaf-struck.js, one function, shipped
//         AFTER the hand-off's text in the same block; the hand-off's first rule still reads "An ordinary visit costs
//         this one read of location.hash".
//   STs2  item 2: the build inlines data/offers.json's general offers with percent_off (share, valid_from, valid_to);
//         the source names no share and no date; another offers.json, another text.
//   ST1   marked (the navigation entry's utm_source=eatfitaf), the offer current: each surface's price in the page gets
//         one s.fitaf-was right before it, item 3's figure ($87.50 -> $116.67, $12.50 -> $16.67, $11.50 -> $15.33),
//         after one animation frame; the additions, a fee, the Total and a "+$2.00" none.
//   ST2   unmarked: one read of sessionStorage fitaf_struck, no write, no observer, no frame, no timer, no log; a storage
//         that throws, nothing either, and no exception.
//   ST3   the navigation entry, not location.href, is the landing address (the store's router can rewrite the latter);
//         location.href where there is no entry; the mark written; a storage that throws: this page load only.
//   ST4   a date outside valid_from..valid_to in New York: no observer and nothing struck.
//   ST8   § 36 item 8: no save link at done, no https://eatfitaf.com/#save and no handoff.save in the text or the data.
// § 37 (2026-10-27) widens § 36: the Additions' plain prices are struck too (ST1, ST4's count), and ST12/ST13 hold the
// order summary to the contract's own figures: Subtotal $98.00 -> $130.67, a line's "7 x $14.00" -> $18.67 before it, the
// header total and the Total with shipping $5.00 ($103.00 -> $135.67) and without ($98.00 -> $130.67), none without a
// Subtotal; shipping, tax and the pay button never.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import { parseHTML } from "linkedom";
import { MESSAGES_PATH, OFFERS_PATH } from "../build.mjs";
import { STOREFRONT_SOURCE, storefrontText } from "../scripts/build-storefront.mjs";
import { CHECKOUT_PAYLOAD, fakeWindow, fragmentFor, LOG_PREFIX, orderPage, run } from "./r2-harness.mjs";

const STRUCK_SOURCE = join(STOREFRONT_SOURCE, "..", "fitaf-struck.js");
const OFFERS = JSON.parse(await readFile(OFFERS_PATH, "utf8"));
const OFFER = OFFERS.offers.find((o) => o.applies_to === "general" && o.percent_off);
const INSIDE = Date.parse(`${OFFER.valid_from}T16:00:00Z`);
const KEY = "fitaf_struck";
const SAVE = "https://eatfitaf.com/#save";

/** A Date whose `new Date()` is `now`, for the vm. */
const clock = (now) =>
  class extends Date {
    constructor(...a) {
      if (a.length) super(...a);
      else super(now);
    }
    static now() {
      return now;
    }
  };

/** The four surfaces as the probe measured them (storefront/probe-prices/2026-10-27/), with figures never struck. */
const PAGE = `<!doctype html><html><head></head><body>
<div class="meal-plan__fit-af-price"><span>As low as</span><strong>$11.50</strong><small>/meal</small></div>
<div class="products__section"><h2 class="products__section-title">All Meals</h2><div class="products__section-list">
<app-product-card><div class="product__content-meta"><span class="product__content-price">$12.50</span></div><button><span class="product__actions-add_price">$12.50</span></button></app-product-card>
<app-product-card-mobile><div class="product-card-mobile__price-row"><span class="product-card-mobile__price">$12.50</span></div></app-product-card-mobile>
</div></div>
<div class="products__section"><h2 class="products__section-title">Additions (Additions)</h2><div class="products__section-list">
<app-product-card><div class="product__content-meta"><span class="product__content-price">$12.50</span></div><span class="dropdown__value-text">Large +$2.00</span></app-product-card>
<app-product-card-mobile><div class="product-card-mobile__price-row"><span class="product-card-mobile__price">From $9.00</span></div></app-product-card-mobile>
</div></div>
<app-cart><div class="order-type__content-single"><span class="segment-price">$87.50</span><span class="segment-label">One Time Order</span></div></app-cart>
<div class="mobile-cart-summary__stat"><span class="mobile-cart-summary__stat-label">Items</span><span class="mobile-cart-summary__stat-value">7</span></div>
<div class="mobile-cart-summary__stat"><span class="mobile-cart-summary__stat-label">Cart Total</span><span class="mobile-cart-summary__stat-value">$87.50</span></div>
<div class="summary__plan-total"><span class="summary__plan-total-label">Plan Total (7 items)</span><span class="summary__plan-total-prices"><span class="summary__plan-total-value">$87.50</span></span></div>
<div class="summary__row"><span>Shipping</span><span>$4.99</span></div>
<div class="summary__total"><span class="summary__total-value">$92.49</span></div>
</body></html>`;

/** A window for the vm: the address, the navigation entry (or none), a storage that counts, an observer and frame that count. */
function windowFor({ href = "https://fitafnutrition.com/meal-plans", entry = href, storage = {}, throwing = false, page = PAGE } = {}) {
  const { document } = parseHTML(page);
  const c = { reads: [], writes: [], observers: 0, frames: [], timers: 0, logs: 0, observed: null };
  const map = new Map(Object.entries(storage));
  const sessionStorage = throwing
    ? new Proxy({}, { get: () => () => { throw new Error("SecurityError: storage refused"); } })
    : { getItem: (k) => (c.reads.push(k), map.has(k) ? map.get(k) : null), setItem: (k, v) => (c.writes.push([k, v]), map.set(k, String(v))) };
  const window = {
    document,
    location: { href, hash: new URL(href).hash, pathname: new URL(href).pathname, search: new URL(href).search },
    performance: entry === null ? undefined : { getEntriesByType: (t) => (t === "navigation" ? [{ name: entry }] : []) },
    sessionStorage,
    MutationObserver: class {
      constructor(cb) {
        c.observers++;
        c.instance = this;
        this.cb = cb;
      }
      observe(target, options) {
        c.observed = { target: target.nodeName, options };
      }
      disconnect() {}
    },
    requestAnimationFrame: (f) => c.frames.push(f),
    getComputedStyle: () => ({ fontSize: "16px" }),
    setTimeout: () => c.timers++,
    console: { info: () => c.logs++, log: () => c.logs++ },
  };
  return { window, c, document, map };
}

const runAt = (text, window, now = INSIDE) => vm.runInContext(text, vm.createContext({ window, Date: clock(now) }));
const shipped = () => storefrontText();
const frames = (c) => {
  while (c.frames.length) c.frames.shift()();
};

test("STs1: the struck prices are their own source file, one function, shipped after the hand-off's text", async () => {
  const struck = await readFile(STRUCK_SOURCE, "utf8");
  const handoff = await readFile(STOREFRONT_SOURCE, "utf8");
  assert.match(handoff, /An ordinary visit costs this one read of location\.hash/, "item 9: the hand-off's first rule stays");
  assert.ok(!/fitaf_struck|fitaf-was/.test(handoff), "nothing of the struck prices in the hand-off's source");
  assert.ok(/fitaf_struck/.test(struck) && /fitaf-was/.test(struck), "the struck prices' own file");
  const text = await shipped();
  const at = text.indexOf("fitaf_struck");
  assert.ok(at > text.lastIndexOf('fail("fill " + FILL'), "the struck text after the hand-off's last line");
  assert.equal((text.match(/^\(function \(\) \{$/gm) ?? []).length, 2, "two functions: the hand-off's and the struck prices'");
});

test("STs2: the offers are inlined from data/offers.json, never typed; another offers.json, another text", async () => {
  const struck = await readFile(STRUCK_SOURCE, "utf8");
  const code = struck.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  assert.ok(!code.includes(OFFER.valid_from) && !code.includes(OFFER.valid_to), "no date in the source's code");
  assert.ok(!new RegExp(`\\b${OFFER.percent_off}\\b`).test(code), "no share in the source's code");
  const text = await shipped();
  assert.ok(text.includes(JSON.stringify([[OFFER.percent_off, OFFER.valid_from, OFFER.valid_to]])), "the offer inlined: [share, valid_from, valid_to]");
  const dir = await mkdtemp(join(tmpdir(), "st-offers-"));
  try {
    const other = join(dir, "offers.json");
    await writeFile(other, JSON.stringify({ ...OFFERS, offers: OFFERS.offers.map((o) => ({ ...o, valid_to: "2026-11-05" })) }));
    const moved = await storefrontText({ offersPath: other });
    assert.ok(moved.includes(JSON.stringify([[OFFER.percent_off, OFFER.valid_from, "2026-11-05"]])), "an extension is a rebuild");
    assert.notEqual(moved, text);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("ST1: marked and current, each surface's price struck once, item 3's figure; the excluded none", async () => {
  const text = await shipped();
  const { window, c, document } = windowFor({ href: "https://fitafnutrition.com/?utm_source=eatfitaf&utm_medium=qr&utm_campaign=boston" });
  runAt(text, window);
  frames(c);
  assert.equal(c.observers, 1, "one observer, for the marked visitor");
  assert.equal(c.observed?.options?.subtree, true, "on the document, its subtree");
  const struck = (sel, root = document) => [...root.querySelectorAll(sel)].map((p) => (p.previousElementSibling?.matches(".fitaf-was") ? p.previousElementSibling.textContent : null));
  const [meals, additions] = document.querySelectorAll(".products__section");
  assert.deepEqual(struck(".meal-plan__fit-af-price>strong"), ["$15.33"]);
  assert.deepEqual(struck(".product__content-price, .product-card-mobile__price", meals), ["$16.67", "$16.67"]);
  assert.deepEqual(struck(".segment-price"), ["$116.67"], "Lean 7: $87.50 -> $116.67");
  assert.deepEqual(struck(".mobile-cart-summary__stat-value"), [null, "$116.67"], "the count none, the Cart Total struck");
  assert.deepEqual(struck(".summary__plan-total-value"), ["$116.67"]);
  assert.deepEqual(struck(".summary__row span, .summary__total-value, .product__actions-add_price, .dropdown__value-text"), [null, null, null, null, null]);
  assert.deepEqual(struck(".product__content-price, .product-card-mobile__price", additions), ["$16.67", null], "§ 37: the Additions' plain price struck, a From price not");
  assert.equal(document.querySelectorAll(".fitaf-was").length, 7);
  for (const s of document.querySelectorAll(".fitaf-was")) {
    assert.equal(s.localName, "s");
    assert.equal(s.getAttribute("aria-hidden"), "true");
  }
  c.instance.cb([]);
  frames(c);
  assert.equal(document.querySelectorAll(".fitaf-was").length, 7, "the observer's next frame adds nothing");
});

test("ST2: unmarked, one read of the mark, no write, no observer, no frame, no timer, no log; a throwing storage too", async () => {
  const text = await shipped();
  const plain = windowFor();
  runAt(text, plain.window);
  assert.deepEqual(plain.c.reads, [KEY], "one read of sessionStorage fitaf_struck");
  assert.deepEqual(plain.c.writes, []);
  assert.deepEqual([plain.c.observers, plain.c.frames.length, plain.c.timers, plain.c.logs], [0, 0, 0, 0]);
  assert.equal(plain.document.querySelectorAll(".fitaf-was").length, 0);
  const refused = windowFor({ throwing: true });
  assert.doesNotThrow(() => runAt(text, refused.window));
  assert.deepEqual([refused.c.observers, refused.c.frames.length], [0, 0]);
});

test("ST3: the navigation entry is the landing address, location.href without one; the mark kept; a throwing storage, this load only", async () => {
  const text = await shipped();
  const rewritten = windowFor({ href: "https://fitafnutrition.com/", entry: "https://fitafnutrition.com/?utm_source=eatfitaf&utm_medium=direct" });
  runAt(text, rewritten.window);
  assert.deepEqual(rewritten.c.writes, [[KEY, "1"]], "the mark written for the tab");
  assert.equal(rewritten.c.observers, 1, "marked by the entry, though the router rewrote location");
  const later = windowFor({ storage: { [KEY]: "1" } });
  runAt(text, later.window);
  assert.equal(later.c.observers, 1, "a later page of the tab, by the mark");
  const noEntry = windowFor({ href: "https://fitafnutrition.com/?utm_source=eatfitaf", entry: null });
  runAt(text, noEntry.window);
  assert.equal(noEntry.c.observers, 1, "location.href where there is no entry");
  const refused = windowFor({ href: "https://fitafnutrition.com/?utm_source=eatfitaf", throwing: true });
  runAt(text, refused.window);
  assert.equal(refused.c.observers, 1, "a storage that throws: this page load still struck");
  for (const q of ["?utm_source=eatfitafx", "?utm_source=EATFITAF", "?xutm_source=eatfitaf", "#?utm_source=eatfitaf"]) {
    const near = windowFor({ href: `https://fitafnutrition.com/${q}` });
    runAt(text, near.window);
    assert.deepEqual([near.c.observers, near.c.writes.length], [0, 0], `${q}: not the marker`);
  }
});

test("ST4: a date outside valid_from..valid_to in New York, no observer and nothing struck", async () => {
  const text = await shipped();
  const at = (iso) => {
    const v = windowFor({ storage: { [KEY]: "1" } });
    runAt(text, v.window, Date.parse(iso));
    frames(v.c);
    return [v.c.observers, v.document.querySelectorAll(".fitaf-was").length];
  };
  assert.deepEqual(at(`${OFFER.valid_from}T03:59:00Z`), [0, 0], "valid_from's eve in New York (its 23:59)");
  assert.deepEqual(at(`${OFFER.valid_from}T04:01:00Z`), [1, 7], "valid_from's first minute in New York");
  assert.deepEqual(at(`${OFFER.valid_to}T23:59:00-04:00`), [1, 7], "valid_to's last minute in New York");
  const end = new Date(Date.parse(`${OFFER.valid_to}T23:59:00-04:00`) + 120_000).toISOString();
  assert.deepEqual(at(end), [0, 0], "after valid_to");
});

test("ST8: no save link at done, and no save link's address or words in the text or the data", async () => {
  const text = await shipped();
  assert.ok(!text.includes(SAVE) && !text.includes("fitaf-save"), "the text carries no save link");
  assert.equal(JSON.parse(await readFile(MESSAGES_PATH, "utf8")).handoff?.save, undefined, "data/messages.json has no handoff.save");
  const page = await orderPage();
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  Object.assign(h.window, { CSS: { supports: () => true }, scrollTo() {}, addEventListener() {}, innerHeight: 844, MutationObserver: class { observe() {} } });
  const pushState = h.window.history.pushState;
  h.window.history.pushState = (...args) => {
    pushState(...args);
    if (h.url.pathname !== "/checkout") return;
    const c = page.document.createElement("app-checkout");
    c.innerHTML = '<div class="checkout"><form class="checkout__form"><section class="checkout__section payment"></section><div class="checkout__submit"><button type="button">Place order</button></div></form>' +
      '<aside class="checkout__summary"><div class="summary__total"><span>Total</span><span>$87.50</span></div></aside></div>';
    page.document.body.appendChild(c);
  };
  run(text, h.window);
  h.timers.drain();
  assert.ok(h.info.includes(`${LOG_PREFIX} done: /checkout`), JSON.stringify(h.info));
  assert.ok(page.document.getElementById("fitaf-nav"), "fixture control: the steps' foot drawn");
  assert.ok(page.document.getElementById("fitaf-help"), "fixture control: § 33's contact link made");
  assert.equal(page.document.querySelectorAll("#fitaf-save").length, 0, "no save link");
});

/** § 37: the checkout's summary as the probe measured it (storefront/probe-prices/2026-10-27/), with the contract's figures. */
const SUMMARY = (shipping) => `<!doctype html><html><head></head><body><div class="summary">
<div class="summary__header"><h3 class="summary__title">Order Summary</h3><div class="summary__header-right"><span class="summary__total-preview">${shipping ? "$103.00" : "$98.00"}</span></div></div>
<div class="summary__item"><div class="summary__item-price"><span class="summary__item-price-current">$98.00</span><span class="summary__item-price-unit">7 \u00d7 $14.00</span></div></div>
<div class="summary__breakdown"><div class="summary__row"><span>Subtotal | 7 items</span><span>$98.00</span></div>
<div class="summary__row"><span>Shipping</span><span>${shipping ? "$5.00" : "\u2014"}</span></div><div class="summary__row"><span>Tax</span><span>$0.00</span></div></div>
<div class="summary__total"><span class="summary__total-label">Total</span><span class="summary__total-value">${shipping ? "$103.00" : "$98.00"}</span></div>
<div class="checkout__submit"><button type="button"><span class="button__content">Pay now - ${shipping ? "$103.00" : "$98.00"}</span></button></div>
</div></body></html>`;

test("ST12 and ST13: the summary's Subtotal, line, unit price and totals at the contract's figures; fees and the pay button never; no Subtotal, no total", async () => {
  const text = await shipped();
  const struckOf = (document, sel) => [...document.querySelectorAll(sel)].map((p) => (p.previousElementSibling?.matches(".fitaf-was") ? p.previousElementSibling.textContent : null));
  for (const [shipping, total] of [[true, "$135.67"], [false, "$130.67"]]) {
    const v = windowFor({ storage: { [KEY]: "1" }, page: SUMMARY(shipping) });
    runAt(text, v.window);
    frames(v.c);
    const d = v.document;
    assert.deepEqual(struckOf(d, ".summary__row span:last-child"), ["$130.67", null, null], "the Subtotal struck; shipping and tax never");
    assert.deepEqual(struckOf(d, ".summary__item-price-current"), ["$130.67"], "the line's price");
    assert.deepEqual(struckOf(d, ".summary__item-price-unit"), ["$18.67"], "the unit's $X: 7 x $14.00 -> $18.67, before it");
    assert.deepEqual(struckOf(d, ".summary__total-preview, .summary__total-value"), [total, total], `the header total and the Total, shipping ${shipping ? "$5.00" : "none"}: ${total}`);
    assert.equal(d.querySelectorAll(".checkout__submit .fitaf-was").length, 0, "the pay button never");
    d.querySelector(".summary__breakdown .summary__row").remove();
    v.c.instance.cb([]);
    frames(v.c);
    assert.deepEqual(struckOf(d, ".summary__total-preview, .summary__total-value"), [null, null], "no Subtotal: no struck total");
  }
});
