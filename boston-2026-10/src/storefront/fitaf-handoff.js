/* Fit AF cart hand-off. Source, comments and tests: fitaf-microsites, boston-2026-10/src/storefront.
   Kill switch: delete this block (never "Inject these scripts": that stops every vendor's). */
// ── How this file ships ────────────────────────────────────────────────────────────────────────────────
// `npm run build:storefront` writes it twice: the Footer block (fitaf-handoff.html) and the same text as a console file
// for the one-browser run (fitaf-handoff.fill-B.console.js). The build inlines the plan counts at the COUNTS slot, the
// progress screen's words (data/messages.json, `handoff`) at the UI slot and its colours (the page's own tokens,
// src/template.html) at the TOKENS slot, and the meal-key function at the KEY slot, and drops every FULL-LINE `//`
// comment, like this one. SPEC-rung2 § 11 item 5: each built file should be at most 5,120 bytes (the build warns above)
// and must be at most 15,360 (it refuses above; SPEC-rung2-progress-and-checkout § 17.3, for the 2026-10-01 meeting). `/* */` comments ship. The tests run the SHIPPED text, so what they
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
// reason, neighbouring declarations share one `var`. And since SPEC-rung2-progress-and-checkout § 15 (the Fit AF logo,
// the wait for the cards and the key's tag took the Footer past its 10,240-byte ceiling), every line inside it is
// indented one level less than usual: a function's body starts at the left edge, a block inside it two spaces in.
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
// § 2, the progress screen: ONE element of ours, #fitaf-screen, appended to <body> once every check has passed (the
// guard at the bottom), fixed over the whole viewport above every layer of the store's. It holds its own <style>, the
// title (an h2), the bar (.b, whose one child's width is the progress: presses made of the plan's count + 1, the last
// being the store's CHECKOUT), the carousel (.c, one slide per meal, the one shown marked `on`) and the step line (the
// one role=status). Nothing on it can be acted on or focused, and it touches nothing of the store's (§ 2 items 3, 5).
// ⚠ The store's own dialogs and pop-ups are Angular CDK overlays, which a browser with the Popover API shows in its TOP
// LAYER, above any z-index (found at the build, release main-2HXLHIG7.js). So the screen is a manual popover too, shown
// at once: above everything on the page and every overlay already open (a pop-up shown at load). An overlay the store
// opens LATER (its extras dialog after CHECKOUT) is above it. Where there is no Popover API, the z-index alone.
// ⚠ Its clocks are CSS animations, not timers: fitaf-e, 90 s on the screen itself, whose end removes it (§ 2 item 4:
// "in any case 90 s after it appeared", even if fill B's own polls never come again), and fitaf-t, 2.5 s, repeating on
// the carousel once every meal is added, each turn showing the next slide. Fill B's timers stay its 200 ms polls
// alone (R2-09, R2-15 … pin that). With prefers-reduced-motion nothing inside the screen animates, so nothing slides
// and nothing cycles; the screen's own clock moves nothing and runs on, `!important` on its own id, so a page's
// reduced-motion reset of every animation (`* { animation-duration: 0.01ms !important }`, common, not in this release)
// cannot end it at once.
// § 10 item 1: the store's extras pop-up (its overlay pane holding app-extra-products-dialog, and that overlay's
// backdrop) is made INVISIBLE, never removed, while the screen is up: the rule is in the screen's own <style>, so it goes
// with the screen, at done, at every stop, and at the 90 s clock alike (the build's reading of "a class fill B sets on
// <html> … and removes with it": the screen itself is that mark). Fill B's own test for a displayed control
// (getClientRects) still finds CONTINUE TO CHECKOUT, and presses it as before.
// § 15.3: the carousel's photos are `.c img` in the style, so the screen's Fit AF logo (below) is not one of them.
var S, NOW, SLIDES = {}, CODE, L, SHEET, CELLS = {}, BAD;
var CSS = "#fitaf-screen{/*TOKENS*/;position:fixed;inset:0;width:auto;height:auto;margin:0;border:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;background:var(--navy);color:var(--white);font:16px/1.4 system-ui,sans-serif;text-align:center;animation:fitaf-e 90s!important}" +
"#fitaf-screen>div{width:100%;max-width:420px}#fitaf-screen h2{margin:0 0 16px;font-size:24px;font-weight:700;color:inherit}" +
"#fitaf-screen .b{height:8px;border-radius:4px;background:var(--ice);overflow:hidden}#fitaf-screen i{display:block;height:100%;width:0;background:var(--cta);transition:width .3s}" +
"#fitaf-screen .c{margin:24px 0 16px}#fitaf-screen .c>*{display:none}#fitaf-screen .c>.on{display:block;animation:fitaf-in .4s}#fitaf-screen .y{animation:fitaf-t 2.5s infinite}" +
"#fitaf-screen .c img{display:block;width:100%;height:min(220px,32vh);object-fit:cover;border-radius:6px}#fitaf-screen .f{position:relative;overflow:hidden;height:min(220px,32vh);margin:0 auto;border-radius:6px}#fitaf-screen .f img{position:absolute;height:auto;max-width:none;border-radius:0}#fitaf-screen b{display:block;margin-top:10px;font-size:18px}#fitaf-screen p{margin:0;min-height:1.4em}" +
".cdk-overlay-pane:has(app-extra-products-dialog),.cdk-overlay-backdrop:has(+* app-extra-products-dialog){visibility:hidden!important}" +
"@keyframes fitaf-e{}@keyframes fitaf-t{}@keyframes fitaf-in{from{opacity:0;transform:translateX(24px)}}@media (prefers-reduced-motion:reduce){#fitaf-screen *{animation:none!important;transition:none!important}}";
// Everything the screen does runs inside ui(): a screen that cannot draw never stops fill B, whose presses cannot be
// taken back.
function ui(f) { try { f(); } catch (e) {} }
// Every verdict line (done, stopped) is written through end(): the screen is gone before the line (§ 2 item 4).
function end(m) { ui(function () { S.remove(); }); log(m); }
function $(q) { return S.querySelector(q); }
// SPEC-rung2-progress-and-checkout § 11: the store's admin reads the text inside this <script> as HTML and rejects a
// tag in it, so the screen is built element by element (its style's rules as textContent): no markup string, no
// innerHTML, and no `<` before a letter, `/` or `!` anywhere in the shipped text (R2-58). The same elements as before:
// #fitaf-screen > style, div > (h2, div.b > i, div.c, p[role=status][aria-live=polite]).
function make(tag, parent, cls) { var e = w.document.createElement(tag); if (cls) e.className = cls; return parent.appendChild(e); }
function screen() {
S = w.document.createElement("div");
S.id = "fitaf-screen";
S.setAttribute("popover", "manual");
make("style", S).textContent = CSS;
var box = make("div", S), line;
make("h2", box).textContent = UI.title;
make("i", make("div", box, "b"));
make("div", box, "c").onanimationiteration = function () { show(NOW.nextElementSibling || this.firstElementChild); };
line = make("p", box);
line.setAttribute("role", "status");
line.setAttribute("aria-live", "polite");
S.onanimationend = function (e) { if (e.target === S) S.remove(); };
w.document.body.appendChild(S);
if (S.showPopover) S.showPopover();
}
function show(el) { if (NOW) NOW.className = ""; (NOW = el).className = "on"; }
// SPEC-rung2-progress-and-checkout § 15.3: the Fit AF logo is THE STORE'S OWN, the page's img.header__logo-image (the
// image its header already loads, from its own image host), in an img made with the DOM: alt "Fit AF", not a link,
// nothing focusable. No image URL is in this text. As the carousel's photos (§ 2 item 2), it is made only once the
// header's image has LOADED (complete, with a width), from its currentSrc, so nothing is requested; until then, none.
// `css`: the margin, then the height; it is centred (a block with auto side margins). No header logo: no logo.
function logo(css) {
var h = w.document.querySelector("img.header__logo-image"), i = h && h.complete && h.naturalWidth && w.document.createElement("img");
if (i) i.src = h.currentSrc, i.alt = "Fit AF", i.style.cssText = "display:block;margin:" + css;
return i;
}
// On the screen: the first thing, above the title, 48 px high, on a white plate (the Advisor, 2026-09-30, after seeing
// it: "Top, on a white plate"; the logo's grey tagline was faint on navy). The plate is the image's OWN padding, rounded
// corners and background, the screen's --white token: a plate element around it measured 10,308 bytes, over the
// Footer's 10,240. Tried at every poll of fill B's wait and at every press until it is placed (L), because the store's
// header may load its logo after this block runs; placed once.
function brand() { if (!L && (L = logo("0 auto 16px;height:48px;padding:8px 10px;border-radius:8px;background:var(--white)"))) $("h2").before(L); }
// After press k of t: the meal's slide, made at its first press from its own card (§ 2 item 2: its name as the card
// shows it, and its photograph only if the page has already loaded it: the card's img complete with a width, whose
// currentSrc the slide reuses, so nothing new is requested), shown; the bar at k of t + 1; the step line.
// § 17.2: a meal the link gives a cell (CELLS, below) shows, at once, that cell of Fit AF's sheet: a box of the cell's
// own ratio at the slide's height, holding the whole sheet scaled so the cell fills the box (its width the sheet's in
// cells, its left and top the cell's offset), the box clipping the rest. The store's card image is not waited for. If the
// sheet fails (the img's error, or the early load's: BAD), the slide falls back to today's rule, pic(), and no later
// slide asks for the sheet again.
function pic(el, c) {
var im = c.querySelector("img"), i;
if (im && im.complete && im.naturalWidth) { i = el.insertBefore(w.document.createElement("img"), el.firstChild); i.alt = ""; i.src = im.currentSrc; }
}
function added(meal, c, k, t) {
var d = w.document, el = SLIDES[meal], x = CELLS[meal], f, g;
brand();
if (!el) {
  el = SLIDES[meal] = d.createElement("div");
  el.appendChild(d.createElement("b")).textContent = text(c.querySelector(".product__content-title"));
  if (x && !BAD) {
    f = el.insertBefore(d.createElement("div"), el.firstChild);
    f.className = "f";
    f.style.cssText = "aspect-ratio:" + x[2] / x[3];
    g = f.appendChild(d.createElement("img"));
    g.alt = "";
    g.style.cssText = "width:" + x[4] / x[2] * 100 + "%;left:" + -x[0] / x[2] * 100 + "%;top:" + -x[1] / x[3] * 100 + "%";
    g.onerror = function () { BAD = 1; ui(function () { f.remove(); pic(el, c); }); };
    g.src = SHEET;
  } else pic(el, c);
  $(".c").appendChild(el);
}
show(el);
$("i").style.width = k / (t + 1) * 100 + "%";
$("p").textContent = UI.step.replace("{meal}", el.lastChild.textContent).replace("{n}", k).replace("{total}", t);
if (k === t) $(".c").className = "c y";
}
function last() { $("i").style.width = "100%"; $("p").textContent = UI.checkout; }
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
// § 19: each order line shows only its photograph and its name: hidden, H11 its price (.summary__item-price), H12 its
// portion (the add-on pills, .summary__item-addons), H13 its quantity control (.summary__item-quantity-controls), H14
// its remove control (.summary__item-remove), and H15 the plan's total row (.summary__plan-total); the order's Total stays
// (H9). And COMPACT, the only rules that do not hide but the banner's (§ 19 item 2): each line 48 px high, its photograph
// 48 px, its name at most two lines, so fourteen lines fit one 390 x 844 screen (R2-80). Names from the store's public
// code of 2026-09-29; their specificity is above the store's own (.summary__item[_ngcontent-...]), so no !important.
// § 21: H16 the plan group's header (.summary__plan-group-header: the plan's name, "Remove plan", the chevron) and H17
// its return link (.summary__plan-return, "Return to ..."), hidden.
var DEEP = "html.fitaf-deep:has(app-checkout) :is(:is(.sticky-header,.footer,.app-hmp-credit,app-storefront-popup-host,.smartbanner):not(app-checkout *),a.checkout__guest-signin-banner,a.contact__sign-in,.summary__plan-subscription-controls:has(.summary__subscription-toggle):not(:has(.summary__subscription-toggle--active))," +
".checkout-discounts:not(.fitaf-code *),.summary__row:not(.summary__row--discount,:has(.summary__total)),:is(section.checkout__section.tip,app-tip-selector):not(:has(.tip-selector__remove-btn))," +
".summary__item-price,.summary__item-addons,.summary__item-quantity-controls,.summary__item-remove,.summary__plan-total,.summary__plan-group-header,.summary__plan-return){display:none!important}" +
"html.fitaf-deep:has(app-checkout)[data-smartbanner-original-margin-top]{margin-top:0!important}" +
"html.fitaf-deep:has(app-checkout) .summary__item{padding:3px 6px;margin:0 0 2px;gap:8px;align-items:center}html.fitaf-deep:has(app-checkout) .summary__item-image{width:48px;height:48px}" +
"html.fitaf-deep:has(app-checkout) .summary__item-name{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.3}";
// § 15.3, on the checkout: the logo (above) centred at the top of the store's checkout component, 40 px high, where the
// store's hidden header was (H1). Inside app-checkout, so it goes with the component, as every H rule stops applying:
// only while the checkout is on the page, and only for a deep-carted visit (it is placed at done, never on a stop).
// Last, so that nothing it does can keep the mark and the style from being set.
function mark() {
var d = w.document, s = d.createElement("style"), c, i;
s.id = "fitaf-deep";
s.textContent = DEEP;
d.head.appendChild(s);
d.documentElement.classList.add("fitaf-deep");
if (CODE) d.documentElement.classList.add("fitaf-code");
if ((c = d.querySelector("app-checkout")) && (i = logo("16px auto;height:40px"))) c.prepend(i);
}

