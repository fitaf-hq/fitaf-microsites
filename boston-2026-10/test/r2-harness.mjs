// Shared by the r2-*.test.mjs files (rung 2, the storefront hand-off, SPEC-rung2 § 6 and § 8). Not a test file itself.
// The hand-off is tested AS IT SHIPS: the built text runs in a fresh V8 context whose only global is a fake
// `window`, so a bare browser global in the script (localStorage, document, fetch, …) fails here.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { parseHTML } from "linkedom";
import { loadJson, PLANS_PATH } from "../build.mjs";
import { countTable, storefrontText } from "../scripts/build-storefront.mjs";
import { encodePayload } from "../scripts/handoff-link.mjs";

export const ORIGIN = "https://fitafnutrition.com";
export const CART_KEY = "hmp_local_cart";
export const POLL_MS = 200;
export const MAX_WAIT_MS = 10_000;
export const LOG_PREFIX = "[fitaf-handoff]";
export const FIXTURE = new URL("./r2-order-page.html", import.meta.url);
export const MEALS = ["Birria de Res Bowl", "Chicken Pesto Pasta", "Jalapeño Lime Chicken"];
export const ADD = "Add to Cart";
/** Where `page.all` records a press outside every meal card: the page's own controls (§ 8), and the dialog's. */
export const PAGE = "(page)";

/** The shipped text: FILL as committed, or switched to `fill` — the one edit an operator makes. */
export const script = (fill) => storefrontText(fill ? { fill } : {});

/** Run the text as a page would: its only global is `window`. */
export function run(text, window) {
  vm.runInContext(text, vm.createContext({ window }));
}

export const fragmentFor = (payload) => `#fitaf=${encodePayload(payload)}`;
/** A fragment carrying any text, for payloads the link tool would refuse to encode. */
export const rawFragment = (text) => `#fitaf=${Buffer.from(text, "utf8").toString("base64url")}`;

