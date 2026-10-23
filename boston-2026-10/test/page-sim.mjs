// Shared by S5, S17, S18, S19. Not a test file itself.
// Runs a built page's own inline scripts in a Node `vm` context over a minimal stand-in for the DOM, and
// RECORDS every way a value could leave the page or persist: fetch, XMLHttpRequest, sendBeacon, the URL
// and its fragment, history, localStorage/sessionStorage, cookies. Elements exist only if the HTML has
// their id, so a script looking for an id the page lacks gets null, as in a browser.
import vm from "node:vm";

function tagWithId(html, id) {
  const m = new RegExp(`<([a-z0-9]+)\\b[^>]*\\bid="${id}"[^>]*>`).exec(html);
  return m ? { tag: m[1], open: m[0] } : null;
}

/** A `Date` whose clock reads `now` (ms since the epoch): `Date.now()` and `new Date()` both. The zone it is
 *  read in is the process's (`TZ`), as a browser's is its own. */
function clockAt(now) {
  return class extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  };
}

/** SPEC-save-offer-production § 10.7: the page's save step is drawn only while an offer is live (the Boston offer ends
 *  2026-10-29, and none follows it), so a page case's clock is fixed: omitted, noon in New York on 2026-10-24, a day of the
 *  offer (worker-harness.mjs TEST_NOW_MS, the Worker's). */
export const PAGE_NOW_MS = Date.parse("2026-10-24T16:00:00.000Z");

/** `now`: the browser's clock, fixed at that instant (ms); omitted, PAGE_NOW_MS. `search`: the URL's query, as
 *  `location.search` gives it ("?e=boston"; SPEC-save-offer-production § 9 item 2). */
export function simulatePage(html, { hash = "", search = "", turnstile = "pass", fetchReply = { ok: true, json: { ok: true } }, now = PAGE_NOW_MS } = {}) {
  const record = { fetches: [], xhr: 0, beacons: [], hashWrites: [], history: [], storage: [], cookies: [], lookups: new Set() };
  const elements = new Map();
  const windowListeners = {};

  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const found = tagWithId(html, id);
    if (!found) return null;
    const listeners = {};
    const json = new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`).exec(html);
    const el = {
      id,
      tagName: found.tag.toUpperCase(),
      hidden: /\bhidden\b/.test(found.open.replace(/"[^"]*"/g, "")),
      textContent: json ? json[1] : "",
      value: "",
      checked: /\bchecked\b/.test(found.open.replace(/"[^"]*"/g, "")),
      disabled: false,
      attributes: {},
      addEventListener(type, fn) { (listeners[type] ??= []).push(fn); },
      dispatch(type) {
        const event = { type, target: el, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
        for (const fn of listeners[type] ?? []) fn(event);
        return event;
      },
      setAttribute(k, v) { el.attributes[k] = String(v); },
      getAttribute(k) { return el.attributes[k] ?? null; },
      // SPEC-rung4 § 2b: Flow 1 is moved after the store button. This stand-in records the parent only; document order
      // is not modelled here (S27-S31 run the page over linkedom's DOM for that).
      parentNode: null,
      appendChild(child) { child.parentNode = el; return child; },
      focus() {},
      scrollIntoView() {},
    };
    elements.set(id, el);
    return el;
  }

  const location = {
    href: `https://dev.example.invalid/${search}${hash}`,
    pathname: "/",
    search,
    get hash() { return this._hash; },
    set hash(v) {
      const h = v.startsWith("#") ? v : `#${v}`;
      record.hashWrites.push(h);
      this._hash = h;
      this.href = `https://dev.example.invalid/${h}`;
      for (const fn of windowListeners.hashchange ?? []) fn({ type: "hashchange" });
    },
    _hash: hash,
  };
  const storage = (name) => ({
    getItem: () => null,
    setItem: (k, v) => record.storage.push({ name, k, v }),
    removeItem: () => {},
  });
  const widget = { callback: null, errorCallback: null };
  const g = {
    console,
    location,
    document: {
      getElementById(id) {
        record.lookups.add(id);
        return element(id);
      },
      querySelector(sel) {
        return sel.startsWith("#") ? this.getElementById(sel.slice(1)) : null;
      },
      querySelectorAll() {
        return [];
      },
      set cookie(v) { record.cookies.push(v); },
      get cookie() { return ""; },
    },
    history: {
      pushState: (...a) => record.history.push(["push", ...a]),
      replaceState: (...a) => record.history.push(["replace", ...a]),
    },
    localStorage: storage("local"),
    sessionStorage: storage("session"),
    navigator: { sendBeacon: (url, data) => record.beacons.push({ url, data }) },
    XMLHttpRequest: function () { record.xhr++; },
    addEventListener(type, fn) { (windowListeners[type] ??= []).push(fn); },
    fetch(url, init) {
      record.fetches.push({ url, init });
      return Promise.resolve({ ok: fetchReply.ok, json: () => Promise.resolve(fetchReply.json) });
    },
    turnstile: {
      render(_sel, opts) {
        widget.callback = opts.callback;
        widget.errorCallback = opts["error-callback"];
        return "widget-1";
      },
      reset() {},
      execute() {
        if (turnstile === "pass") widget.callback("XXXX.DUMMY.TOKEN.XXXX");
        else widget.errorCallback();
      },
    },
  };
  if (now !== undefined) g.Date = clockAt(now);
  g.window = g;
  const context = vm.createContext(g);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  for (const s of scripts) vm.runInContext(s, context);

  return {
    record,
    location,
    el: (id) => {
      const e = element(id);
      if (!e) throw new Error(`the page has no element #${id}`);
      return e;
    },
    type(id, value) {
      const e = this.el(id);
      e.value = value;
      e.dispatch("input");
    },
    /** Let promise chains (fetch().then…) settle. */
    settle: () => new Promise((r) => setImmediate(r)),
    /** Every id a script asked for that the page does not have (optional ones excepted). */
    missing: (optional = []) => [...record.lookups].filter((id) => !optional.includes(id) && !element(id)),
  };
}
