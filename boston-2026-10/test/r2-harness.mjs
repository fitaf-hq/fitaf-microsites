// Shared by the r2-*.test.mjs files (rung 2, the storefront hand-off, SPEC-rung2 § 6, § 8, § 10, § 11 and § 12). Not a
// test file itself. Fill B is the one fill (§ 12: fill A is retired, its cases with it; the package README names them). The hand-off is tested AS IT SHIPS: the built text runs in a fresh V8 context whose only global is a fake
// `window`, so a bare browser global in the script (localStorage, document, fetch, …) fails here.
// The links here are payload VERSION 2 (§ 11), written from refKey() below, the contract's definition of a meal's key
// implemented a second time, independently (Node's own UTF-8 bytes and BigInt arithmetic): so a test's link never
// depends on the code under test. R2-25 pins that the shipped key function and this one agree.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { parseHTML } from "linkedom";
import { loadJson, PLANS_PATH } from "../build.mjs";
import { countTable, storefrontText } from "../scripts/build-storefront.mjs";

export const ORIGIN = "https://fitafnutrition.com";
/** The store's cart key: a visitor's own cart there must be left exactly as it was (R2-14). */
export const CART_KEY = "hmp_local_cart";
export const POLL_MS = 200;
/** § 8 and § 10: every wait BEFORE a press (the meal cards, an enabled CHECKOUT) is at most 10 s. */
export const MAX_WAIT_MS = 10_000;
/** § 11 item 4: the wait AFTER the store's CHECKOUT is pressed (for its dialog, for /checkout) is at most 30 s. */
export const MAX_WAIT_AFTER_CHECKOUT_MS = 30_000;
export const LOG_PREFIX = "[fitaf-handoff]";
export const FIXTURE = new URL("./r2-order-page.html", import.meta.url);
export const MEALS = ["Birria de Res Bowl", "Chicken Pesto Pasta", "Jalapeño Lime Chicken"];
export const ADD = "Add to Cart";
/** Where `page.all` records a press outside every meal card: the page's own controls (§ 8), and the dialog's. */
export const PAGE = "(page)";

/**
 * The shipped text: fill B's, the one fill (SPEC-rung2 § 12). `fill` is kept so the fill-B cases read as they did;
 * anything but "B" is refused, because fill A is retired and no text of it is built.
 */
export const script = async (fill = "B") => {
  assert.equal(fill, "B", "fill A is retired (SPEC-rung2 § 12): the build has one text, fill B's");
  return storefrontText();
};

/** Run the text as a page would: its only global is `window`. */
export function run(text, window) {
  vm.runInContext(text, vm.createContext({ window }));
}

const FNV_OFFSET = 0x811c9dc5n;
const FNV_PRIME = 0x01000193n;
const U32 = 0xffffffffn;
const KEY_SPACE = 36n ** 5n;

/** 32-bit FNV-1a over the UTF-8 bytes of `text`, as a BigInt: the reference, checked against FNV's own vectors in R2-25. */
export function refFnv1a(text) {
  let h = FNV_OFFSET;
  for (const byte of Buffer.from(text, "utf8")) h = ((h ^ BigInt(byte)) * FNV_PRIME) & U32;
  return h;
}

/**
 * SPEC-rung2 § 11 item 2, read the second way the contract states it: the hash of the name as the page shows it
 * (whitespace collapsed and trimmed) MODULO 36^5, in base 36, five characters.
 */
export const refKey = (name) => (refFnv1a(name.replace(/\s+/g, " ").trim()) % KEY_SPACE).toString(36).padStart(5, "0");

/** One item of a v2 payload: `<key>`, or `<key>*<n>` for a count above 1. */
const itemToken = ({ name, qty }) => (qty === 1 ? refKey(name) : `${refKey(name)}*${qty}`);

/**
 * `{ items: [{ name, qty }], code? }` -> the text after `#fitaf=`: "2", each item, then "~<code>" if there is one,
 * dot-separated (§ 11 item 1). Any `mpid` is ignored: v2 reads the plan's id from the page's own query. A count the
 * script refuses (0, 22) is written all the same, so a test can show the refusal.
 */