/** localStorage as a string map. `failSetItem` makes every write throw, as a full quota does. */
export class FakeStorage {
  constructor(entries = {}, { failSetItem = false } = {}) {
    this.map = new Map(Object.entries(entries));
    this.failSetItem = failSetItem;
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    if (this.failSetItem) throw new Error("QuotaExceededError (fake)");
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
  /** Every key and value as one string: "byte-identical" compares two of these. */
  dump() {
    return JSON.stringify([...this.map].sort());
  }
}

/** A storage that fails the test if the script touches it at all. */
export const untouchableStorage = () =>
  new Proxy({}, { get: (_, key) => assert.fail(`storage touched: ${String(key)}`) });

/**
 * setTimeout that runs nothing by itself: the test steps it, so a 10 s wait costs no time. `delays` records the
 * SCRIPT's setTimeout calls only; `later(fn)` is the synthetic store's own next tick (its re-renders, its router),
 * queued in the same order but not recorded as a script delay.
 */
export function fakeTimers() {
  const queue = [];
  const delays = [];
  const step = () => {
    const fn = queue.shift();
    if (fn) fn();
    return Boolean(fn);
  };
  return {
    delays,
    step,
    pending: () => queue.length,
    setTimeout(fn, ms) {
      delays.push(ms);
      queue.push(fn);
      return delays.length;
    },
    later(fn) {
      queue.push(fn);
    },
    drain(limit = 1000) {
      let n = 0;
      while (step()) if (++n > limit) throw new Error("timers never settle");
      return n;
    },
  };
}

/**
 * A browser window on `path` + `fragment`. `events` records every history write and navigation, in order —
 * replaceState, pushState (the store's own in-app routing), location.assign / replace, and a write to
 * location.href — and, on a bound `page`, every press of a page control as ["press", id]. `info` records every
 * console.info line. `faults.replace` makes location.replace throw (the A guard case). `page` (from orderPage)
 * supplies the document and is bound to this window, so its controls can route the way the store's do.
 */
export function fakeWindow({
  path = "/order?mpid=21",
  fragment = "",
  storage = new FakeStorage(),
  document = undefined,
  page = undefined,
  timers = fakeTimers(),
  faults = {},
} = {}) {
  let url = new URL(path + fragment, ORIGIN);
  const events = [];
  const info = [];
  const location = {
    get hash() {
      return url.hash;
    },
    get pathname() {
      return url.pathname;
    },
    get search() {
      return url.search;
    },
    get href() {
      return url.href;
    },
    set href(to) {
      events.push(["href", to]);
    },
    replace(to) {
      if (faults.replace) throw new Error("location.replace failed (fake)");
      events.push(["replace", to]);
    },
    assign(to) {
      events.push(["assign", to]);
    },
  };
  const history = {
    state: null,
    replaceState(_state, _title, to) {
      events.push(["replaceState", to]);
      url = new URL(to, url);
    },
    pushState(_state, _title, to) {
      events.push(["pushState", to]);
      url = new URL(to, url);
    },
  };
  const window = {
    location,
    history,
    localStorage: storage,
    document: page ? page.document : document,
    setTimeout: (fn, ms) => timers.setTimeout(fn, ms),
    atob: (s) => atob(s),
    console: { info: (...parts) => info.push(parts.join(" ")) },
  };
  const h = {
    window,
    events,
    info,
    timers,
    storage,
    get url() {
      return url;
    },
    /** Put a URL back, as a single-page navigation would, without reloading. */
    goto(to) {
      url = new URL(to, ORIGIN);
    },
  };
  page?.bind(h);
  return h;
}

/** A refusal: the fragment removed (path and query kept), no navigation, and a diagnostic naming why. */
export function assertRefused(h, path, reason) {
  assert.deepEqual(h.events, [["replaceState", path]], "only the fragment removed; no navigation");
  assert.equal(h.url.hash, "", "fragment gone");
  assert.ok(
    h.info.some((line) => line.startsWith(LOG_PREFIX) && reason.test(line)),
    `a diagnostic matching ${reason}; got ${JSON.stringify(h.info)}`,
  );
}

/**
 * § 8's finish: the fragment removed, THEN the store's own CHECKOUT (the displayed one) pressed once — and, when the
 * store opened its extras dialog, that dialog's CONTINUE TO CHECKOUT once — then the store routed to /checkout in
 * the app. The script itself navigated nowhere (no assign, replace or href), no other control was pressed, and the
 * log says done.
 */
export function assertCheckedOut(h, page, path, { dialog = false } = {}) {
  const pressed = ["checkout:shown", ...(dialog ? ["continue"] : [])];
  assert.deepEqual(
    h.events,
    [["replaceState", path], ...pressed.map((id) => ["press", id]), ["pushState", "/checkout"]],
    "fragment removed, the store's own controls pressed once each, the store routed; the script navigated nowhere",
  );
  assert.deepEqual(page.controls, pressed, "no other page control pressed");
  assert.equal(h.url.pathname, "/checkout");
  assert.ok(h.info.includes(`${LOG_PREFIX} done: /checkout`), JSON.stringify(h.info));
}

// linkedom does no layout, so "displayed" is modelled here, answering the script's getClientRects() as a browser
// would for this fixture: no boxes for an element that is, or is inside, `hidden` or an inline `display: none`.
const { HTMLElement } = parseHTML("<!doctype html><html></html>");
Object.defineProperty(HTMLElement.prototype, "getClientRects", {
  configurable: true,
  value() {
    for (let el = this; el; el = el.parentElement) {
      if (el.hasAttribute("hidden") || /display:\s*none/.test(el.getAttribute("style") ?? "")) return [];
    }
    return [{ width: 1, height: 1 }];
  },
});

const CARDS = "app-product-card, app-product-card-mobile";
const titleOf = (card) => card.querySelector(".product__content-title").textContent.replace(/\s+/g, " ").trim();
const labelOf = (button) => button.getAttribute("aria-label") || button.textContent.trim();

/** What a card's .product__actions become after its Add to Cart is pressed — unknown on the real store. */
const AFTER_FIRST_PRESS = {
  stays: null,
  stepper:
    '<button type="button" aria-label="Decrease quantity">−</button><span>1</span>' +
    '<button type="button" aria-label="Increase quantity">+</button>',
  gone: "<span>In your cart</span>",
  // Look-alikes the fallback must never press: a favourites "+", a wishlist "Plus", a bare "add".
  decoys:
    '<button type="button" aria-label="Add to favourites">+</button>' +
    '<button type="button" aria-label="Wishlist">Plus</button>' +
    '<button type="button">Add one more</button>',
};
export const DECOY_LABELS = ["Add to favourites", "Wishlist", "Add one more", "Increase quantity (outside actions)"];

const control = (id, html, disabled = false) =>
  `<button type="button" data-id="${id}"${disabled ? " disabled" : ""}>${html}</button>`;
/**
 * The synthetic extras dialog (§ 8): two ways to add an extra, which fill B must never press, and CONTINUE TO
 * CHECKOUT. Written by hand; not the store's markup. Its CONTINUE stays enabled after a press: the worst case for
 * "pressed once".
 */
const DIALOG =
  '<div role="dialog" class="extras"><p>Extras (synthetic)</p>' +
  `<div class="extras__item">Protein Bar ${control("extra:plus", "+")}</div>` +
  `<div class="extras__item">${control("extra:add", "Add")} Cold Brew</div>` +
  `${control("continue", " CONTINUE TO CHECKOUT ")}</div>`;

/**
 * The synthetic order page, with every press recorded: `presses.get(name)` lists the labels pressed on a meal's
 * cards, `log` every meal press in order ([meal, label]), `controls` every press outside the cards in order (a
 * control's data-id, "<id> (disabled)" if it was disabled), and `all` both, interleaved ([meal, label] or [PAGE, id]).
 *
 * `afterFirstPress` is what a card's Add to Cart becomes once pressed: "stays" (unchanged), "stepper" (− 1 +),
 * "gone" (no button at all), or "decoys" (only look-alikes in the actions, and a real-looking increase button
 * OUTSIDE .product__actions, which the fallback must not reach).
 *
 * Once bound to a window (fakeWindow({ page })), the page behaves as § 8 found the store's: each Add to Cart or
 * Increase press counts one meal; every .summary shows a DISABLED "Add N more meals" until the count reaches `need`
 * (default: the window's mpid's meals a week, from data/plans.json), then an enabled CHECKOUT (`shownLabel` replaces
 * its text in the displayed layout only), shown DISABLED for its first `loadingTicks` store ticks (the store's busy
 * state). A summary re-renders `late` store ticks after a press. Pressing CHECKOUT
 * opens the extras dialog `openTicks` ticks later if `extras`, else routes; pressing the dialog's CONTINUE routes.
 * Routing is history.pushState("/checkout") `syncTicks` ticks later, or never if `routes` is false. A page control
 * stays enabled after its press, so a second press would be seen. Unbound, the summaries stay empty.
 */
export async function orderPage({
  afterFirstPress = "stays",
  need = undefined,
  late = 0,
  loadingTicks = 0,
  shownLabel = " CHECKOUT ",
  extras = false,
  openTicks = 2,
  syncTicks = 3,
  routes = true,
} = {}) {
  const { document } = parseHTML(await readFile(FIXTURE, "utf8"));
  const counts = countTable(await loadJson(PLANS_PATH));
  const presses = new Map();
  const log = [];
  const controls = [];
  const all = [];
  let counted = 0;
  let required = null;
  let bound = null;
  /** The store's own asynchrony: `fn` runs `n` store ticks from now, queued among the script's timers. */
  const tick = (n, fn) => (n > 0 ? bound.timers.later(() => tick(n - 1, fn)) : fn());

  function render() {
    const short = required - counted;
    const busy = short <= 0 && loadingTicks > 0;
    for (const summary of document.querySelectorAll(".summary")) {
      const layout = summary.getAttribute("data-layout");
      const label = layout === "shown" ? shownLabel : " CHECKOUT ";
      summary.innerHTML =
        short > 0
          ? control(`more:${layout}`, ` Add ${short} more meal${short === 1 ? "" : "s"} `, true)
          : control(`checkout:${layout}`, `${label}<i class="icon"></i>`, busy);
    }
    if (!busy) return;
    const ticks = loadingTicks;
    loadingTicks = 0;
    tick(ticks, render);
  }
  function route() {
    if (routes && bound) tick(syncTicks, () => bound.window.history.pushState(null, "", "/checkout"));
  }
  function openDialog() {
    tick(openTicks, () => {
      const holder = document.createElement("div");
      holder.innerHTML = DIALOG;
      document.body.appendChild(holder);
    });
  }
  function pressControl(button) {
    const id = button.getAttribute("data-id") ?? labelOf(button);
    // A browser's click() on a disabled button dispatches nothing; linkedom's does, so it is recorded and ignored.
    const entry = button.disabled ? `${id} (disabled)` : id;
    controls.push(entry);
    all.push([PAGE, entry]);
    if (button.disabled) return;
    bound?.events.push(["press", id]);
    if (id.startsWith("checkout:")) return extras ? openDialog() : route();
    if (id === "continue") route();
  }
  function pressMeal(button, card) {
    const name = titleOf(card);
    presses.set(name, [...(presses.get(name) ?? []), labelOf(button)]);
    log.push([name, labelOf(button)]);
    all.push([name, labelOf(button)]);
    if (!button.disabled && (/Add to Cart/.test(button.textContent) || labelOf(button) === "Increase quantity")) {
      counted++;
      if (bound) tick(late, render);
    }
    const replacement = AFTER_FIRST_PRESS[afterFirstPress];
    if (!/Add to Cart/.test(button.textContent) || replacement === null) return;
    card.querySelector(".product__actions").innerHTML = replacement;
    if (afterFirstPress !== "decoys") return;
    const outside = document.createElement("button");
    outside.setAttribute("aria-label", "Increase quantity (outside actions)");
    outside.textContent = "+";
    card.appendChild(outside);
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    const card = button.closest(CARDS);
    return card ? pressMeal(button, card) : pressControl(button);
  });
  const main = document.querySelector("main");
  const cards = main.innerHTML;
  return {
    document,
    presses,
    /** Every meal press, in the order it happened: [meal, label]. */
    log,
    controls,
    all,
    total: () => [...presses.values()].reduce((n, list) => n + list.length, 0),
    /** The text of each summary's control, in document order, with "(disabled)" when it is. */
    summary: () =>
      [...document.querySelectorAll(".summary button")].map(
        (b) => b.textContent.replace(/\s+/g, " ").trim() + (b.disabled ? " (disabled)" : ""),
      ),
    /** Take the cards off the page (the store has not rendered yet); `show()` puts them back. */
    hide: () => {
      main.innerHTML = "";
    },
    show: () => {
      main.innerHTML = cards;
    },
    /** Called by fakeWindow({ page }): the page now knows its window, its timers and its plan's count. */
    bind(h) {
      bound = h;
      required = need ?? counts[h.url.searchParams.get("mpid")] ?? Infinity;
      render();
    },
  };
}

