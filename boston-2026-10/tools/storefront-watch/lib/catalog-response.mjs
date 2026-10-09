// The page's own catalog response: the store's page asks its backend for the plan's products
// (`backend.happymealprep.com/api/v1/tenant/catalog/products`, SPEC-snacks-in-the-cart § 1a), and a headless visit READS
// that response as it arrives. The watch never requests it (SPEC-storefront-watch § 2, § 12 item 1). Shared by
// lib/probe-snacks.mjs and lib/visit.mjs (F6).
// ⛔ The request's query carries the storefront's key: of the request only its host, its path and its parameters' NAMES
// are ever kept, never a value.

/** The catalog's path, on whatever host the page asks. */
const CATALOG_PATH = /\/catalog\/products$/;
/** SPEC-storefront-watch § 12 item 1: the week's menu is the products in this category. */
export const MENU_CATEGORY = "all-meals";

/** A response (puppeteer's) to the page's own GET of the catalog. */
export function isCatalogResponse(response) {
  try {
    return CATALOG_PATH.test(new URL(response.url()).pathname) && response.request().method() === "GET";
  } catch {
    return false;
  }
}

/** The request, as it may be recorded: `{ at: host + path, params: [names] }`. */
export function catalogRequest(url) {
  const u = new URL(url);
  return { at: `${u.host}${u.pathname}`, params: [...u.searchParams.keys()] };
}

/** The response body's products (`{ data: [...] }`), or none. */
export const catalogProducts = (body) => (Array.isArray(body?.data) ? body.data : []);

/** The names of the products in `category` (a category is `{ slug }`), in the response's order. */
export function namesIn(products, category = MENU_CATEGORY) {
  return products
    .filter((p) => (p?.categories ?? []).some((c) => c?.slug === category))
    .map((p) => p.name)
    .filter((name) => typeof name === "string");
}
