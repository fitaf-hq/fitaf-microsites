// What the Hand-off stories and the store's build share (SPEC-storybook-microsite.md § 8): where the synthetic store's
// files are kept, how the frame's address names the store a story opens, and the stores' ids. Plain ESM with no Node or
// browser API, so the stories (in the browser) and handoff/store.mjs (in Node) read the same names. No rule or word of
// the block is here.

/** Where the store's files are kept: a directory of the static build (and of the development server's cache). */
export const STORE_ROUTE = "store";
/** The store's manifest, beside its files: what the stories offer and the links they open. */
export const STORE_MANIFEST = "store.json";
/**
 * The store's own two paths. ⚠ The block runs only at /order (any other path: "not the order page") and finishes when
 * the path is /checkout, so the store is served AT these paths of Storybook's own origin, not under /store/.
 */
export const ORDER_PATH = "/order";
export const CHECKOUT_PATH = "/checkout";
/** The query parameter naming the store a request gets (the block reads only ?mpid=, SPEC-rung2 § 11 item 1). */
export const STORE_PARAM = "store";

/** The stores (each one set of the watch fixture's own options), by id. */
export const STORE = { screenA: "screen-a", screenC: "screen-c", checkout: "checkout", ordinary: "ordinary" };
/** Screen · B's store for meal `k` of `t`: the fixture's hangAfter k, on a link of `t` meals. */
export const screenBStore = (k, t) => `screen-b-${k}-of-${t}`;

/** The frame's address: the store's path and the link's query, the store named, then the link's fragment. */
export function storeUrl({ path, search = "", store, hash = "" }) {
  const params = new URLSearchParams(search);
  params.set(STORE_PARAM, store);
  return `${path}?${params}${hash}`;
}
