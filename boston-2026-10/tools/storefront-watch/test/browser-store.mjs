// Shared by the p*-*.test.mjs files. Not a test file itself.
// A SYNTHETIC store for the browser checks, served on 127.0.0.1: a single-page app written for these tests (none of
// the store's code) with the shapes the hand-off and the smoke read, as SPEC-rung2 § 8 describes the real page:
//   /order?mpid=21   meal cards (app-product-card, .product__content-title, .product__actions > button
//                    "Add to Cart $12.50"; at 666 px and narrower app-product-card hides and app-product-card-mobile
//                    shows), a cart bar (below 1025 px, " CHECKOUT ") and a sidebar (1025 px and wider,
//                    " CHECKOUT NOW "), each disabled with "Add N more meals" until the plan is full; optionally the
//                    extras dialog (" CONTINUE TO CHECKOUT "). Checkout routes in the app (pushState) to /checkout.
//   /checkout        the summary: each meal's name, "Plan Total (N items)" beside its total, "Subtotal | N items",
//                    and a PLACE ORDER button that logs "[fixture] ORDER PLACED" if anything presses it.
// Like the store, the app injects its Footer text at run time as a re-created <script> (the store's injectSlot).
import { createServer } from "node:http";

export const MEALS = ["Birria de Res Bowl", "Chicken Pesto Pasta", "Jalapeño Lime Chicken", "Turkey Chili", "Salmon Rice Bowl",
  "Beef Bulgogi", "Chicken Tikka", "Shrimp Tacos", "Veggie Curry"];
export const PRICE_CENTS = 1250;

/** `cfg` is read by the app: footer (text or null), soldOut (names), extrasDialog, dropOnCheckout (a name), totalDeltaCents. */
function appHtml(cfg) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Synthetic store</title>
<style>
  app-product-card, app-product-card-mobile, .bar, .side { display: block; }
  app-product-card-mobile { display: none; }
  .side { display: none; }
  @media (max-width: 666px) { app-product-card { display: none; } app-product-card-mobile { display: block; } }
  @media (min-width: 1025px) { .bar { display: none; } .side { display: block; } }
  dialog-box { display: block; }
</style></head>
<body><app-root></app-root>
<script type="application/json" id="cfg">${JSON.stringify(cfg).replace(/</g, "\\u003c")}</script>
<script>
(function () {
  var cfg = JSON.parse(document.getElementById("cfg").textContent);
  var root = document.querySelector("app-root");
  var pending = [];
  function money(c) { return "$" + (c / 100).toFixed(2); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function checkoutButtons() { return [].slice.call(document.querySelectorAll(".checkout-control")); }
  function renderBar() {
    checkoutButtons().forEach(function (b) {
      var left = ${7} - pending.length;
      b.disabled = left > 0;
      b.textContent = left > 0 ? " Add " + left + " more meals " : b.getAttribute("data-label");
    });
  }
  function goCheckout() { history.pushState({}, "", "/checkout"); renderCheckout(); }
  function onCheckout() {
    if (!cfg.extrasDialog) return goCheckout();
    var d = el("dialog-box", "extras");
    var b = el("button", null, " CONTINUE TO CHECKOUT ");
    b.onclick = function () { d.remove(); goCheckout(); };
    d.appendChild(b); document.body.appendChild(d);
  }
  function renderOrder() {
    ${JSON.stringify(MEALS)}.forEach(function (name) {
      var card = el("app-product-card");
      card.appendChild(el("h2", "product__content-title", " " + name + " "));
      var actions = el("div", "product__actions");
      var b = el("button");
      b.type = "button";
      b.appendChild(el("span", "product__actions-add_label", "Add to Cart"));
      b.appendChild(el("span", "product__actions-add_price", money(${PRICE_CENTS})));
      if (cfg.soldOut.indexOf(name) >= 0) b.disabled = true;
      b.onclick = function () { pending.push(name); renderBar(); };
      actions.appendChild(b); card.appendChild(actions); root.appendChild(card);
      var mobile = el("app-product-card-mobile");
      mobile.appendChild(el("h2", "product__content-title", name));
      mobile.appendChild(el("button", null, "+"));
      root.appendChild(mobile);
    });
    [["bar", " CHECKOUT "], ["side", " CHECKOUT NOW "]].forEach(function (p) {
      var box = el("div", p[0]);
      var b = el("button", "checkout-control");
      b.setAttribute("data-label", p[1]);
      b.onclick = function () { console.log("[fixture] pressed" + p[1].trimEnd()); onCheckout(); };
      box.appendChild(b); root.appendChild(box);
    });
    renderBar();
  }
  function renderCheckout() {
    root.innerHTML = "";
    var names = pending.filter(function (n, i) { return n !== cfg.dropOnCheckout && pending.indexOf(n) === i; });
    var n = pending.length;
    var total = n * ${PRICE_CENTS} + cfg.totalDeltaCents;
    var summary = el("div", "checkout__summary");
    names.forEach(function (name) { var row = el("div", "item"); row.appendChild(el("span", null, " " + name + " ")); row.appendChild(el("span", null, money(${PRICE_CENTS}))); summary.appendChild(row); });
    var plan = el("div", "plan-total");
    plan.appendChild(el("span", null, "Plan Total (" + n + " items)"));
    var amount = el("span"); amount.appendChild(el("span", null, money(total))); plan.appendChild(amount);
    summary.appendChild(plan);
    var sub = el("div", "subtotal");
    sub.appendChild(el("span", null, "Subtotal | " + n + " items")); sub.appendChild(el("span", null, money(total)));
    summary.appendChild(sub);
    root.appendChild(summary);
    var place = el("button", null, "PLACE ORDER");
    place.onclick = function () { console.log("[fixture] ORDER PLACED"); };
    root.appendChild(place);
  }
  if (location.pathname === "/checkout") { root.appendChild(el("p", null, "Your cart is empty")); return; }
  setTimeout(function () {
    if (cfg.footer !== null) { var s = document.createElement("script"); s.text = cfg.footer; document.body.appendChild(s); }
  }, 150);
  setTimeout(renderOrder, 400);
})();
</script></body></html>
`;
}

const DEFAULTS = { footer: null, soldOut: [], extrasDialog: false, dropOnCheckout: null, totalDeltaCents: 0 };

/** Start the store on an ephemeral port. `store.set(cfg)` changes what the next page load gets. */
export async function startStore() {
  let cfg = { ...DEFAULTS };
  const requests = [];
  const server = createServer((req, res) => {
    requests.push(req.url);
    const path = new URL(req.url, "http://127.0.0.1").pathname;
    if (path === "/order" || path === "/checkout") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(appHtml(cfg));
    } else {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    origin: `http://127.0.0.1:${port}`,
    requests,
    set(next) {
      cfg = { ...DEFAULTS, ...next };
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
