// Shared by the p*-*.test.mjs, w*-*.test.mjs and r2-*.test.mjs files. Not a test file itself.
// A SYNTHETIC store for the browser checks, served on 127.0.0.1: a single-page app written for these tests (none of
// the store's code) with the shapes the hand-off and the smoke read, as SPEC-rung2 § 8 describes the real page:
//   /order?mpid=21   meal cards (app-product-card, .product__content-title, .product__actions > button
//                    "Add to Cart $12.50"; at 666 px and narrower app-product-card hides and app-product-card-mobile
//                    shows), a cart bar (below 1025 px, " CHECKOUT ") and a sidebar (1025 px and wider,
//                    " CHECKOUT NOW "), each disabled with "Add N more meals" until the plan is full; optionally the
//                    extras dialog (" CONTINUE TO CHECKOUT "), or a "Sign in to continue" dialog that never routes (as
//                    the store's for a visitor not signed in, SPEC-rung2 § 8's build note). Checkout routes in the app
//                    (pushState) to /checkout. The pending list is mirrored to localStorage (hmp_pending_plan_items,
//                    { "21": [names] }), so a reader of its count has something to count.
//   /checkout        the checkout component, `app-checkout`, with the names SPEC-rung2-progress-and-checkout § 3 lists
//                    (the store's own class and element names, as the contracts quote them; none of its code or
//                    markup): the form (.checkout__form: the guest sign-in banner, the contact section's "Sign in",
//                    contact, delivery, schedule, tip, discount and payment fields, an iframe standing in for the card
//                    field, the pay button in .checkout__submit) and the summary (.checkout__summary: each meal's name,
//                    the subscription offer or commitment, "Plan Total (N items)" beside its total, "Subtotal | N
//                    items", and its mobile bar). As the store's (SPEC-rung2-progress-and-checkout § 9, the first live
//                    smoke): at 1024 px and narrower .checkout__submit is not displayed and the summary's mobile bar
//                    is, with its own pay button, " PAY NOW " in .summary__pay-button. Either pay button logs
//                    "[fixture] ORDER PLACED" if anything presses it.
// Around both, the app's shell: the sticky header, the footer, the platform's credit line and the pop-up host (H1, H2,
// H5), links and text only (no button, so the smoke's evidence of the order page is what it was).
// § 10 (the Advisor's first look), with the store's names read from its public code: the discounts in their three
// placements (.checkout-discounts: the payment section's, its own section, the summary's), each with a gift-card and a
// discount-code field and their Apply buttons; the summary's price rows (.summary__row: Subtotal, Shipping, Tax, and on
// request a discount row, .summary__row--discount) and its Total (.summary__total); the tip (section.checkout__section.tip
// holding app-tip-selector, or a bare app-tip-selector), whose .tip-selector__remove-btn shows once a tip is chosen;
// on request the app banner (.smartbanner, prepended to <body>, with the top margin its library reserves on <html>);
// and the extras dialog as the store's overlays are (a manual popover holding .cdk-overlay-backdrop and
// .cdk-overlay-pane > app-extra-products-dialog).
// Like the store, the app injects its Footer text at run time as a re-created <script> (the store's injectSlot).
// Images are GENERATED (a flat SVG rectangle), never a photograph, served here; nothing is fetched from anywhere else.
import { createServer } from "node:http";

export const MEALS = ["Birria de Res Bowl", "Chicken Pesto Pasta", "Jalapeño Lime Chicken", "Turkey Chili", "Salmon Rice Bowl",
  "Beef Bulgogi", "Chicken Tikka", "Shrimp Tacos", "Veggie Curry"];
export const PRICE_CENTS = 1250;
/** A generated image: a flat rectangle in the page's --lean blue. Not a photograph. */
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#48aeee"/></svg>';
/** How long the server holds a "pending" image before answering: longer than any run that reads it. */
const PENDING_MS = 20_000;