export const payloadText = ({ items, code }) =>
  ["2", ...items.map(itemToken), ...(code === undefined ? [] : [`~${code}`])].join(".");
export const fragmentFor = (payload) => `#fitaf=${payloadText(payload)}`;
/** A fragment carrying any text as it is, for payloads the link tool would never write. */
export const rawFragment = (text) => `#fitaf=${text}`;
/** A RETIRED version-1 link's fragment (§ 6: base64url of the JSON payload), which § 11 refuses. */
export const v1Fragment = (payload) => `#fitaf=${Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")}`;

/** localStorage as a string map. */
export class FakeStorage {
  constructor(entries = {}) {
    this.map = new Map(Object.entries(entries));
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
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
 * console.info line. `page` (from orderPage) supplies the document and is bound to this window, so its controls can
 * route the way the store's do.
 */
export function fakeWindow({
  path = "/order?mpid=21",
  fragment = "",
  storage = new FakeStorage(),
  document = undefined,
  page = undefined,
  timers = fakeTimers(),
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

const plural = (n, s) => (n === 1 ? "" : s);

/**
 * What the store's checkout slot holds for a plan of `held` meals that needs `need` (short = need − held), in the two
 * elements § 10's build note read from the store's public code. Both hold one control, or none:
 * - the cart BAR (below 1025 px): a disabled " Add N more meal(s) ", " CHECKOUT " (+ an icon), or a disabled
 *   " Limit Exceeded " over the maximum; the store HIDES the whole bar while the plan holds nothing, the control
 *   still rendered inside it. `label` replaces CHECKOUT's text.
 * - the cart SIDEBAR (1025 px and wider): nothing but "Your cart is empty" while the plan holds nothing; else the
 *   item count and a "Clear cart" button (which B must never press), then a disabled " ADD N MORE MEAL(S) TO
 *   CHECKOUT ", " CHECKOUT NOW ", or a disabled " REMOVE N MEAL(S) TO CHECKOUT ". `label` replaces CHECKOUT NOW's text.
 * Written by hand from those labels; not the store's markup.
 */
function slot(width, layout, { held, short, busy, label }) {
  if (width === "bar") {
    if (short > 0) return control(`more:${layout}`, ` Add ${short} more meal${plural(short, "s")} `, true);
    if (short < 0) return control(`limit:${layout}`, " Limit Exceeded ", true);
    return control(`checkout:${layout}`, `${label}<i class="icon"></i>`, busy);
  }
  if (!held) return "<p>Your cart is empty</p> <p>Add some delicious meals to get started!</p>";
  const header = `<div class="cart__items-header"><span>${held} item${plural(held, "s")}</span> ${control("clear", "Clear cart")}</div> `;
  if (short > 0) return header + control(`more:${layout}`, ` ADD ${short} MORE MEAL${plural(short, "S")} TO CHECKOUT `, true);
  if (short < 0) return header + control(`limit:${layout}`, ` REMOVE ${-short} MEAL${plural(-short, "S")} TO CHECKOUT `, true);
  return header + control(`checkout:${layout}`, label, busy);
}

/**
 * The synthetic order page, with every press recorded: `presses.get(name)` lists the labels pressed on a meal's
 * cards, `log` every meal press in order ([meal, label]), `controls` every press outside the cards in order (a
 * control's data-id, "<id> (disabled)" if it was disabled), and `all` both, interleaved ([meal, label] or [PAGE, id]).
 *
 * `afterFirstPress` is what a card's Add to Cart becomes once pressed: "stays" (unchanged), "stepper" (− 1 +),
 * "gone" (no button at all), or "decoys" (only look-alikes in the actions, and a real-looking increase button
 * OUTSIDE .product__actions, which the fallback must not reach). A meal already in the plan when the page loads shows
 * the same (the store renders its counter in place of Add to Cart for a meal already chosen: § 10's build note).
 *
 * `store` is what outlives a page load, as the store's own storage does: `store.pending` is this plan's pending list,
 * one meal name per meal. Two pages given one store are one visitor's two loads (R2-22's reload). Default: empty.
 *
 * `width` is the window's: "bar" (below 1025 px, the default) or "sidebar" (1025 px and wider). The displayed
 * .summary (data-layout="shown") is that width's element; the other .summary is never displayed (display: none) and
 * always holds the bar's control, so a control that is rendered but not displayed is on the page in every case.
 *
 * Once bound to a window (fakeWindow({ page })), the page behaves as § 8 and § 10 found the store's: each Add to Cart
 * or Increase press adds one meal to `store.pending`; each .summary shows its width's slot (above) for the plan's
 * count and `need` (default: the window's mpid's meals a week, from data/plans.json), CHECKOUT shown DISABLED for its
 * first `loadingTicks` store ticks (the store's busy state). `shownLabel` replaces CHECKOUT's text in the displayed
 * layout only (default: " CHECKOUT ", or " CHECKOUT NOW " at "sidebar"). A summary re-renders `late` store ticks
 * after a press. Pressing CHECKOUT opens the extras dialog `openTicks` ticks later if `extras`, else routes; pressing
 * the dialog's CONTINUE routes; pressing "Clear cart" empties the pending list. Routing is
 * history.pushState("/checkout") `syncTicks` ticks later, or never if `routes` is false. A page control stays
 * enabled after its press, so a second press would be seen. Unbound, the summaries stay empty.
 */
export async function orderPage({
  afterFirstPress = "stays",
  need = undefined,
  late = 0,
  loadingTicks = 0,
  width = "bar",
  shownLabel = width === "sidebar" ? " CHECKOUT NOW " : " CHECKOUT ",
  store = { pending: [] },
  extras = false,
  openTicks = 2,
  syncTicks = 3,
  routes = true,
} = {}) {
  assert.ok(["bar", "sidebar"].includes(width), `width: ${width}`);
  const { document } = parseHTML(await readFile(FIXTURE, "utf8"));
  const counts = countTable(await loadJson(PLANS_PATH));
  const presses = new Map();
  const log = [];
  const controls = [];
  const all = [];
  let required = null;
  let bound = null;
  /** The store's own asynchrony: `fn` runs `n` store ticks from now, queued among the script's timers. */
  const tick = (n, fn) => (n > 0 ? bound.timers.later(() => tick(n - 1, fn)) : fn());

  function render() {
    const held = store.pending.length;
    const short = required - held;
    const busy = short <= 0 && loadingTicks > 0;
    for (const summary of document.querySelectorAll(".summary")) {
      const layout = summary.getAttribute("data-layout");
      const shown = layout === "shown";
      const label = shown ? shownLabel : " CHECKOUT ";
      summary.innerHTML = slot(shown ? width : "bar", layout, { held, short, busy, label });
      // The store's bar is hidden while the plan holds nothing (its control still rendered inside it).
      if (shown && width === "bar") summary.toggleAttribute("hidden", held === 0);
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
    if (id === "clear") {
      store.pending.length = 0;
      tick(late, render);
    }
  }
  /** A meal already chosen: its card's Add to Cart becomes what `afterFirstPress` says. */
  function chosen(card) {
    const replacement = AFTER_FIRST_PRESS[afterFirstPress];
    if (replacement === null) return;
    card.querySelector(".product__actions").innerHTML = replacement;
    if (afterFirstPress !== "decoys") return;
    const outside = document.createElement("button");
    outside.setAttribute("aria-label", "Increase quantity (outside actions)");
    outside.textContent = "+";
    card.appendChild(outside);
  }
  function pressMeal(button, card) {
    const name = titleOf(card);
    presses.set(name, [...(presses.get(name) ?? []), labelOf(button)]);
    log.push([name, labelOf(button)]);
    all.push([name, labelOf(button)]);
    if (!button.disabled && (/Add to Cart/.test(button.textContent) || labelOf(button) === "Increase quantity")) {
      store.pending.push(name);
      if (bound) tick(late, render);
    }
    if (/Add to Cart/.test(button.textContent)) chosen(card);
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    const card = button.closest(CARDS);
    return card ? pressMeal(button, card) : pressControl(button);
  });
  for (const card of document.querySelectorAll("app-product-card")) {
    if (store.pending.includes(titleOf(card))) chosen(card);
  }
  const main = document.querySelector("main");
  const cards = main.innerHTML;
  const text = (b) => b.textContent.replace(/\s+/g, " ").trim() + (b.disabled ? " (disabled)" : "");
  const slotButtons = () => [...document.querySelectorAll(".summary button")].filter((b) => b.getAttribute("data-id") !== "clear");
  return {
    document,
    store,
    presses,
    /** Every meal press, in the order it happened: [meal, label]. */
    log,
    controls,
    all,
    total: () => [...presses.values()].reduce((n, list) => n + list.length, 0),
    /** The text of each summary's checkout-slot control, in document order, displayed or not, "(disabled)" when it is. */
    summary: () => slotButtons().map(text),
    /** The same, for the DISPLAYED controls only: what the store shows at this width. */
    displayed: () => slotButtons().filter((b) => b.getClientRects().length).map(text),
    /** The displayed layout's whole text (the sidebar's "Your cart is empty", its item count). */
    shownText: () => document.querySelector('[data-layout="shown"]').textContent.replace(/\s+/g, " ").trim(),
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

/** R2-15's case, shared with R2-18's mutants: 1 + 2 + 4 = 7, mpid 21's count (the page's own ?mpid=21). */
export const CHECKOUT_PAYLOAD = {
  mpid: 21,
  items: [
    { name: MEALS[0], qty: 1 },
    { name: MEALS[1], qty: 2 },
    { name: MEALS[2], qty: 4 },
  ],
};

/**
 * R2-15 (§ 8): run `text` on the synthetic page with CHECKOUT_PAYLOAD (or `fragment`: R2-24 passes the link tool's own)
 * and assert the whole finish: the seven meal presses, THEN the displayed CHECKOUT exactly once, the fragment removed
 * before that press, the store's in-app route to /checkout, "done" logged, no navigation by the script, storage never
 * touched, and only 200 ms polls. R2-18 runs a mutant text through this and expects it to throw.
 */
export async function checkoutCase(text, fragment = fragmentFor(CHECKOUT_PAYLOAD)) {
  const page = await orderPage();
  const h = fakeWindow({ fragment, page, storage: untouchableStorage() });
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

/** § 10's stop line, exactly as fill B logs it. */
export const HELD_LINE = `${LOG_PREFIX} stopped: the plan already holds meals`;

/**
 * R2-19 (§ 10): the plan already holds `pending` (default: 1 meal, so the store shows "Add 6 more" of 7) when
 * `text` runs with CHECKOUT_PAYLOAD at `width`. Asserts the whole refusal: the fixture shows its non-empty state,
 * then NOTHING is pressed (no meal, no page control, "Clear cart" included), the fragment is removed, the line is
 * § 10's, the plan's pending list is exactly as it was, storage is never touched, and B did not wait out its
 * 10 s budget first. R2-23 runs a mutant text through this and expects it to throw.
 */
export async function heldCase(text, { width = "bar", pending = [MEALS[0]], ...options } = {}) {
  const store = { pending: [...pending] };
  const page = await orderPage({ width, store, ...options });
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page, storage: untouchableStorage() });
  const before = page.displayed();
  assert.equal(before.length, 1, `fixture control: the store shows its checkout slot: ${before}`);
  run(text, h.window);
  h.timers.drain();
  assert.deepEqual(page.all, [], "no press at all: no meal, no page control");
  assertRefused(h, "/order?mpid=21", /stopped: the plan already holds meals$/);
  assert.ok(h.info.includes(HELD_LINE), JSON.stringify(h.info));
  assert.deepEqual(store.pending, pending, "the plan's meals exactly as they were: none added, none removed");
  assert.ok(h.timers.delays.length * POLL_MS < MAX_WAIT_MS, `stopped at once, not after the wait: ${h.timers.delays.length} polls`);
  return { h, page, store, before };
}

/**
 * R2-22 (§ 10): a first run of `text` on a page at `width` until `after` meals are pressed; then the page reloads — a
 * new page over the same store (the pending list outlives the load, as the store's storage does) and a fresh window
 * on the same address, the fragment still in it — and `text` runs again. Asserts: the second run presses nothing,
 * stops with § 10's line at once (not after its 10 s wait), removes the fragment, and the pending meals stay exactly
 * the first run's. `afterFirstPress` "stepper" is the store's own case: a meal already chosen shows its counter in
 * place of Add to Cart. R2-23 runs a mutant text through this and expects it to throw.
 */
export async function reloadCase(text, { width = "bar", afterFirstPress = "stepper", after = 7 } = {}) {
  const store = { pending: [] };
  const fragment = fragmentFor(CHECKOUT_PAYLOAD);
  const first = await orderPage({ width, afterFirstPress, store });
  const h1 = fakeWindow({ fragment, page: first, storage: untouchableStorage() });
  run(text, h1.window);
  while (first.log.length < after) assert.ok(h1.timers.step(), "the first run still pressing");
  // The page reloads here: the first window's timers never run again.
  assert.equal(h1.url.hash, fragment, "fixture control: the link is still in the address when the page reloads");
  assert.equal(store.pending.length, after, "fixture control: the first run's meals are pending");
  const pressed = [...store.pending];
  const second = await orderPage({ width, afterFirstPress, store });
  const h2 = fakeWindow({
    path: h1.url.pathname + h1.url.search,
    fragment: h1.url.hash,
    page: second,
    storage: untouchableStorage(),
  });
  assert.equal(second.displayed().length, 1, "fixture control: the store shows the pending meals");
  run(text, h2.window);
  h2.timers.drain();
  assert.deepEqual(second.all, [], "the reload presses nothing");
  assertRefused(h2, "/order?mpid=21", /stopped: the plan already holds meals$/);
  assert.ok(h2.info.includes(HELD_LINE), JSON.stringify(h2.info));
  assert.deepEqual(store.pending, pressed, "the pending meals stay exactly the first run's");
  assert.ok(h2.timers.delays.length * POLL_MS < MAX_WAIT_MS, `stopped at once: ${h2.timers.delays.length} polls`);
  return { second, pressed };
}

/**
 * A planted collision (§ 11 item 3): two meal names whose keys are equal, found by a search over "Planted Meal <n>" with
 * refKey (key "uayaw"). R2-26 asserts they collide before relying on it.
 */
export const COLLIDING = ["Planted Meal 40789", "Planted Meal 91224"];

/** Add a meal card to the synthetic page, shaped as the fixture's own (a title and its Add to Cart). */
export function addCard(document, name) {
  const card = document.createElement("app-product-card");
  card.innerHTML = `<div class="product__content-title">${name}</div><div class="product__actions"><button type="button">Add to Cart</button></div>`;
  document.querySelector("main").appendChild(card);
  return card;
}

/** R2-26's link: 1 + 2 of the fixture's own meals and 4 of COLLIDING[0], 7 of mpid 21's 7. */
export const COLLISION_PAYLOAD = {
  mpid: 21,
  items: [
    { name: MEALS[0], qty: 1 },
    { name: MEALS[1], qty: 2 },
    { name: COLLIDING[0], qty: 4 },
  ],
};

/**
 * R2-26 (§ 11 item 3): both COLLIDING cards on the page, the link naming ONE of them. Asserts the whole refusal: nothing
 * pressed at all (not even the meals that were found), the fragment removed, the stop line naming the shared key, and
 * no wait first. R2-30 runs a mutant text through this and expects it to throw.
 */
export async function collisionCase(text) {
  const page = await orderPage();
  for (const name of COLLIDING) addCard(page.document, name);
  const h = fakeWindow({ fragment: fragmentFor(COLLISION_PAYLOAD), page, storage: untouchableStorage() });
  run(text, h.window);
  h.timers.drain();
  assert.deepEqual(page.all, [], "no press at all: no meal, no page control");
  assertRefused(h, "/order?mpid=21", new RegExp(`stopped: two meals share a key: ${refKey(COLLIDING[0])}$`));
  assert.deepEqual(page.store.pending, [], "the plan holds nothing");
  assert.ok(h.timers.delays.length * POLL_MS < MAX_WAIT_MS, `stopped at once: ${h.timers.delays.length} polls`);
  return { h, page };
}
