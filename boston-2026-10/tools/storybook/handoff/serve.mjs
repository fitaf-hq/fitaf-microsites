// How the Hand-off stories' store is served (SPEC-storybook-microsite.md § 8.1): the one rule both servers apply, the
// development server (.storybook/middleware.js) and the cases' (test/serve-static.mjs), as microsite/serve.mjs is for
// the pages.
//
// ⚠ The block runs only on the store's own paths: /order (any other is "not the order page", and it does nothing) and
// /checkout (where its fill is done). So the store is served AT those paths of Storybook's own origin, where the story's
// frame opens it, and the query's ?store= names which store's page (one set of the fixture's options) a request gets;
// none named, the ordinary store. Its files are kept under store/ (the static build; the cache, for the development
// server); the store's images are served at its own /img/. ⛔ Every store page is sent with the pages' policy
// (microsite/serve.mjs): nothing from another host, the block's photo sheet included.
import { PAGE_POLICY } from "../microsite/serve.mjs";
import { CHECKOUT_PATH, ORDER_PATH, STORE, STORE_PARAM } from "./layout.js";

const STORE_ID = /^[a-z0-9-]{1,64}$/;
const IMAGE = /^\/img\/([a-z0-9-]{1,64}\.svg)$/;
/** As the fixture sends its pages and images: never cached, so a rebuilt store shows on a story's reload. */
const NOT_STORED = { "Cache-Control": "no-store" };

/**
 * The store's response to a request for `pathname` with `search`: its file (relative to the store's directory), its
 * type and headers, or null when the request is not the store's. `policy: false` is SM-8's mutant (a server that forgets
 * the policy).
 */
export function storeRoute(pathname, search = "", { policy = true } = {}) {
  if (pathname === ORDER_PATH || pathname === CHECKOUT_PATH) {
    const store = new URLSearchParams(search).get(STORE_PARAM) ?? STORE.ordinary;
    if (!STORE_ID.test(store)) return null;
    const headers = { ...NOT_STORED, ...(policy ? { "Content-Security-Policy": PAGE_POLICY } : {}) };
    return { file: `${store}/index.html`, type: "text/html; charset=utf-8", headers };
  }
  const image = IMAGE.exec(pathname);
  return image ? { file: `img/${image[1]}`, type: "image/svg+xml", headers: NOT_STORED } : null;
}