/**
 * The subscription part of the summary's plan group, by state (SPEC-rung2-progress-and-checkout § 3, H6):
 *   off     the offer: "Subscribe & save", the switch (role=switch, off: "Switch to subscription"), and the guest's
 *           sign-in prompt behind it;
 *   active  the switch on ("Switch to one-time order"), the renewal line, the delivery frequency and the note;
 *   forced  a plan that requires one: "Subscription required", NO switch (the store's own template has none then),
 *           the renewal line, the frequency and the note;
 *   none    a plan with no subscription option: nothing.
 */
function subscriptionParts(state) {
  const renew = '<div class="summary__plan-group-renew">Subscription — renews every 7 days until canceled.</div>';
  const frequency = '<div class="summary__cart-frequency"><label for="freq">Subscription delivery — every</label>' +
    '<select id="freq" name="frequency"><option>7 days</option><option>14 days</option></select></div>';
  const note = '<div class="summary__subscription-note">Your subscription renews automatically.</div>';
  const toggle = (on) =>
    `<button type="button" role="switch" class="summary__subscription-toggle${on ? " summary__subscription-toggle--active" : ""}" ` +
    `aria-checked="${on}" aria-label="${on ? "Switch to one-time order" : "Switch to subscription"}"><span></span></button>`;
  const controls = (label, inner) =>
    `<div class="summary__plan-subscription-controls"><div class="summary__plan-subscription-row">` +
    `<span class="summary__plan-subscription-label">${label}</span>${inner}</div>`;
  if (state === "none") return { head: "", controls: "", tail: "" };
  if (state === "off") {
    return {
      head: "",
      controls: controls("Subscribe &amp; save", toggle(false)) +
        '<div class="summary__plan-auth-prompt"><p>Create an account or sign in to turn on subscriptions</p>' +
        '<a class="summary__plan-auth-prompt-link" href="/login?returnUrl=%2Fcheckout">Sign in</a></div></div>',
      tail: "",
    };
  }
  if (state === "active") return { head: renew, controls: `${controls("Subscribe &amp; save", toggle(true))}</div>`, tail: frequency + note };
  if (state === "forced") return { head: renew, controls: `${controls("Subscription required", "")}</div>`, tail: frequency + note };
  throw new Error(`subscription: ${state}`);
}

/** One placement of the discounts (§ 10, H7): a gift-card field and a discount-code field, each with its Apply. */
const discounts = (where) =>
  `<input name="giftCard-${where}" aria-label="Gift card"><button type="button" class="discount__apply">Apply</button>` +
  `<input name="coupon-${where}" aria-label="Discount code"><button type="button" class="discount__apply">Apply</button>`;

/** The tip (§ 10, H10): in its section, or a bare app-tip-selector; with its remove button once a tip is chosen. */
function tipHtml(cfg) {
  const selector = '<app-tip-selector><div class="tip-selector"><button type="button" class="tip__option">10%</button>' +
    '<button type="button" class="tip__option">15%</button><input name="tip" aria-label="Custom tip">' +
    `${cfg.tipChosen ? '<button type="button" class="tip-selector__remove-btn">Remove tip</button>' : ""}</div></app-tip-selector>`;
  if (cfg.tip === "none") return "";
  if (cfg.tip === "bare") return selector;
  return `<section class="checkout__section tip"><h2>Tip Our Team</h2>${selector}</section>`;
}