// SPEC-rung2-progress-and-checkout § 17.1: the link's photo part, after the meal part, "!"-separated (the link tool,
// scripts/handoff-link.mjs, writes it): the host's CODE, its index in HOSTS, the fixed list the build inlines from the
// tool's own (the production site, the test address); the sheet's path on that host, from its first "/"; the sheet's
// width in base 36;
// then one cell per meal in the link's order, "x,y,w,h" in base 36, or empty. ⛔ The host is never a URL from the link:
// a code that is not one digit naming a host of the list means no photograph, and nothing is requested. Any fault in
// the photo part means no photograph for that meal (or none at all), never a stop: the order is the meal part's.
// The sheet is asked for once here, before the first press (the img is not placed): the slides' imgs reuse it.
var HOSTS = /*HOSTS*/ [];
function photos(f, items) {
var h = /^\d$/.test(f[0]) && HOSTS[f[0]], W = parseInt(f[2], 36), g;
if (!h || !/^\/[\w\/.-]{1,200}$/.test(f[1]) || !(W > 0)) return;
SHEET = h + f[1];
items.forEach(function (it, k) {
  var c = /^[0-9a-z]{1,4}(,[0-9a-z]{1,4}){3}$/.test(f[k + 3]) && f[k + 3].split(",").map(function (n) { return parseInt(n, 36); });
  if (c && c[2] && c[3] && W >= c[0] + c[2]) CELLS[it.key] = c.concat(W);
});
g = w.document.createElement("img");
g.onerror = function () { BAD = 1; };
g.src = SHEET;
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
// item 4: one live phone-width run of four stopped at 10 s with the store still committing). SPEC-rung2-progress-and-
// checkout § 15.2: the 10 s for the meals starts at the first poll that finds a titled meal card; before it, B waits
// for the page's cards at most 30 s (NO_CARDS polls): in 2 of 7 live runs the store drew no card within 10 s.
// § 23: PRESS_MS after each press (every Add to Cart and every +) before the next, and after the last before the first
// look for CHECKOUT: one 14-meal run in the Advisor's browser left 11 of 14 meals in the plan at 200 ms. The polls and
// their counts are unchanged.
var POLL_MS = 200, PRESS_MS = 1000, MAX_POLLS = 50, AFTER_CHECKOUT = 150, NO_CARDS = 150;
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
// § 15.2: `polls` counts the 10 s, from the first poll that finds a titled app-product-card (that poll is the first of
// the 50) and on, whatever the page does after; `idle` counts the polls before it, and at NO_CARDS of them (the 150th,
// 29.8 s after the first, as the wait after CHECKOUT counts) B stops, `no meal cards on this page`, pressing nothing.
// The § 10 check runs on every poll of both. The screen's logo is tried on each (brand, above: never a stop).
function fillB(p) {
var polls = 0, idle = 0;
guard(function poll() {
  ui(brand);
  if (control(HELD, 1)) fail("the plan already holds meals");
  var missing = p.items.filter(function (it) { return !addButton(card(it.key)); });
  if (!missing.length) return press(steps(p.items), 0);
  if (!polls && !first(w.document, "app-product-card .product__content-title", text)) { if (++idle >= NO_CARDS) fail("no meal cards on this page"); }
  else if (++polls >= MAX_POLLS) fail("not on this page: " + missing.map(function (it) { return it.key; }));
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
ui(function () { added(meal, c, k + 1, list.length); });
w.setTimeout(guard(function () { press(list, k + 1); }), PRESS_MS);
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
var f = loc.hash.slice(7).split("!"), p = payload(f.shift()), m = /[?&]mpid=([1-9]\d{0,8})(&|$)/.exec(loc.search) || fail("no mpid on this page");
p.mpid = +m[1];
var need = COUNTS[p.mpid] || fail("unknown mpid " + p.mpid);
if (p.total !== need) fail("the plan needs " + need + " meals; the link has " + p.total);
log("fill " + FILL + ", mpid " + p.mpid + (p.code ? "; offer code not applied" : ""));
// SPEC-rung2-progress-and-checkout § 1, § 2 item 1: the screen, now that the link and the plan's count have passed
// their checks, and before fill B's first poll. A link refused above shows nothing new.
CODE = p.code;
if (f.length) ui(function () { photos(f, p.items); });
ui(screen);
// The two-fill source's dispatch, kept because it ships (SPEC-rung2 § 12 item 3): FILL is "B", so the line after it
// never runs.
if (FILL === "B") return fillB(p);
fail("fill " + FILL + " is not in this text");
})();
})();
