// Shared by the r2-*.test.mjs files (rung 2, the storefront hand-off, SPEC-rung2 § 6). Not a test file itself.
// The hand-off is tested AS IT SHIPS: the built text runs in a fresh V8 context whose only global is a fake
// `window`, so a bare browser global in the script (localStorage, document, fetch, …) fails here.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { parseHTML } from "linkedom";
import { storefrontText } from "../scripts/build-storefront.mjs";
import { encodePayload } from "../scripts/handoff-link.mjs";

export const ORIGIN = "https://fitafnutrition.com";
export const CART_KEY = "hmp_local_cart";
export const POLL_MS = 200;
export const MAX_WAIT_MS = 10_000;
export const LOG_PREFIX = "[fitaf-handoff]";
export const FIXTURE = new URL("./r2-order-page.html", import.meta.url);
export const MEALS = ["Birria de Res Bowl", "Chicken Pesto Pasta", "Jalapeño Lime Chicken"];

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

/** setTimeout that runs nothing by itself: the test steps it, so a 10 s wait costs no time. */
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
    drain(limit = 1000) {
      let n = 0;
      while (step()) if (++n > limit) throw new Error("timers never settle");
      return n;
    },
  };
}

/**
 * A browser window on `path` + `fragment`. `events` records every history write and navigation, in order;
 * `info` every console.info line. `faults.replace` makes location.replace throw (the A guard case).
 */
export function fakeWindow({
  path = "/order?mpid=21",
  fragment = "",
  storage = new FakeStorage(),
  document = undefined,
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
  };
  const window = {
    location,
    history,
    localStorage: storage,
    document,
    setTimeout: (fn, ms) => timers.setTimeout(fn, ms),
    atob: (s) => atob(s),
    console: { info: (...parts) => info.push(parts.join(" ")) },
  };
  return {
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

/**
 * The synthetic order page, with every press recorded per meal: `presses.get(name)` is the list of the labels
 * pressed. `afterFirstPress` is what a card's Add to Cart becomes once pressed: "stays" (unchanged), "stepper"
 * (− 1 +), "gone" (no button at all), or "decoys" (only look-alikes in the actions, and a real-looking
 * increase button OUTSIDE .product__actions, which the fallback must not reach).
 */
export async function orderPage({ afterFirstPress = "stays" } = {}) {
  const { document } = parseHTML(await readFile(FIXTURE, "utf8"));
  const presses = new Map();
  const log = [];
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    const card = button.closest("app-product-card");
    const name = titleOf(card);
    presses.set(name, [...(presses.get(name) ?? []), labelOf(button)]);
    log.push([name, labelOf(button)]);
    const replacement = AFTER_FIRST_PRESS[afterFirstPress];
    if (!/Add to Cart/.test(button.textContent) || replacement === null) return;
    card.querySelector(".product__actions").innerHTML = replacement;
    if (afterFirstPress !== "decoys") return;
    const outside = document.createElement("button");
    outside.setAttribute("aria-label", "Increase quantity (outside actions)");
    outside.textContent = "+";
    card.appendChild(outside);
  });
  const main = document.querySelector("main");
  const cards = main.innerHTML;
  return {
    document,
    presses,
    /** Every press, in the order it happened: [meal, label]. */
    log,
    total: () => [...presses.values()].reduce((n, list) => n + list.length, 0),
    /** Take the cards off the page (the store has not rendered yet); `show()` puts them back. */
    hide: () => {
      main.innerHTML = "";
    },
    show: () => {
      main.innerHTML = cards;
    },
  };
}