/** The checkout component's skeleton; the page's script fills .summary__items and the totals. */
function checkoutHtml(cfg) {
  const sub = subscriptionParts(cfg.subscription);
  return `<app-checkout><div class="checkout">
<form class="checkout__form" onsubmit="return false">
<a class="checkout__guest-signin-banner" href="/login?returnUrl=%2Fcheckout">Already have an account? Sign in for faster checkout</a>
<section class="contact"><h2>Contact</h2>${cfg.missing.includes("contact-sign-in") ? "" : '<a class="contact__sign-in" href="/login?returnUrl=%2Fcheckout">Sign in</a>'}
<input type="email" name="email" aria-label="Email"><input type="tel" name="phone" aria-label="Phone">
<input name="firstName" aria-label="First name"><input name="lastName" aria-label="Last name"><input type="hidden" name="token" value="synthetic"></section>
<section class="delivery"><h2>Delivery</h2><div role="radiogroup" aria-label="Order type"><div role="radio" aria-checked="true" tabindex="0">Delivery</div><div role="radio" aria-checked="false" tabindex="-1">Pickup</div></div>
<input name="address" aria-label="Address"><select name="state" aria-label="State"><option>MA</option></select></section>
<section class="schedule"><h2>Schedule</h2><select name="date" aria-label="Delivery date"><option>Sunday</option><option>Wednesday</option></select></section>
${tipHtml(cfg)}
<section class="checkout__section checkout-discounts checkout-discounts--mobile">${discounts("section")}</section>
<section class="payment"><h2>Payment</h2><iframe title="Card number (synthetic)" srcdoc="card field (synthetic)"></iframe>
<div class="payment__discounts checkout-discounts checkout-discounts--mobile">${discounts("payment")}</div></section>
<textarea name="specialRequests" aria-label="Special requests"></textarea>
<label class="checkout__consent"><input type="checkbox" name="agreeToTerms"> I agree to the <a href="/refund-and-return-policy">refund and return policy</a></label>
<div class="checkout__submit"><span class="checkout__submit-target"><button type="button" class="checkout__pay"> Place order </button></span></div>
</form>
<aside class="checkout__summary"><div class="summary">
<div class="summary__plan-group"><div class="summary__plan-group-label">Lean 7</div>${sub.head}${sub.controls}
<a class="summary__plan-return" href="/order?mpid=21">Edit plan</a><div class="summary__items"></div></div>
${sub.tail}<div class="summary__discounts"><div class="checkout-discounts">${discounts("summary")}</div></div>
<div class="summary__row"><span>Subtotal</span><span>$87.50</span></div>
<div class="summary__row"><span>Shipping</span><span>$0.00</span></div>
<div class="summary__row"><span>Tax</span><span>$0.00</span></div>
${cfg.discountRow ? '<div class="summary__row summary__row--discount"><span>Discount (OFFER)</span><span>-$5.00</span></div>' : ""}
<div class="summary__total"><span class="summary__total-label">Total</span><span class="summary__total-value">$87.50</span></div>
<div class="summary__totals"></div>
<div class="summary__mobile-bar"><div class="summary__bar-row"><span class="summary__stat">Order total</span>
<app-button class="summary__pay-button"><button type="button" class="checkout__pay-mobile"> PAY NOW </button></app-button></div></div>
</div></aside>
</div></app-checkout>`;
}

/** The app's shell around the router outlet (H1, H2, H5), each part omitted if named in `cfg.missing` (which may also
 * name "contact-sign-in", the checkout's H4). */
function shellParts(cfg) {
  const part = (name, html) => (cfg.missing.includes(name) ? "" : html);
  return {
    before: part("header", '<div class="sticky-header"><a href="/">Synthetic store</a> <a href="/order?mpid=21">Order</a></div>'),
    after: part("footer", '<div class="footer"><p>Synthetic footer</p><a href="/about">About</a></div>') +
      part("credit", '<p class="app-hmp-credit">Synthetic credit line</p>') +
      part("popup", '<app-storefront-popup-host><p class="popup">A synthetic pop-up</p></app-storefront-popup-host>'),
  };
}

