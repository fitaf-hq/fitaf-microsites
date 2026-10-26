---
warning: "EMERGENCY ONLY: deep carting, no visual changes, no zero code. Paste only on the Advisor's word if checkout breaks. To return, paste 2026-10-25-fitaf-handoff-c31603d.md."
type: storefront-footer-block
title: "Fit AF cart hand-off: the EMERGENCY Footer block (deep carting only) built from 1460823"
as_of: 2026-10-26
target: "the store's admin, Custom Scripts, Footer (pasted by the Advisor; never by an agent), ONLY if checkout breaks"
status: not pasted
clearance: public
built_from:
  repository: fitaf-microsites
  commit: 14608238899c93a7d1d91e8683a4c0d1fd14b37b
  source: boston-2026-10/src/storefront/fitaf-handoff.js (byte-identical to c31603d's)
  command: npm --prefix boston-2026-10 run build:storefront -- --plain
  output: boston-2026-10/dist-storefront/plain/fitaf-handoff.html
version_line: "fitaf-handoff 1460823-plain sha256:9ffbd249b2e2ee9002a065d3a1a37c43925fab7bc2a1ba5010e25e51fd39badc"
text_sha256: 9ffbd249b2e2ee9002a065d3a1a37c43925fab7bc2a1ba5010e25e51fd39badc
fragment_sha256: d583f8da33993bafc608c037835cbb77588763e6df17fc2a7df036273e623421
fragment_bytes: 7892
ceiling_bytes: 20480
replaces_if_pasted:
  version_line: "fitaf-handoff c31603d sha256:3efc8112909216d69c23254d1ebc81b06a0b378fb8b36ec1a4fab4ae7e2565fd"
returns_to: "2026-10-25-fitaf-handoff-c31603d.md (paste it whole to return)"
contract: "boston-2026-10/SPEC-rung2-progress-and-checkout.md § 34"
proof: "the cases E1-E3 and their two mutants in the watch package's stand-in (tools/storefront-watch/test/e34-plain.test.mjs); the live-store rehearsal (§ 34 item 6) is the orchestrator's, not yet recorded here"
---

# EMERGENCY ONLY: the Footer block with deep carting alone, built from `1460823`

**EMERGENCY ONLY: deep carting, no visual changes, no zero code. Paste only on the Advisor's word if checkout breaks.
To return, paste `2026-10-25-fitaf-handoff-c31603d.md`.**

The live block's own code (`c31603d`) with only the deep carting kept (`SPEC-rung2-progress-and-checkout.md` § 34): it
reads the link, fills the store's cart with the link's meals and counts (every answer set, Family, snacks, every menu,
as the live block does), presses the store's own CHECKOUT (and the extras dialog's CONTINUE TO CHECKOUT if the store
opens it), and stops there, on the store's own checkout. **Left out**: the progress screen and its animation, every
style the block adds (the checkout's hidden rows, discounts, tip, header and footer; the three steps), the logo and the
photographs, and the code `zero` (never typed, never pressed; the console says `zero: off`). The visitor sees the
store's own pages, unchanged, while the cart fills. Its version line says `-plain`.

**To paste** (only on the Advisor's word): copy everything between the two fence lines below, and nothing else (the
fences are not part of it), into the store's admin, Custom Scripts, Footer, replacing the block there. The copied text
is 7892 bytes with SHA-256 `d583f8da33993bafc608c037835cbb77588763e6df17fc2a7df036273e623421`.

**To return**: paste the fragment of `2026-10-25-fitaf-handoff-c31603d.md` the same way.

````html
<script>
/* fitaf-handoff 1460823-plain sha256:9ffbd249b2e2ee9002a065d3a1a37c43925fab7bc2a1ba5010e25e51fd39badc */
/* Fit AF cart hand-off. Source, comments and tests: fitaf-microsites, boston-2026-10/src/storefront.
   Kill switch: delete this block (never "Inject these scripts": that stops every vendor's). */
(function () {
"use strict";
var FILL = "C";
var w = window, loc = w.location;
if (loc.hash.slice(0, 7) !== "#fitaf=") return;
if (w.__fitafHandoff) return;
w.__fitafHandoff = true;
var COUNTS = /* data/plans.json, read_on 2026-10-25 */ {"20":[4,5],"21":[7],"22":[10],"23":[14,15],"24":[21],"25":[4,5],"26":[7],"27":[10],"28":[21],"29":[14,15],"30":[4,5],"31":[7],"32":[10],"33":[14,15],"34":[21],"35":[5,10]};

function log(m) { w.console.info("[fitaf-handoff] " + m); }
function fail(m) { throw new Error(m); }
function drop() { w.history.replaceState(w.history.state, "", loc.pathname + loc.search); }
function guard(fn) {
return function () {
  try { fn(); } catch (e) {
    try { drop(); } catch (e3) {}
    end("stopped: " + e.message);
  }
};
}

var CODE, F;
function ui(f) { try { f(); } catch (e) {} }
function end(m) { log(m); }
function screen() {}
function brand() {}
function added() {}
function last() {}
var N, V;
function mark() {}


function photos() {}

function payload(s) {
if (s.length > 2048) fail("payload over 2 KB");
var parts = s.split("."), items = [], keys = [], total = 0, units = 0, code;
if (parts.shift() !== "2") fail("unknown version");
if (/^~/.test(parts[parts.length - 1])) code = parts.pop().slice(1);
if (code !== undefined && !/^[A-Za-z0-9-]{1,40}$/.test(code)) fail("bad code");
if (!parts.length) fail("no items");
parts.forEach(function (part) {
  var m = /^(_?)([0-9a-z]{5})(?:\*([2-9]|1\d|2[01]))?$/.exec(part) || fail("bad meal: " + part), n = +(m[3] || 1);
  if (keys.indexOf(m[2]) >= 0) fail("named twice: " + m[2]);
  if (units > total && !m[1]) fail("a meal after a snack: " + m[2]);
  keys.push(m[2]);
  items.push({ key: m[2], qty: n, s: m[1] });
  units += n;
  if (!m[1]) total += n;
});
return { items: items, total: total, units: units, code: code };
}

var POLL_MS = 200, MIN_GAP_MS = 300, ACK_MS = 5000, RETRIES = 2, SETTLE_MS = 1000, MAX_POLLS = 50, AFTER_CHECKOUT = 150, NO_CARDS = 150;
var key = function mealKey(name) {
  var s = unescape(encodeURIComponent(String(name).replace(/^\s*([\ud800-\udbff][\udc00-\udfff]|[\u2600-\u27bf])\s*[A-Z]{2,12}\s*:\s/, "").replace(/\s+/g, " ").trim())), h = 0x811c9dc5;
  for (var i = 0; s.length > i; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ("0000" + (h >>> 0).toString(36)).slice(-5);
};
function text(el) { return el.textContent.replace(/\s+/g, " ").trim(); }
function first(el, sel, ok) { return [].filter.call(el.querySelectorAll(sel), ok)[0]; }
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
function count(c) { var v = c && c.querySelector(".product__actions .counter__value"); return v ? +text(v) || 0 : 0; }
function plus(c) { return c && c.querySelector('.product__actions .counter__button[aria-label="Increase value"]'); }
function plan() {
var e = first(w.document, ".cart__items-count,.mobile-cart-summary__stat-value", function (e) { return e.getClientRects().length && /^\d+( items?)?$/.test(text(e)); });
return e ? [parseInt(text(e), 10), /items-c/.test(e.className)] : [0];
}
function said(p) {
var k = 0, s = [], o = [];
p.items.forEach(function (it) { var n = count(card(it.key)); k += n; if (it.qty > n) s.push(it.key); if (n > it.qty) o.push(it.key); });
return "the store counted " + k + " of " + p.units + (s.length ? "; short: " + s : "") + (o.length ? "; over: " + o : "");
}
var HELD = /checkout|more meal|limit exceeded/i;
function fillC(p) {
var polls = 0, idle = 0;
guard(function poll() {
  ui(brand);
  if (control(HELD, 1)) fail("the plan already holds meals");
  var missing = p.items.filter(function (it) { var c = card(it.key); return !(addButton(c) || it.s && c && c.querySelector(".product__toggle")); });
  if (!missing.length) return fill(p, steps(p.items), settle);
  if (!polls && !first(w.document, "app-product-card .product__content-title", text)) { if (++idle >= NO_CARDS) fail("no meal cards on this page"); }
  else if (++polls >= MAX_POLLS) fail("not on this page: " + missing.map(function (it) { return it.key; }));
  w.setTimeout(guard(poll), POLL_MS);
})();
}
function steps(items) {
var list = [];
items.forEach(function (it) { if (!it.s) list.push([it.key, 0, it.qty]); });
items.forEach(function (it) { for (var n = it.s ? 0 : 1; it.qty > n; n++) list.push([it.key, n, it.qty]); });
return list;
}
function fill(p, list, then) {
var k = 0, tries = 0, waited = 0, x = 0;
guard(function poll() {
  var s = said(p), c, n, b, o;
  if (/; over:/.test(s)) fail(s);
  if (k === list.length) return then(p);
  c = card(list[k][0]); n = count(c);
  if (n > list[k][1]) { k++; tries = x = 0; return poll(); }
  if (tries && ACK_MS > waited) { waited += POLL_MS; return w.setTimeout(guard(poll), POLL_MS); }
  if (tries > RETRIES) fail(s);
  b = addButton(c) || plus(c);
  if (!b && c && (o = c.querySelector(".product__toggle"))) {
    if (!x && o.getAttribute("aria-expanded") != "true") { o.click(); x = MIN_GAP_MS; return w.setTimeout(guard(poll), MIN_GAP_MS); }
    if (ACK_MS > x) { x += POLL_MS; return w.setTimeout(guard(poll), POLL_MS); }
  }
  (b || fail(s + "; no control")).click();
  F = 1; tries++; waited = MIN_GAP_MS;
  ui(function () { added(list[k][0], c, p.units - list.length + k + 1, p.units); });
  w.setTimeout(guard(poll), MIN_GAP_MS);
})();
}
function settle(p) {
w.setTimeout(guard(function () {
  var list = [];
  p.items.forEach(function (it) { for (var n = count(card(it.key)); it.qty > n; n++) list.push([it.key, n, it.qty]); });
  fill(p, list, checkout);
}), SETTLE_MS);
}
function control(re, any) {
return first(w.document, "button", function (b) {
  return (any || !b.disabled) && re.test(text(b)) && b.getClientRects().length && !b.closest("app-product-card,app-product-card-mobile");
});
}
function checkout(p) {
var k = 0, polls = 0;
guard(function poll() {
  if (k && loc.pathname === "/checkout") { ui(mark); return zero(function (m) { log("zero: " + m); end("done: /checkout"); }); }
  var b = control([/^checkout( now)?$/i, /^continue to checkout$/i, /(?!)/][k]), n = plan();
  if (b && (k || n[0] === (n[1] ? p.units : p.total))) { if (!k) { drop(); ui(function () { w.sessionStorage.setItem("ecc_additions_prompt_handled", "true"); }); F = 0; } b.click(); if (!k) ui(last); k++; polls = 0; }
  else if (++polls >= (k ? AFTER_CHECKOUT : MAX_POLLS)) return k ? end("stopped: /checkout not reached") : fail(said(p) + "; the plan shows " + n[0] + (b ? "" : "; no checkout control"));
  w.setTimeout(guard(poll), POLL_MS);
})();
}

function zero(then) { then("off"); }

guard(function () {
if (loc.pathname !== "/order") fail("not the order page");
var f = loc.hash.slice(7).split("!"), p = payload(f.shift()), m = /[?&]mpid=([1-9]\d{0,8})(&|$)/.exec(loc.search) || fail("no mpid on this page");
p.mpid = +m[1];
var need = COUNTS[p.mpid] || fail("unknown mpid " + p.mpid);
if (need.indexOf(p.total) === -1) fail("the plan " + (need[1] ? "takes " : "needs ") + need.join(" or ") + " meals; the link has " + p.total);
log("fill " + FILL + ", mpid " + p.mpid + (p.code ? "; offer code not applied" : ""));
CODE = p.code;
N = p.total;
V = p.units - p.total;
if (f.length) ui(function () { photos(f, p.items); });
ui(screen);
if (FILL === "C") return fillC(p);
fail("fill " + FILL + " is not in this text");
})();
})();
</script>
````
