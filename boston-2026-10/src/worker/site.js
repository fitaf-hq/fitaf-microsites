// The week as content (SPEC-week-content.md § 4): PRODUCTION's Worker entry (wrangler.jsonc's top-level `main`), and the
// behaviours the development Worker (index.js) imports, never copies. ⛔ Nothing else is here: no D1, no rate limiter, no
// cron, no other route. Every other request is the assets' (§ 4.1). Since SPEC-analytics.md § 4 (the Advisor's word,
// 2026-10-13) the "ONLY two things" are three: 3., below.
//
// 1. The page (§ 4.2): for a request that would be served the page carrying `#picks-data` (wrangler.jsonc's
//    `assets.run_worker_first` sends those routes here first; every other route stays assets-first, § 4.5), the asset is
//    fetched, and if it is the page (200, HTML) the bucket's week/picks-data.json replaces the text of its `#picks-data`
//    element (HTMLRewriter), escaped exactly as the build's scriptJson escapes it. Only an object that parses as a JSON
//    object holding ONE week in the shape the page's script reads (isWeek) is put in; anything else (no object, not
//    JSON, no week, two, a key the script reads missing, the bucket unbound or failing) leaves the asset's bytes as they
//    are: no week, no card. Nothing is thrown at the visitor.
// 2. The photo sheets (§ 4.3): GET /week/<file>.jpg, a plain file name, is the bucket's object week/<file>.jpg,
//    image/jpeg; any other /week/ request, or an absent object, is a 404, the bucket not read for a refused name.
// 3. The page's analytics (SPEC-analytics.md § 4): POST /a, one event of a closed list, one Analytics Engine data
//    point; a 204 in every case (beacon.js). No asset matches /a, so it reaches the script assets-first.
//
// Freshness (§ 4.4): a write to the bucket is what the next request gets. The page is asked of the assets WITHOUT the
// visitor's conditional headers (so the assets never answer 304 for a page whose week may have changed under the same
// asset), and goes out with `Cache-Control: no-cache` and no ETag or Last-Modified (the asset's would name the asset, not
// this page): a browser keeps it but asks again every time, and gets the page whole. A sheet goes out with
// `Cache-Control: no-cache` and the object's own ETag, so a browser revalidates every time and gets a 304 while the
// object is unchanged; a sheet re-written under the same name is seen at the next request.
import { BEACON_PATH, serveBeacon } from "./beacon.js";
import { scriptJson } from "./script-json.js";

/** SPEC-week-content § 1, the interface with fitaf-infra: the binding is WEEK, and these are its objects. */
export const WEEK_OBJECT = "week/picks-data.json";
export const SHEETS_PATH = "/week/";
const SHEETS_PREFIX = "week/";
/** A sheet's file name: letters, digits, ".", "_" and "-", starting with a letter or digit, ending ".jpg". */
const SHEET_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.jpg$/;
/** No week is anywhere near this (the week delivered 2026-10-18 is 33 KB); a larger object is not read into memory. */
const MAX_WEEK_BYTES = 1024 * 1024;
const PICKS_ELEMENT = "script#picks-data";
/** The request headers that could make the assets answer with less than the whole page (a 304, a 206, a 412). */
const CONDITIONAL = ["if-none-match", "if-modified-since", "if-match", "if-unmodified-since", "if-range", "range"];
export const PAGE_CACHE_CONTROL = "no-cache";
export const SHEET_CACHE_CONTROL = "no-cache";

/** § 4.3: the bucket key of a /week/ path, or null when the path is not a plain .jpg file name directly under /week/
 *  (matched as it arrives: an encoded "/" or "." is not a plain name). */
export function sheetKey(pathname) {
  if (!pathname.startsWith(SHEETS_PATH)) return null;
  const name = pathname.slice(SHEETS_PATH.length);
  if (name.includes("/") || name.includes("..") || !SHEET_NAME.test(name)) return null;
  return SHEETS_PREFIX + name;
}

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string";
const isListOf = (v, item) => Array.isArray(v) && v.every(item);
const isMapOf = (v, item) => isObject(v) && Object.values(v).every(item);
/** A list the script fills (a cart's meals, a day count's snacks): its lines, and a tile style or null per line. */
const isLines = (v) => isObject(v) && isListOf(v.meals, isText) && isListOf(v.thumbs, (t) => t === null || isText(t));
/** A cart, as src/chefs-choice/chefs-choice.js reads it: heading, meals, thumbs, links by mpid, and snack_links if any. */
const isCart = (v) => isLines(v) && isText(v.heading) && isMapOf(v.links, isText) && (v.snack_links === undefined || isMapOf(v.snack_links, isText));