/**
 * `cfg` is read by the app: footer (text or null), soldOut (names), extrasDialog, signIn (CHECKOUT opens a sign-in
 * dialog and never routes), consoleNoise (lines the page logs at start, as a store's own code does), dropOnCheckout
 * (a name), totalDeltaCents; and for rung 2's two faces: subscription ("off", "active", "forced" or "none"; see
 * subscriptionParts), missing (parts to leave out: "header", "footer", "credit", "popup" of the shell, and
 * "contact-sign-in" of the checkout), photos ({ name:
 * "loaded" | "none" | "pending" }: the card's img loaded, with no src yet, or still loading), routeDelayMs (the store
 * takes this long to route after CHECKOUT), hangAfter (after this many meals are added, the page's setTimeout runs
 * nothing any more: a hang planted under fill B), topLayerPopup (at load, a pop-up shown in the browser's top layer,
 * as the store's own overlays are: a manual popover). § 10: tip ("section", the default; "bare"; "none"), tipChosen,
 * discountRow, banner (the app banner and its reserved margin), extrasOpenMs (the store fetching its extras before it
 * opens the dialog), continueDelayMs (its CONTINUE disabled that long), continueNever (disabled for good).
 */
function appHtml(cfg) {
  const shell = shellParts(cfg);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Synthetic store</title>
<style>
  app-product-card, app-product-card-mobile, .bar, .side, app-checkout, app-storefront-popup-host { display: block; }
  app-product-card-mobile { display: none; }
  .side { display: none; }
  @media (max-width: 666px) { app-product-card { display: none; } app-product-card-mobile { display: block; } }
  @media (min-width: 1025px) { .bar { display: none; } .side { display: block; } }
  dialog-box { display: block; }
  .product__header-image img { width: 160px; height: 100px; }
  app-button { display: inline-block; }
  .cdk-overlay-popover { inset: 0; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; background: none; overflow: visible; pointer-events: none; }
  .cdk-overlay-backdrop { position: absolute; inset: 0; background: rgba(0, 0, 0, .32); pointer-events: auto; }
  .cdk-overlay-pane { position: absolute; left: 24px; top: 120px; width: 300px; background: #fff; pointer-events: auto; }
  app-extra-products-dialog { display: block; padding: 16px; }
  .smartbanner { display: block; position: absolute; top: 0; left: 0; right: 0; height: 80px; background: #eee; }
  .summary__mobile-bar { display: none; }
  @media (max-width: 1024px) {
    .checkout__submit { display: none; }
    .summary__mobile-bar { display: flex; position: fixed; left: 0; right: 0; bottom: 0; background: #fff; }
  }
</style></head>
<body><app-root>${shell.before}<main class="outlet"></main>${shell.after}</app-root>
<script type="application/json" id="cfg">${JSON.stringify(cfg).replace(/</g, "\\u003c")}</script>
<script type="application/json" id="checkout-html">${JSON.stringify(checkoutHtml(cfg)).replace(/</g, "\\u003c")}</script>
<script>
(function () {
  var cfg = JSON.parse(document.getElementById("cfg").textContent);
  var root = document.querySelector("main.outlet");
  var pending = [];
  function money(c) { return "$" + (c / 100).toFixed(2); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function checkoutButtons() { return [].slice.call(document.querySelectorAll(".checkout-control")); }
  function renderBar() {
    checkoutButtons().forEach(function (b) {
      var left = ${7} - pending.length;
      b.disabled = left > 0;
      b.textContent = left > 0 ? " Add " + left + " more meals " : b.getAttribute("data-label");
      // As the real store (SPEC-rung2 § 10's build note): no checkout control is displayed while the plan is empty.
      b.style.display = pending.length ? "" : "none";
    });
  }
  function goCheckout() { history.pushState({}, "", "/checkout"); renderCheckout(); }
  function route() { if (cfg.routeDelayMs) setTimeout(goCheckout, cfg.routeDelayMs); else goCheckout(); }
  function signIn() {
    var d = el("dialog-box", "sign-in");
    d.setAttribute("role", "dialog");
    d.appendChild(el("p", null, "Sign in to continue"));
    d.appendChild(el("button", null, "Sign in / Create account"));
    d.appendChild(el("button", null, "Continue browsing"));
    document.body.appendChild(d);
  }
  function onCheckout() {
    if (cfg.signIn) return signIn();
    if (!cfg.extrasDialog) return route();
    // As the store's overlays (§ 10): a manual popover in the top layer, its backdrop, its pane, the dialog.
    setTimeout(function () {
      var host = el("div", "cdk-overlay-popover");
      host.setAttribute("popover", "manual");
      var pane = el("div", "cdk-overlay-pane");
      var d = el("app-extra-products-dialog", "extras");
      d.setAttribute("role", "dialog");
      d.appendChild(el("p", null, "Add a drink? (synthetic)"));
      var b = el("button", null, " CONTINUE TO CHECKOUT ");
      b.disabled = Boolean(cfg.continueDelayMs || cfg.continueNever);
      if (cfg.continueDelayMs && !cfg.continueNever) setTimeout(function () { b.disabled = false; }, cfg.continueDelayMs);
      b.onclick = function () { host.remove(); route(); };
      d.appendChild(b); pane.appendChild(d);
      host.appendChild(el("div", "cdk-overlay-backdrop")); host.appendChild(pane);
      document.body.appendChild(host);
      host.showPopover();
    }, cfg.extrasOpenMs || 0);
  }
  function photo(name, i) {
    var how = (cfg.photos || {})[name];
    if (!how) return null;
    var box = el("div", "product__header-image"), img = el("img");
    img.alt = "";
    if (how === "loaded") img.src = "/img/meal-" + i + ".svg";
    if (how === "pending") img.src = "/img/pending-" + i + ".svg";
    box.appendChild(img);
    return box;
  }
  function renderOrder() {
    root.innerHTML = "";
    ${JSON.stringify(MEALS)}.forEach(function (name, i) {
      var card = el("app-product-card");
      var pic = photo(name, i);
      if (pic) card.appendChild(pic);
      card.appendChild(el("h2", "product__content-title", " " + name + " "));
      var actions = el("div", "product__actions");
      var b = el("button");
      b.type = "button";
      b.appendChild(el("span", "product__actions-add_label", "Add to Cart"));
      b.appendChild(el("span", "product__actions-add_price", money(${PRICE_CENTS})));
      if (cfg.soldOut.indexOf(name) >= 0) b.disabled = true;
      b.onclick = function () {
        pending.push(name);
        localStorage.setItem("hmp_pending_plan_items", JSON.stringify({ "21": pending }));
        renderBar();
        // The planted hang: from here on the page's timers run nothing, so fill B's next poll never comes.
        if (cfg.hangAfter && pending.length >= cfg.hangAfter) window.setTimeout = function () { return 0; };
      };
      actions.appendChild(b); card.appendChild(actions); root.appendChild(card);
      var mobile = el("app-product-card-mobile");
      mobile.appendChild(el("h2", "product-card-mobile__title", name)); // the real store's mobile title class
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
    root.innerHTML = JSON.parse(document.getElementById("checkout-html").textContent);
    var summary = root.querySelector(".checkout__summary");
    var items = root.querySelector(".summary__items");
    var totals = root.querySelector(".summary__totals");
    var names = pending.filter(function (n, i) { return n !== cfg.dropOnCheckout && pending.indexOf(n) === i; });
    var n = pending.length;
    var total = n * ${PRICE_CENTS} + cfg.totalDeltaCents;
    if (!n) items.appendChild(el("p", null, "Your cart is empty"));
    names.forEach(function (name) { var row = el("div", "item"); row.appendChild(el("span", null, " " + name + " ")); row.appendChild(el("span", null, money(${PRICE_CENTS}))); items.appendChild(row); });
    var plan = el("div", "plan-total");
    plan.appendChild(el("span", null, "Plan Total (" + n + " items)"));
    var amount = el("span"); amount.appendChild(el("span", null, money(total))); plan.appendChild(amount);
    totals.appendChild(plan);
    var sub = el("div", "subtotal");
    sub.appendChild(el("span", null, "Subtotal | " + n + " items")); sub.appendChild(el("span", null, money(total)));
    totals.appendChild(sub);
    root.querySelector(".checkout__pay").onclick = function () { console.log("[fixture] ORDER PLACED"); };
    root.querySelector(".checkout__pay-mobile").onclick = function () { console.log("[fixture] ORDER PLACED"); };
    // "Edit plan" routes back to the order page inside the app, as the store's own link does: the checkout component
    // leaves the page (SPEC-rung2-progress-and-checkout § 3 item 2, R2-47).
    root.querySelector(".summary__plan-return").onclick = function (e) {
      e.preventDefault();
      history.pushState({}, "", "/order?mpid=21");
      renderOrder();
    };
    return summary;
  }
  (cfg.consoleNoise || []).forEach(function (line) { console.log(line); });
  if (cfg.banner) {
    // As the app-install banner's library does: prepended to <body>, and <html>'s top margin set to its height, the
    // original kept in an attribute.
    var banner = el("div", "smartbanner smartbanner--android js_smartbanner");
    var exit = el("a", "smartbanner__exit js_smartbanner__exit"); exit.href = "#"; exit.title = "Close";
    var view = el("a", "smartbanner__button", "View"); view.href = "/app";
    banner.appendChild(exit); banner.appendChild(el("span", "smartbanner__info__title", "Synthetic app")); banner.appendChild(view);
    document.body.prepend(banner);
    document.documentElement.setAttribute("data-smartbanner-original-margin-top", "0");
    document.documentElement.style.marginTop = "80px";
  }
  if (cfg.topLayerPopup) {
    var pop = el("div", "top-layer-popup", "A synthetic pop-up, in the top layer");
    pop.setAttribute("popover", "manual");
    pop.style.cssText = "inset:auto;left:20px;top:20px;width:300px;height:200px;margin:0";
    document.body.appendChild(pop);
    pop.showPopover();
  }
  if (location.pathname === "/checkout") { renderCheckout(); return; }
  setTimeout(function () {
    if (cfg.footer !== null) { var s = document.createElement("script"); s.text = cfg.footer; document.body.appendChild(s); }
  }, 150);
  setTimeout(renderOrder, 400);
})();
</script></body></html>
`;
}

const DEFAULTS = {
  footer: null,
  soldOut: [],
  extrasDialog: false,
  signIn: false,
  consoleNoise: [],
  dropOnCheckout: null,
  totalDeltaCents: 0,
  subscription: "off",
  missing: [],
  photos: {},
  routeDelayMs: 0,
  hangAfter: 0,
  topLayerPopup: false,
  tip: "section",
  tipChosen: false,
  discountRow: false,
  banner: false,
  extrasOpenMs: 0,
  continueDelayMs: 0,
  continueNever: false,
};

/** Start the store on an ephemeral port. `store.set(cfg)` changes what the next page load gets. */
export async function startStore() {
  let cfg = { ...DEFAULTS };
  const requests = [];
  const held = new Set();
  const server = createServer((req, res) => {
    requests.push(req.url);
    const path = new URL(req.url, "http://127.0.0.1").pathname;
    if (path === "/order" || path === "/checkout") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(appHtml(cfg));
    } else if (/^\/img\/meal-\d+\.svg$/.test(path)) {
      // no-store: a second request for it would reach the server, so a count of one proves the page reused its image.
      res.writeHead(200, { "content-type": "image/svg+xml", "cache-control": "no-store" });
      res.end(SVG);
    } else if (/^\/img\/pending-\d+\.svg$/.test(path)) {
      const timer = setTimeout(() => {
        held.delete(timer);
        res.writeHead(200, { "content-type": "image/svg+xml", "cache-control": "no-store" });
        res.end(SVG);
      }, PENDING_MS);
      held.add(timer);
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
    /** How many times `path` was requested. */
    hits: (path) => requests.filter((url) => new URL(url, "http://127.0.0.1").pathname === path).length,
    set(next) {
      cfg = { ...DEFAULTS, ...next };
    },
    close: () =>
      new Promise((resolve) => {
        for (const timer of held) clearTimeout(timer);
        held.clear();
        server.closeAllConnections();
        server.close(resolve);
      }),
  };
}
