/* Fit AF cart hand-off. Source, comments and tests: fitaf-microsites, boston-2026-10/src/storefront.
   Kill switch: delete this block (never "Inject these scripts": that stops every vendor's). */
// ── How this file ships ────────────────────────────────────────────────────────────────────────────────
// `npm run build:storefront` writes ONE fill per file: the Footer block gets the fill FILL names below, and
// each fill also gets a console file for the one-browser run. For a fill, the build removes the other fill's
// `// <fill X>` … `// </fill X>` regions, inlines the plan table at the PLANS slot, and drops every FULL-LINE
// `//` comment, like this one: with both fills and every comment the text is ~8.7 KB, and SPEC-rung2 § 3
// says "under 5 KB". `/* */` comments ship. The tests run the SHIPPED texts, so what they prove is what is pasted.
//
// What it does (SPEC-rung2 § 6): a link to /order?mpid=N#fitaf=<payload> fills the cart, then opens /checkout.
// Any failure removes the fragment and stops: the visitor keeps the plan's order page, as rung 1 leaves it.
// The body of the one function below is not indented, to spend the 5 KB on code rather than spaces.
(function () {
"use strict";
var FILL = "B"; /* A writes the store's cart storage; B presses the page's own buttons. A text holds one. */
var w = window;
var loc = w.location;
// An ordinary visit costs this one read of location.hash: no storage, no timer, no listener, no request,
// no log. Everything below runs only on a #fitaf= link.
if (loc.hash.slice(0, 7) !== "#fitaf=") return;
// Once per load: a second copy of this block, or a console paste on a page that has it, must not fill twice.
if (w.__fitafHandoff) return;
w.__fitafHandoff = true;
// Set by fill A once it has written: puts the cart key back exactly as it was, absent included.
var undo;

function log(m) { w.console.info("[fitaf-handoff] " + m); }
function fail(m) { throw new Error(m); }
// Remove the fragment, keeping the path, the query and the router's own history state, so Back or a reload
// does not run the hand-off again.
function drop() { w.history.replaceState(w.history.state, "", loc.pathname + loc.search); }
// The one guard, around the start and every timer callback: any exception undoes A's write, removes the
// fragment and stops. Each clean-up step is tried on its own, so one failing cannot skip the other.
function guard(fn) {
  return function () {
    try { fn(); } catch (e) {
      try { if (undo) undo(); } catch (e2) { log("restore failed: " + e2.message); }
      try { drop(); } catch (e3) { /* the page stays as it is */ }
      log("stopped: " + e.message);
    }
  };
}

function whole(n, max) { return typeof n === "number" && n % 1 === 0 && n >= 1 && n <= max; }
// The payload: base64url of UTF-8 JSON, version 1. Checked whole, before anything is touched; any fault
// refuses all of it. 2048 characters is SPEC-rung2's "over 2 KB"; 21 is the largest plan's weekly count.
function payload(s) {
  if (s.length > 2048) fail("payload over 2 KB");
  if (!/^[\w-]+$/.test(s)) fail("not base64url");
  var p;
  // atob gives one character per byte; escape + decodeURIComponent reads those bytes as UTF-8 (meal names are
  // not all ASCII). Both are in every browser.
  try { p = JSON.parse(decodeURIComponent(escape(w.atob(s.replace(/-/g, "+").replace(/_/g, "/"))))); }
  catch (e) { fail("not JSON"); }
  if (!p || p.v !== 1) fail("unknown version");
  if (!whole(p.mpid, 1e9)) fail("bad mpid");
  if (!Array.isArray(p.items) || !p.items.length) fail("no items");
  var names = [];
  p.items.forEach(function (it) {
    if (!it || typeof it.name !== "string" || !it.name) fail("bad meal name");
    // A meal named twice would be two meals to B, pressing one card twice over; its count belongs in one item.
    if (names.indexOf(it.name) >= 0) fail("named twice: " + it.name);
    names.push(it.name);
    if (!whole(it.qty, 21)) fail("bad qty: " + it.name);
    if (it.pid !== undefined && !whole(it.pid, 1e9)) fail("bad pid: " + it.name);
  });
  // The offer code is checked but NOT applied in this build: how the store takes one is not yet proven.
  if (p.code !== undefined && !(typeof p.code === "string" && /^[\w-]{1,40}$/.test(p.code))) fail("bad code");
  return p;
}

// <fill A>
var CART_KEY = "hmp_local_cart";
// mpid: [plan, per-meal cents], from data/plans.json: the prices fill A writes. Whether the store recomputes
// them when it syncs the cart is one of the things the one-browser run shows. Family is not a portion plan,
// so it is not in the table and A refuses it.
var PLANS = /*PLANS*/ {};
// The portion add-on of a real cart line (2026-09-27): field 1297, option by plan. Performance's option id is
// not known, so A refuses a Performance mpid.
var OPTION = { Lean: 10538, Signature: 10539 };
// Fill A: append one line per meal to the store's cart storage (a visitor's own lines are kept), then load
// /checkout afresh so the store reads them. One setItem, so no line is ever half-written.
function fillA(p) {
  var plan = PLANS[p.mpid] || fail("no plan for mpid " + p.mpid);
  var option = OPTION[plan[0]] || fail(plan[0] + ": option not known");
  var ls = w.localStorage;
  var before = ls.getItem(CART_KEY);
  var cart;
  try { cart = before === null ? [] : JSON.parse(before); } catch (e) { /* refused below */ }
  if (!Array.isArray(cart)) fail("stored cart is not a list");
  var ids = cart.map(function (l) { return l && String(l.localId); });
  p.items.forEach(function (it) {
    // A fresh localId in the real line's form, five digits as a string, unique in this cart.
    var id;
    do id = String(10000 + Math.floor(Math.random() * 90000)); while (ids.indexOf(id) >= 0);
    ids.push(id);
    // The shape of the real line, every field kept.
    cart.push({
      localId: id, productId: it.pid || fail("no product id: " + it.name), quantity: it.qty,
      unitPriceCents: plan[1], baseUnitPriceCents: plan[1], regularPriceCents: plan[1],
      name: it.name, images: [],
      itemData: [{ name: "Portion", display: plan[0], value: plan[0], price: "0.00" }],
      extensions: { mpid: p.mpid }, cartItemData: { mpid: p.mpid },
      hmpAddons: [{ addon_field_id: 1297, addon_field_option_id: option, quantity: it.qty }],
      includeAddonPrices: false, isFreeTreat: false, freeTreatTierId: null, freeTreatOrigin: null
    });
  });
  ls.setItem(CART_KEY, JSON.stringify(cart));
  undo = function () {
    if (before === null) ls.removeItem(CART_KEY);
    else ls.setItem(CART_KEY, before);
  };
  drop();
  loc.replace("/checkout");
}
// </fill A>

// <fill B>
// B polls every 200 ms for at most 10 s: the meal cards render after the store's own start-up.
var POLL_MS = 200;
var MAX_POLLS = 50;
// Fill B finds each meal by its name as the page shows it, and presses the card's own controls.
function text(el) { return el.textContent.replace(/\s+/g, " ").trim(); }
function first(el, sel, ok) { return [].filter.call(el.querySelectorAll(sel), ok)[0]; }
function card(name) {
  return first(w.document, "app-product-card", function (c) {
    var t = c.querySelector(".product__content-title");
    return t && text(t) === name;
  });
}
function addButton(c) {
  return c && first(c, ".product__actions button", function (b) { return text(b).indexOf("Add to Cart") >= 0; });
}
// What Add to Cart becomes once pressed is NOT known (a quantity stepper?). Best effort, unproven until the
// one-browser run: Add to Cart again if it is still there; else, in the same card's .product__actions only, a
// button whose label or text says increase, plus or "+" — never one that mentions a favourite or a wishlist.
function moreButton(c) {
  return addButton(c) || c && first(c, ".product__actions button", function (b) {
    var label = (b.getAttribute("aria-label") || "") + " " + text(b);
    return /increase|plus|\+/i.test(label) && !/favo|wish/i.test(label);
  });
}
// Wait until EVERY meal's card and Add to Cart are on the page, then press; a meal still missing after 10 s
// refuses the whole payload with nothing pressed.
function fillB(p) {
  var polls = 0;
  guard(function poll() {
    var missing = p.items.filter(function (it) { return !addButton(card(it.name)); });
    if (!missing.length) return press(steps(p.items), 0);
    if (++polls >= MAX_POLLS) fail("not on this page: " + missing.map(function (it) { return it.name; }));
    w.setTimeout(guard(poll), POLL_MS);
  })();
}
// Every meal's first press comes before any meal's second: if a card then offers no way to add another, B
// stops with each meal in the cart once, rather than some meals complete and others absent.
function steps(items) {
  var list = items.map(function (it) { return [it.name, 0]; });
  items.forEach(function (it) { for (var n = 1; n < it.qty; n++) list.push([it.name, n]); });
  return list;
}
// One press per tick, so the store can re-render between presses. ⚠ A control missing after a press stops
// here with part of the payload already in the cart: a press cannot be taken back.
function press(list, k) {
  if (k === list.length) {
    drop();
    return loc.assign("/checkout");
  }
  var name = list[k][0];
  var n = list[k][1];
  var c = card(name);
  var b = (n ? moreButton(c) : addButton(c)) || fail("no control to add " + name + " after " + n);
  b.click();
  w.setTimeout(guard(function () { press(list, k + 1); }), POLL_MS);
}
// </fill B>

guard(function () {
  if (loc.pathname !== "/order") fail("not the order page");
  var p = payload(loc.hash.slice(7));
  var m = /[?&]mpid=([^&]*)/.exec(loc.search);
  if (!m || m[1] !== String(p.mpid)) fail("mpid " + p.mpid + " is not this page's");
  log("fill " + FILL + ", mpid " + p.mpid + (p.code ? "; offer code not applied" : ""));
  // <fill A>
  if (FILL === "A") return fillA(p);
  // </fill A>
  // <fill B>
  if (FILL === "B") return fillB(p);
  // </fill B>
  fail("fill " + FILL + " is not in this text");
})();
})();