/**
 * § 4.2: whether `data` is what the page's script can show: an object whose `weeks` is a list of exactly one week, that
 * week's `carts` an object of carts and its `snacks`, if any, an object of lists, and `carted`, if any, true or false.
 * The keys the script reads, and no more: the content command's own checks (the link tool's rules) are not repeated.
 */
export function isWeek(data) {
  if (!isObject(data) || !Array.isArray(data.weeks) || data.weeks.length !== 1) return false;
  if (data.carted !== undefined && typeof data.carted !== "boolean") return false;
  const [week] = data.weeks;
  return isObject(week) && isMapOf(week.carts, isCart) && (week.snacks === undefined || isMapOf(week.snacks, isLines));
}

/** The bucket's week, or null for anything the page should not show (see isWeek); never throws. */
async function readWeek(env) {
  try {
    const object = await env.WEEK.get(WEEK_OBJECT);
    if (!object || object.size > MAX_WEEK_BYTES) return null;
    const data = JSON.parse(await object.text());
    return isWeek(data) ? data : null;
  } catch {
    return null;
  }
}

/** The request as the assets are asked it for the page: the same (its redirect mode too, so the assets' own 307 for
 *  /index.html is passed on, not followed), without the visitor's conditional headers. */
function unconditional(request) {
  const headers = new Headers(request.headers);
  for (const name of CONDITIONAL) headers.delete(name);
  return new Request(request, { headers });
}

/** The page's headers: the asset's, kept by no validator and asked for again every time (§ 4.4). */
function pageHeaders(headers) {
  const out = new Headers(headers);
  out.set("cache-control", PAGE_CACHE_CONTROL);
  out.delete("etag");
  out.delete("last-modified");
  return out;
}

/** § 4.2: the page, with the bucket's week in `#picks-data` when there is a valid one; any other answer of the assets
 *  (a redirect, a 404, a file that is not HTML) as they gave it. */
export async function servePage(request, env) {
  const asset = await env.ASSETS.fetch(unconditional(request));
  if (asset.status !== 200 || !/^text\/html\b/i.test(asset.headers.get("content-type") ?? "")) return asset;
  const week = await readWeek(env);
  const page = new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers: pageHeaders(asset.headers) });
  if (!week) return page;
  const text = scriptJson(week);
  return new HTMLRewriter()
    .on(PICKS_ELEMENT, {
      element(element) {
        element.setInnerContent(text, { html: true }); // raw: the text is JSON with every "<" escaped, as at build
      },
    })
    .transform(page);
}

const notFound = () => new Response(null, { status: 404 });

/** § 4.3: GET /week/<file>.jpg from the bucket, image/jpeg; anything else under /week/ a 404. */
export async function serveSheet(request, env) {
  const key = request.method === "GET" ? sheetKey(new URL(request.url).pathname) : null;
  if (!key) return notFound();
  let object;
  try {
    object = await env.WEEK.get(key, { onlyIf: request.headers });
  } catch {
    return notFound();
  }
  if (!object) return notFound();
  const headers = { "content-type": "image/jpeg", "cache-control": SHEET_CACHE_CONTROL, etag: object.httpEtag };
  // A precondition that held (If-None-Match naming this object) gives the object without its body: not modified.
  return object.body ? new Response(object.body, { headers }) : new Response(null, { status: 304, headers });
}

/** The three behaviours, and the assets for everything else: production's whole script, and the development Worker's
 *  last step once its own routes have not matched. */
export async function serveSite(request, env) {
  const { pathname } = new URL(request.url);
  if (pathname === BEACON_PATH && request.method === "POST") return serveBeacon(request, env);
  if (pathname.startsWith(SHEETS_PATH)) return serveSheet(request, env);
  if (request.method === "GET") return servePage(request, env);
  return env.ASSETS.fetch(request);
}

export default { fetch: serveSite };
