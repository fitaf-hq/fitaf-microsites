/* Fit AF cart hand-off. Source, comments and tests: fitaf-microsites, boston-2026-10/src/storefront.
   Kill switch: delete this block (never "Inject these scripts": that stops every vendor's). */
// ── How this file ships ────────────────────────────────────────────────────────────────────────────────
// `npm run build:storefront` writes it twice: the Footer block (fitaf-handoff.html) and the same text as a console file
// for the one-browser run (fitaf-handoff.fill-B.console.js). The build inlines the plan counts at the COUNTS slot and
// the meal-key function at the KEY slot, and drops every FULL-LINE `//` comment, like this one. SPEC-rung2 § 11 item 5:
// each built file should be at most 5,120 bytes (the build warns above) and must be at most 10,240 (it refuses above).
// `/* */` comments ship. The tests run the SHIPPED text, so what they prove is what is pasted.
//
// ⭐ SPEC-rung2 § 12: fill B is the one fill. Fill A, which wrote the store's cart storage, is retired; the history keeps
// it. The shipped text is pinned BYTE FOR BYTE (R2-32: its SHA-256 is that of the block in the store's Footer), so every
// line that ships stays as it was, `var FILL = "B"` and the dispatch at the bottom included: only these `//` lines may
// change freely. A change to a shipped line is a separate amendment, with the live smoke before its paste.
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
      log("stopped: " + e.message);
    }
  };
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
// stops with each meal in the cart once, rather than some meals complete and others absent.
function steps(items) {
  var list = items.map(function (it) { return [it.key, 0]; });
  items.forEach(function (it) { for (var n = 1; n < it.qty; n++) list.push([it.key, n]); });
  return list;
}
// One press per tick, so the store can re-render between presses. ⚠ A control missing after a press stops
// here with part of the payload already in the cart: a press cannot be taken back.
function press(list, k) {
  if (k === list.length) return checkout();
  var meal = list[k][0], n = list[k][1], c = card(meal);
  var b = (n ? moreButton(c) : addButton(c)) || fail("no control to add " + meal + " after " + n);
  b.click();
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
function checkout() {
  var k = 0, polls = 0;
  guard(function poll() {
    if (k && loc.pathname === "/checkout") return log("done: /checkout");
    var b = control([/^checkout( now)?$/i, /^continue to checkout$/i, /(?!)/][k]);
    if (b) { if (!k) drop(); b.click(); k++; polls = 0; }
    else if (++polls >= (k ? AFTER_CHECKOUT : MAX_POLLS)) return k ? log("stopped: /checkout not reached") : fail("no checkout control");
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
  // The two-fill source's dispatch, kept because it ships (SPEC-rung2 § 12 item 3): FILL is "B", so the line after it
  // never runs.
  if (FILL === "B") return fillB(p);
  fail("fill " + FILL + " is not in this text");
})();
})();
