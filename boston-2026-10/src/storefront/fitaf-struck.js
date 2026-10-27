/* Fit AF struck prices, for visitors marked utm_source=eatfitaf. Source, comments and tests: fitaf-microsites, boston-2026-10/src/storefront. */
// ── How this file ships ────────────────────────────────────────────────────────────────────────────────
// SPEC-rung2-progress-and-checkout § 36 (the Advisor, 2026-10-27: "use the redirect to trigger a footer script that adds
// struck-through pricing next to the actual HMP pricing. This should be rather lightweight and purely cosmetic"). Its own
// source file and its own function (item 9), shipped in the SAME Footer block, after the hand-off's text: the build
// (scripts/build-storefront.mjs) appends this file's text to fitaf-handoff.js's, so one paste carries both, and the
// hand-off's own first rule ("An ordinary visit costs this one read of location.hash") stays true of the hand-off. The
// build drops every full-line `//` comment, like this one, inlines data/offers.json's offers at the OFFERS slot and the
// page's --muted token at the MUTED slot. As the hand-off's: no `<` anywhere in the shipped text (R2-58: the store's
// admin reads the block as HTML), every character ASCII (R2-77), every element made with the DOM.
// The rule for the figure is the plan page's own (SPEC-ui-and-copy-pass § 1.2 item 2: "It is currently *impossible* to pay
// the non-discounted price"): the store's price is the price paid, and the struck one is the higher.
(function () {
"use strict";
var w = window, KEY = "fitaf_struck", on, u, d, share, M, O, T, MUTED = "/*MUTED*/";
// § 36 item 2: data/offers.json's general offers that carry percent_off, each [share, valid_from, valid_to] (calendar
// dates in America/New_York, inclusive), inlined by the build: never a figure or a date typed here. The dates move only
// with a rebuild and a paste.
var OFFERS = /*OFFERS*/ [];
// § 36 item 1: the landing address is the document's navigation entry (the address the document was loaded at, which the
// store's router cannot rewrite), or location.href where there is none. Marked: utm_source=eatfitaf exactly, in its
// query (the fragment is not the query). Then sessionStorage fitaf_struck = "1", read on every later page of the tab, so
// the struck prices follow the visitor through the store's own navigation, reloads included. A storage that throws:
// this page load only (on is set before the write). An ordinary visit costs one read of the address and one of
// sessionStorage: no observer, no listener, no timer, no request, no log.
try { u = w.performance.getEntriesByType("navigation")[0].name; } catch (e) {}
try {
  if (/[?&]utm_source=eatfitaf(&|$)/.test(String(u || w.location.href).split("#")[0])) { on = 1; w.sessionStorage.setItem(KEY, "1"); }
  else on = w.sessionStorage.getItem(KEY) === "1";
} catch (e) {}
if (!on) return;
// § 36 item 2: the offer's share on today's date in New York (Intl, never a fixed offset), else 0: nothing is shown.
// Dates are compared as YYYY-MM-DD text, which orders as the calendar does (no `<` in the shipped text: written >=).
function current() {
  var p = {}, day, s = 0;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    day = p.year + "-" + p.month + "-" + p.day;
    OFFERS.forEach(function (o) { if (!s && day >= o[1] && o[2] >= day) s = o[0]; });
  } catch (e) {}
  return s;
}
if (!current()) return;
// Once per load, as the hand-off's __fitafHandoff: a second copy of this block, or a console paste on a page that has it
// (a rehearsal holds the live block off with this mark), must not keep a second set of figures. A marked visitor only.
if (w.__fitafStruck) return;
w.__fitafStruck = true;
d = w.document;
// § 36 item 3: the figure, from the price's own text each time it is drawn: one plain price, "$", dollars (with or
// without thousands commas), a point and two digits, and not zero; anything else (a sign before it, a range, "From",
// "Free", empty) gets nothing. Its price x 100 / (100 - the share), rounded to the cent, in integer cents ($87.50 ->
// $116.67; $12.50 -> $16.67), written as the store writes its own: "$", commas every three digits, two decimals.
function fig(t) {
  var m = /^\$(\d{1,3}(?:,\d{3})+|\d+)\.(\d\d)$/.exec(t), c;
  if (!m) return "";
  c = +m[1].replace(/,/g, "") * 100 + +m[2];
  if (!c) return "";
  c = Math.round(c * 100 / (100 - share));
  return "$" + String(Math.floor(c / 100)).replace(/\B(?=(\d{3})+$)/g, ",") + "." + String(c % 100 + 100).slice(1);
}
function text(e) { return e.textContent.replace(/\s+/g, " ").trim(); }
// § 36 item 4, the Advisor's four, by the store's own names as the probe measured them (storefront/probe-prices/
// 2026-10-27/; each name an F2 literal in storefront/dependencies.json): (a) the meal plans page, each plan's price, the
// strong in div.meal-plan__fit-af-price (its lowest price per meal, "As low as $11.50/meal"); (b) a plan's order page,
// each meal's price on its card, span.product__content-price (the desktop card) and span.product-card-mobile__price (the
// phone's), only in a section whose heading (.products__section-title) names meals: the order page's "All Meals", never
// its "Additions" (snacks, sides and extras at their own prices); (c) the cart summary's figure for the meals: the
// sidebar's span.segment-price (app-cart's order type, "$87.50 One Time Order") and the bar's Cart Total
// (.mobile-cart-summary__stat-value: the same class holds the item count, which is no price and gets nothing); (d) the
// checkout's Plan Total, span.summary__plan-total-value. ⛔ Never a fee, tax, tip, discount, gift card, the checkout's
// Total, a line's price, the pay button, an add-on's or an upcharge's figure: none of them is named here, and an add-on's
// "+$2.00" is no plain price. The Add to Cart button's own price is not struck (the card's price is).
function prices() {
  var out = [].slice.call(d.querySelectorAll(".meal-plan__fit-af-price>strong,app-cart .segment-price,.mobile-cart-summary__stat-value,.summary__plan-total-value"));
  [].forEach.call(d.querySelectorAll(".products__section"), function (s) {
    var h = s.querySelector(".products__section-title");
    if (h && /\bmeals\b/i.test(text(h))) out = out.concat([].slice.call(s.querySelectorAll(".product__content-price,.product-card-mobile__price")));
  });
  return out;
}
// § 36 item 5: one s.fitaf-was, aria-hidden, per price, right before it (on its line in a row; in a column, the store's
// cart figures at both widths, the line above it), smaller than the price (0.8 of its own size), muted (the page's
// --muted token, inlined by the build), the browser's line-through, and no words. The store's own elements are never
// changed, moved, hidden or restyled: only this one is inserted. In the desktop card's meta row the price sits at the
// row's end, so the figure takes the free width and sits against it (flex-grow, right-aligned).
function was(p) {
  var s = d.createElement("s");
  s.className = "fitaf-was";
  s.setAttribute("aria-hidden", "true");
  s.style.cssText = "color:" + MUTED + ";font-size:" + parseFloat(w.getComputedStyle(p).fontSize) * 0.8 + "px;font-weight:400;line-height:1.2;text-decoration:line-through;white-space:nowrap;margin-right:.3em" + (p.parentNode.classList.contains("product__content-meta") ? ";flex-grow:1;text-align:right" : "");
  return s;
}
// § 36 item 6, kept true: the store redraws itself. sync() makes the page what it should be at this moment: for each
// price, one figure right before it with today's figure (made, moved or corrected); every other s.fitaf-was removed
// (a price gone, or no longer one, or the offer over). M maps a price element to its figure. Our own changes are made
// with the observer disconnected, so they never call it back; a fault leaves the page as it is and the observer on.
function sweep(keep) { [].forEach.call(d.querySelectorAll("s.fitaf-was"), function (x) { if (keep.indexOf(x) === -1) x.remove(); }); }
function sync() {
  T = 0;
  var keep = [];
  O.disconnect();
  try {
    share = current();
    if (share) prices().forEach(function (p) {
      var f = fig(text(p)), s;
      if (!f) return;
      s = M.get(p);
      if (!s) M.set(p, s = was(p));
      if (s.nextSibling !== p) p.parentNode.insertBefore(s, p);
      if (s.textContent !== f) s.textContent = f;
      keep.push(s);
    });
    sweep(keep);
  } catch (e) {}
  O.observe(d.documentElement, { subtree: true, childList: true, characterData: true });
}
// One MutationObserver on the document, for a marked visitor only, its work done at most once per animation frame; and
// once at the start, for what the page already shows.
M = new WeakMap();
O = new w.MutationObserver(function () { if (!T) T = w.requestAnimationFrame(sync); });
T = w.requestAnimationFrame(sync);
})();
