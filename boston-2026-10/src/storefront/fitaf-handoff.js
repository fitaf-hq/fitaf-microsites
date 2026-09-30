/* Fit AF cart hand-off. Source, comments and tests: fitaf-microsites, boston-2026-10/src/storefront.
   Kill switch: delete this block (never "Inject these scripts": that stops every vendor's). */
// ── How this file ships ────────────────────────────────────────────────────────────────────────────────
// `npm run build:storefront` writes it twice: the Footer block (fitaf-handoff.html) and the same text as a console file
// for the one-browser run (fitaf-handoff.fill-B.console.js). The build inlines the plan counts at the COUNTS slot, the
// progress screen's words (data/messages.json, `handoff`) at the UI slot and its colours (the page's own tokens,
// src/template.html) at the TOKENS slot, the meal-key function at the KEY slot and the progress screen's module
// (src/storefront/progress-screen.js, § 14) at the SCREEN slot, and drops every FULL-LINE `//` comment, like this one. SPEC-rung2 § 11 item 5: each built file should be at most 5,120 bytes (the build warns above)
// and must be at most 10,240 (it refuses above). `/* */` comments ship. The tests run the SHIPPED text, so what they
// prove is what is pasted.
//
// ⭐ SPEC-rung2 § 12: fill B is the one fill. Fill A, which wrote the store's cart storage, is retired; the history keeps
// it. The shipped text is pinned BYTE FOR BYTE (R2-32: its SHA-256), so every line that ships is changed only by an
// amendment, with the live smoke before its paste; only these `//` lines change freely. The last such amendment is
// SPEC-rung2-progress-and-checkout (rung 2's two faces): the progress screen while fill B fills the cart, and the
// checkout stripped by a style at `done`. Every press, wait and stop of fill B is as § 8–§ 12 left it.
//
// What it does (SPEC-rung2 § 6, § 8, § 11): a link to /order?mpid=N#fitaf=2.<key>[*n]…[.~code] presses each meal's own
// Add to Cart on the plan's order page, then the store's own CHECKOUT (§ 8), which takes the visitor to /checkout. Any
// failure removes the fragment and stops: the visitor keeps the plan's order page, as rung 1 leaves it.
// The body of the one function below is not indented, to spend the 5 KB on code rather than spaces; for the same
// reason, neighbouring declarations share one `var`.
(function () {
"use strict";
// The fill, named in the log line a link writes ("fill B, mpid N"). It was once a switch between two fills; it ships,
// so it stays (SPEC-rung2 § 12 item 3).
var FILL = "B";
var w = window, loc = w.location;
// An ordinary visit costs this one read of location.hash: no storage, no timer, no listener, no request,
// no log. Everything below runs only on a #fitaf= link.
if (loc.hash.slice(0, 7) !== "#fitaf=") return;
// Once per load: a second copy of this block, or a console paste on a page that has it, must not fill twice.
if (w.__fitafHandoff) return;
w.__fitafHandoff = true;
// mpid: meals a week, from data/plans.json, individual plans and Family. The store's order page will not check out
// short of the plan's count ("Please add at least 7 meals to continue": the one-browser run, 2026-09-29), so a
// payload must add exactly that many — never a cart that stops at checkout.
var COUNTS = /*COUNTS*/ {};
// SPEC-rung2-progress-and-checkout § 1: the screen's words, data/messages.json's `handoff` ({ title, step, checkout }),
// inlined by the build. No phrase of the screen is written in this file (R2-50).
var UI = /*UI*/ {};

function log(m) { w.console.info("[fitaf-handoff] " + m); }
function fail(m) { throw new Error(m); }
// Remove the fragment, keeping the path, the query and the router's own history state, so Back or a reload
// does not run the hand-off again.
function drop() { w.history.replaceState(w.history.state, "", loc.pathname + loc.search); }
// The one guard, around the start and every timer callback: any exception removes the fragment and stops. Removing
// the fragment is tried on its own, so its failing cannot skip the stop line.
function guard(fn) {
  return function () {
    try { fn(); } catch (e) {
      // Removing the fragment can fail too; then the page stays as it is.
      try { drop(); } catch (e3) {}
      end("stopped: " + e.message);
    }
  };
}

// ── Rung 2's two faces (SPEC-rung2-progress-and-checkout) ─────────────────────────────────────────────────────────────
// § 2, the progress screen, lives in its own module since § 14: src/storefront/progress-screen.js, ONE function,
// progressScreen(document, words, tokens), which the build inlines here at the SCREEN slot (as it inlines the key
// function at KEY) and tools/storybook imports. It makes the screen (one element of ours, #fitaf-screen, a manual
// popover over the whole viewport, with its own style and its CSS clocks: see the module's header) and returns its
// three moments: added() after each meal's press, last() after the press of CHECKOUT, remove() at done and at every
// stop. Fill B calls it through ui(), at the same moments as ever: made once every check has passed (the guard at the
// bottom: ui(screen)), a meal added after each press, the last step at CHECKOUT, removed through end(). S is what it
// returned; until then (and for a link refused before it) S is undefined, and ui() swallows the call.
var S, CODE;
// § 1: the page's colours for the screen, src/template.html's tokens as custom properties, inlined by the build (R2-50).
var TOKENS = "/*TOKENS*/";
var progressScreen = /*SCREEN*/ null;
// Everything the screen does runs inside ui(): a screen that cannot draw never stops fill B, whose presses cannot be
// taken back.
function ui(f) { try { f(); } catch (e) {} }
// Every verdict line (done, stopped) is written through end(): the screen is gone before the line (§ 2 item 4).
function end(m) { ui(function () { S.remove(); }); log(m); }
function screen() { S = progressScreen(w.document, UI, TOKENS); }
function last() { S.last(); }
// § 3, the checkout, stripped: at `done` only, the class fitaf-deep on <html> and ONE <style id="fitaf-deep">, never
// storage (a reload of /checkout is the store's full checkout). Every rule is scoped html.fitaf-deep:has(app-checkout), so
// it applies only while the store's checkout component is on the page, and a browser without :has() ignores it. It
// only hides. The hide list, the store's own names (release main-2HXLHIG7.js): H1 .sticky-header; H2 .footer and
// .app-hmp-credit; H5 app-storefront-popup-host (these three never inside app-checkout: `:not(app-checkout *)`); H3
// a.checkout__guest-signin-banner; H4 a.contact__sign-in; H6 the offer to subscribe, only while it is OFF: a
// .summary__plan-subscription-controls holding a switch (.summary__subscription-toggle) and no active one (…--active).
// ⚠ H6's `:has(.summary__subscription-toggle)` is the build's (found at the build, not ruled): for a plan that REQUIRES a
// subscription the store renders no switch at all ("Subscription required"), which the contract's H6 alone would hide,
// and § 3 item 3 says a commitment is never hidden. So: no switch, nothing hidden (R2-51b).
// § 10: H7 the discounts (.checkout-discounts, three placements), only when the link carries NO offer code (a coded
// link's second mark, fitaf-code, keeps them); H8 the app banner (.smartbanner), with the top margin its library sets on
// <html> undone (the one rule that does not hide: the space is the banner's); H9 the price rows (.summary__row) except a
// discount row, and never a row holding the Total (.summary__total is never hidden); H10 the tip (its section, or a bare
// app-tip-selector), only while no tip is chosen (.tip-selector__remove-btn shows once one is).
var DEEP = "html.fitaf-deep:has(app-checkout) :is(:is(.sticky-header,.footer,.app-hmp-credit,app-storefront-popup-host,.smartbanner):not(app-checkout *),a.checkout__guest-signin-banner,a.contact__sign-in,.summary__plan-subscription-controls:has(.summary__subscription-toggle):not(:has(.summary__subscription-toggle--active))," +
".checkout-discounts:not(.fitaf-code *),.summary__row:not(.summary__row--discount,:has(.summary__total)),:is(section.checkout__section.tip,app-tip-selector):not(:has(.tip-selector__remove-btn))){display:none!important}" +
"html.fitaf-deep:has(app-checkout)[data-smartbanner-original-margin-top]{margin-top:0!important}";
function mark() {
  var d = w.document, s = d.createElement("style");
  s.id = "fitaf-deep";
  s.textContent = DEEP;
  d.head.appendChild(s);
  d.documentElement.classList.add("fitaf-deep");
  if (CODE) d.documentElement.classList.add("fitaf-code");
}

// The payload, VERSION 2 (SPEC-rung2 § 11 item 1; version 1, base64 JSON, is retired and refused as an unknown
// version): ASCII, dot-separated, "2", then one item per meal, `<key>` or `<key>*<n>` (n from 2 to 21: a count of 1 is
// the bare key; 21 is the largest plan's weekly count), then optionally `~<code>`. A key is 5 base-36 characters (§ 11
// item 2, the KEY slot below). Checked whole, before anything is touched; any fault refuses all of it. 2048 characters
// is § 6's "over 2 KB", kept: 21 items never come near it. The plan is NOT in the payload: the guard at the bottom
// reads it from the page's own ?mpid=, and applies the full-plan rule (§ 7) there, last.
function payload(s) {
  if (s.length > 2048) fail("payload over 2 KB");
  var parts = s.split("."), items = [], keys = [], total = 0, code;
  if (parts.shift() !== "2") fail("unknown version");
  // The offer code is the last item, if any, and is checked but NOT applied in this build: how the store takes one is
  // not yet proven.
  if (/^~/.test(parts[parts.length - 1])) code = parts.pop().slice(1);
  if (code !== undefined && !/^[A-Za-z0-9-]{1,40}$/.test(code)) fail("bad code");
  if (!parts.length) fail("no items");
  parts.forEach(function (part) {
    var m = /^([0-9a-z]{5})(?:\*([2-9]|1\d|2[01]))?$/.exec(part) || fail("bad meal: " + part), n = +(m[2] || 1);
    // A meal named twice would be two meals to B, pressing one card twice over; its count belongs in one item.
    if (keys.indexOf(m[1]) >= 0) fail("named twice: " + m[1]);
    keys.push(m[1]);
    items.push({ key: m[1], qty: n });
    total += n;
  });
  return { items: items, total: total, code: code };
}

// B polls every 200 ms: for at most 10 s before a press (the meal cards render after the store's own start-up; the
// store's CHECKOUT enables once the plan is full), and for at most 30 s after the store's CHECKOUT (SPEC-rung2 § 11
// item 4: one live phone-width run of four stopped at 10 s with the store still committing).
var POLL_MS = 200, MAX_POLLS = 50, AFTER_CHECKOUT = 150;
// A meal's key: src/storefront/meal-key.js, the one function the link tool also runs, inlined here by the build.
var key = /*KEY*/ null;
// Fill B keys each meal card's title as the page shows it, and presses the card whose key the link names.
function text(el) { return el.textContent.replace(/\s+/g, " ").trim(); }
function first(el, sel, ok) { return [].filter.call(el.querySelectorAll(sel), ok)[0]; }
// SPEC-rung2 § 11 item 3: two cards whose titles share a key the link names cannot be told apart, so the link is
// refused, nothing pressed. It runs on every lookup, so on every poll before the first press.
function card(k) {
  var c = [].filter.call(w.document.querySelectorAll("app-product-card"), function (el) {
    var t = el.querySelector(".product__content-title");
    return t && key(text(t)) === k;
  });
  if (c[1]) fail("two meals share a key: " + k);
  return c[0];
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
// SPEC-rung2 § 10: B presses the plan's whole count, so it starts only on a plan that holds NOTHING yet, and never
// removes a visitor's meals. Read from the store's public code (§ 10's build note): the store displays a control in its
// checkout slot only while this plan holds something. Below 1025 px its cart bar, hidden while the plan is empty, holds
// CHECKOUT, "Add N more meal(s)" or "Limit Exceeded"; at 1025 px and wider its cart sidebar, which shows "Your cart is
// empty" instead, holds CHECKOUT NOW, "ADD N MORE MEAL(S) TO CHECKOUT" or "REMOVE N MEAL(S) TO CHECKOUT". Any of them
// displayed, enabled or not, outside a meal card: stop, pressing nothing. Matched loosely, because a false "held"
// only stops B, while a false "empty" would press a whole plan on top of the visitor's.
var HELD = /checkout|more meal|limit exceeded/i;
// Wait until EVERY meal's card and Add to Cart are on the page, then press; a meal still missing after 10 s
// refuses the whole payload with nothing pressed, naming its key (a v2 link carries no names). The § 10 check runs
// on every poll, the last one just before the first press: a meal already chosen shows the store's quantity counter
// in place of its Add to Cart, so on a reload the payload's meals are never all found, and a check made only once
// they were would never run.
function fillB(p) {
  var polls = 0;
  guard(function poll() {
    if (control(HELD, 1)) fail("the plan already holds meals");
    var missing = p.items.filter(function (it) { return !addButton(card(it.key)); });
    if (!missing.length) return press(steps(p.items), 0);
    if (++polls >= MAX_POLLS) fail("not on this page: " + missing.map(function (it) { return it.key; }));
    w.setTimeout(guard(poll), POLL_MS);
  })();
}
// Every meal's first press comes before any meal's second: if a card then offers no way to add another, B
// stops with each meal in the cart once, rather than some meals complete and others absent. (No `<` in the shipped
// text, SPEC-rung2-progress-and-checkout § 11: the loop's test is written the other way round.)
function steps(items) {
  var list = items.map(function (it) { return [it.key, 0]; });
  items.forEach(function (it) { for (var n = 1; it.qty > n; n++) list.push([it.key, n]); });
  return list;
}
// One press per tick, so the store can re-render between presses. ⚠ A control missing after a press stops
// here with part of the payload already in the cart: a press cannot be taken back.
function press(list, k) {
  if (k === list.length) return checkout();
  var meal = list[k][0], n = list[k][1], c = card(meal);
  var b = (n ? moreButton(c) : addButton(c)) || fail("no control to add " + meal + " after " + n);
  b.click();
  ui(function () { S.added(meal, c, k + 1, list.length); });
  w.setTimeout(guard(function () { press(list, k + 1); }), POLL_MS);
}
// SPEC-rung2 § 8. On a meal-plan page the store's Add to Cart puts a meal in the plan's PENDING list, not the cart;
// only the store's own checkout control commits that list and routes to /checkout inside the app. So B never loads
// /checkout and never writes storage: it presses that control, found like the meals, by its visible label.
// control(re, any): the first button whose text, whitespace collapsed, matches `re`; enabled, unless `any` (§ 10's
// check reads the store's disabled states too); displayed (the page renders a desktop and a mobile layout, one of them
// hidden); not inside a meal card. § 8's labels are anchored, so each is matched exactly and in any case: CHECKOUT is
// the phone and tablet bar's; CHECKOUT NOW the desktop sidebar's (1025 px and wider); both run the store's same
// checkout (§ 8, amended 2026-09-29).
function control(re, any) {
  return first(w.document, "button", function (b) {
    return (any || !b.disabled) && re.test(text(b)) && b.getClientRects().length && !b.closest("app-product-card,app-product-card-mobile");
  });
}
// Wait for an enabled CHECKOUT (short of the plan's count the store shows a disabled "Add N more meals"), remove the
// fragment, press it once. Then wait for /checkout; if the store opens its extras dialog instead, press the dialog's
// CONTINUE TO CHECKOUT, once, and add nothing from it. The wait for CHECKOUT is at most 50 polls of 200 ms (10 s); each
// wait after a press of the store's (CHECKOUT, then CONTINUE) at most 150 (30 s, § 11 item 4). No CHECKOUT: the meals
// stay in the visitor's pending list, as if they had pressed the buttons themselves, and the page is the store's own.
// k counts the presses made: 0, CHECKOUT not yet; 1, CHECKOUT; 2, the dialog's too (nothing more is looked for:
// its pattern, (?!), matches no text at all, not even an empty one, so the wait for /checkout goes on).
// Rung 2's two faces: after the press of CHECKOUT, the screen's last step (last(): the bar full, the checkout line); at
// done, the mark and the style first, then the screen goes (§ 2 item 4: the first thing the visitor sees is the
// stripped checkout). § 12 item 2 (the Advisor's ruling): IMMEDIATELY BEFORE the press of CHECKOUT, and at no other
// moment, the store's own key sessionStorage['ecc_additions_prompt_handled'] = "true", its mark for "the extras pop-up
// has been dealt with", so the store goes straight to /checkout. The one thing fill B ever writes. The store clears it
// itself when its order page starts; a store that ignores it opens its pop-up, invisible under the screen, and fill B
// presses its CONTINUE TO CHECKOUT as before (§ 10). A storage that throws changes nothing (ui()).
function checkout() {
  var k = 0, polls = 0;
  guard(function poll() {
    if (k && loc.pathname === "/checkout") { ui(mark); return end("done: /checkout"); }
    var b = control([/^checkout( now)?$/i, /^continue to checkout$/i, /(?!)/][k]);
    if (b) { if (!k) { drop(); ui(function () { w.sessionStorage.setItem("ecc_additions_prompt_handled", "true"); }); } b.click(); if (!k) ui(last); k++; polls = 0; }
    else if (++polls >= (k ? AFTER_CHECKOUT : MAX_POLLS)) return k ? end("stopped: /checkout not reached") : fail("no checkout control");
    w.setTimeout(guard(poll), POLL_MS);
  })();
}

// The plan is the page's own ?mpid= (SPEC-rung2 § 11 item 1), read once: a whole number with no leading zero. Then the
// full-plan rule (§ 7), last, so every other fault above reports itself first.
guard(function () {
  if (loc.pathname !== "/order") fail("not the order page");
  var p = payload(loc.hash.slice(7)), m = /[?&]mpid=([1-9]\d{0,8})(&|$)/.exec(loc.search) || fail("no mpid on this page");
  p.mpid = +m[1];
  var need = COUNTS[p.mpid] || fail("unknown mpid " + p.mpid);
  if (p.total !== need) fail("the plan needs " + need + " meals; the link has " + p.total);
  log("fill " + FILL + ", mpid " + p.mpid + (p.code ? "; offer code not applied" : ""));
  // SPEC-rung2-progress-and-checkout § 1, § 2 item 1: the screen, now that the link and the plan's count have passed
  // their checks, and before fill B's first poll. A link refused above shows nothing new.
  CODE = p.code;
  ui(screen);
  // The two-fill source's dispatch, kept because it ships (SPEC-rung2 § 12 item 3): FILL is "B", so the line after it
  // never runs.
  if (FILL === "B") return fillB(p);
  fail("fill " + FILL + " is not in this text");
})();
})();
