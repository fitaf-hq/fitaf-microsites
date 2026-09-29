// SPEC-storefront-watch § 2: every request the watch makes is to the store's origin, and nothing else. This is the
// only place the watch requests anything; a URL on any other origin (another host, plain http, a subdomain) is
// refused BEFORE a request is made, and a redirect is followed only while it stays on the store.
import { STORE_ORIGIN } from "./config.mjs";

const MAX_REDIRECTS = 5;
const USER_AGENT = "fitaf-storefront-watch (+https://github.com/fitaf-hq/fitaf-microsites)";

export class RefusedHost extends Error {
  constructor(url, why, origin) {
    super(`refused ${url}: ${why} (the watch requests ${origin} only)`);
    this.name = "RefusedHost";
    this.url = url;
  }
}

function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * `fetchImpl` is injected by the tests (no network) and is `fetch` otherwise. `calls` lists every URL requested,
 * in order; `refused` every URL refused, requested or not. `get` returns the response's `Last-Modified` too (null if
 * none): for the entry bundle it is the release's publish time (SPEC-storefront-watch § 7 item 1), read from the one
 * request made anyway.
 */
export function storeFetcher({ fetchImpl = globalThis.fetch, origin = STORE_ORIGIN } = {}) {
  const calls = [];
  const refused = [];
  const isStore = (url) => originOf(url) === origin;
  /** A URL the watch saw (in the page, in a bundle) and will not request. */
  const refuse = (url) => {
    if (!refused.includes(url)) refused.push(url);
  };

  async function get(url) {
    let current = String(url);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!isStore(current)) {
        refuse(current);
        throw new RefusedHost(current, hop ? "a redirect off the store" : "not the store", origin);
      }
      calls.push(current);
      const res = await fetchImpl(current, { redirect: "manual", headers: { "user-agent": USER_AGENT, accept: "*/*" } });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) throw new Error(`GET ${current}: HTTP ${res.status} with no location`);
        current = new URL(location, current).href;
        continue;
      }
      if (!res.ok) throw new Error(`GET ${current}: HTTP ${res.status}`);
      return { url: current, text: await res.text(), lastModified: res.headers.get("last-modified") };
    }
    throw new Error(`GET ${url}: more than ${MAX_REDIRECTS} redirects`);
  }

  return { get, isStore, refuse, calls, refused, origin };
}