/** R2-15's case, shared with R2-18's mutants: 1 + 2 + 4 = 7, mpid 21's count. */
export const CHECKOUT_PAYLOAD = {
  v: 1,
  mpid: 21,
  items: [
    { name: MEALS[0], qty: 1 },
    { name: MEALS[1], qty: 2 },
    { name: MEALS[2], qty: 4 },
  ],
};

/**
 * R2-15 (§ 8): run `text` on the synthetic page with CHECKOUT_PAYLOAD and assert the whole finish: the seven meal
 * presses, THEN the displayed CHECKOUT exactly once, the fragment removed before that press, the store's in-app
 * route to /checkout, "done" logged, no navigation by the script, storage never touched, and only 200 ms polls.
 * R2-18 runs a mutant text through this and expects it to throw.
 */
export async function checkoutCase(text) {
  const page = await orderPage();
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page, storage: untouchableStorage() });
  run(text, h.window);
  h.timers.drain();
  assert.deepEqual(
    page.all,
    [
      [MEALS[0], ADD],
      [MEALS[1], ADD],
      [MEALS[2], ADD],
      [MEALS[1], ADD],
      [MEALS[2], ADD],
      [MEALS[2], ADD],
      [MEALS[2], ADD],
      [PAGE, "checkout:shown"],
    ],
    "the seven meals, then CHECKOUT once, and nothing else",
  );
  assertCheckedOut(h, page, "/order?mpid=21");
  assert.ok(h.timers.delays.every((ms) => ms === POLL_MS), "only 200 ms polls");
  return { h, page };
}
