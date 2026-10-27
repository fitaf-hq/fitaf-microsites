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
// 4. SPEC-save-offer-production.md § 4 item 2: with data/save.json's `production` TRUE, this Worker is the development
//    Worker's handler, imported, not copied (index.js: rung 4's routes, POST /api/save, /confirm/<token>, /o/<code>, then
//    the three behaviours above; and its scheduled handler, the cron's send, lapse and purge), with production's bindings
//    and vars (wrangler.jsonc's top level, mirrored by fitaf-infra). With `production` FALSE it is the three behaviours
//    above and nothing else, as before: `{ fetch: serveSite }`, no scheduled handler (SP3 compares it with the base's).
//    index.js imports serveSite from here, and this module imports index.js's default: the two are read only when a
//    request or the cron arrives, never while the modules load, so either can be the entry.
// 5. A tester's browser sends no analytics (SPEC-analytics.md § 12, the Advisor, 2026-10-25), on both Workers, since
//    both reach the page through serveSite: a GET of the page's routes whose query names `no-tracking` (any value, or
//    none) is a 302 to the same URL without it, every other parameter kept as written and in order, setting a
//    first-party cookie the page's script cannot read (NO_TRACKING_SET); `tracking` likewise clears it, and with both,
//    cleared. POST /a carrying the cookie at "1" is the 204 every beacon gets, and nothing else: no data point, the salt
//    neither read nor written. The page is unchanged; nothing else reads the cookie (the save step, /o, /confirm and the
//    cron are index.js's, before serveSite).
// 6. The home page as a way into the store (SPEC-the-redirect.md, the Advisor's pivot, 2026-10-27), on both Workers: while
//    the var REDIRECT_TO is an https URL with no fragment, a GET or HEAD of exactly "/" (any query; after 5.'s switch) is
//    a 302 to it with the marker (src/worker/redirect.js), and a counted one (not 5.'s cookie at "1", not a HEAD, not a
//    program's user agent) writes one `redirect` data point after the answer (ctx.waitUntil). Every other path, and "/"
//    with the var absent or not such a URL, is answered as before: /index.html, the event pages, /assets/ above all.
//
// Freshness (§ 4.4): a write to the bucket is what the next request gets. The page is asked of the assets WITHOUT the
// visitor's conditional headers (so the assets never answer 304 for a page whose week may have changed under the same
// asset), and goes out with `Cache-Control: no-cache` and no ETag or Last-Modified (the asset's would name the asset, not
// this page): a browser keeps it but asks again every time, and gets the page whole. A sheet goes out with
// `Cache-Control: no-cache` and the object's own ETag, so a browser revalidates every time and gets a 304 while the
// object is unchanged; a sheet re-written under the same name is seen at the next request.
import saveConfig from "../../data/save.json" with { type: "json" };
import development from "./index.js";
import { BEACON_PATH, serveBeacon } from "./beacon.js";
import { HOME_PATH, isProgram, markedLocation, markerOf, recordRedirect, REDIRECT_VAR, REDIRECTED_METHODS, redirectResponse, redirectTarget } from "./redirect.js";
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

/** SPEC-analytics.md § 12: the cookie a tester's browser carries, and the parameters that set and clear it. */
export const NO_TRACKING_COOKIE = "fitaf_no_tracking";
const SET_PARAM = "no-tracking";
const CLEAR_PARAM = "tracking";
/** § 12 item 1: the cookie is kept a year (365 days, in seconds). */
const NO_TRACKING_MAX_AGE_S = 31_536_000;
const noTrackingCookie = (value, maxAgeS) => `${NO_TRACKING_COOKIE}=${value}; Path=/; Max-Age=${maxAgeS}; Secure; HttpOnly; SameSite=Lax`;
export const NO_TRACKING_SET = noTrackingCookie("1", NO_TRACKING_MAX_AGE_S);
export const NO_TRACKING_CLEAR = noTrackingCookie("", 0);

/**
 * § 12 items 1–2: the cookie a page request's query asks for (NO_TRACKING_CLEAR when it names `tracking`, whatever else
 * it names: off wins; NO_TRACKING_SET when it names `no-tracking`; null when neither), and the query without either,
 * every other parameter as written and in order ("" when none is left). A parameter's name is what precedes its "=",
 * decoded as URLSearchParams decodes it; its value, if any, is not read.
 */
export function trackingSwitch(search) {
  let set = false;
  let clear = false;
  const kept = [];
  for (const part of search.replace(/^\?/, "").split("&")) {
    const [name] = part ? new URLSearchParams(part).keys() : [];
    if (name === SET_PARAM) set = true;
    else if (name === CLEAR_PARAM) clear = true;
    else if (part) kept.push(part);
  }
  return { cookie: clear ? NO_TRACKING_CLEAR : set ? NO_TRACKING_SET : null, search: kept.length ? `?${kept.join("&")}` : "" };
}

/** § 12 items 1–2: a GET naming either parameter, answered with a 302 to the same URL with the query without them (the
 *  fragment is never sent, and a browser keeps it across a Location that names none) and the cookie it asks for;
 *  null for any other request. The Location is absolute, the request's own origin joined to its path as text: a path
 *  beginning "//", written alone, would name another host. */
function switchTracking(request) {
  const url = new URL(request.url);
  const { cookie, search } = trackingSwitch(url.search);
  if (!cookie) return null;
  return new Response(null, { status: 302, headers: { location: url.origin + url.pathname + search, "set-cookie": cookie } });
}

/** § 12 item 3: whether the request carries the cookie at "1" (any other value, or none, is not). */
export function carriesNoTracking(request) {
  const sent = `${NO_TRACKING_COOKIE}=1`;
  return (request.headers.get("cookie") ?? "").split(";").some((pair) => pair.trim() === sent);
}

/** § 12 item 3: the 204 serveBeacon answers every beacon with, for one that is not counted: nothing read or written. */
const uncounted = () => new Response(null, { status: 204 });

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

/** SPEC-the-redirect.md (6. above): a GET or HEAD of exactly "/" while REDIRECT_TO is an https URL without a fragment is
 *  the 302 to it with the marker; a counted one's `redirect` data point is written after the answer (ctx.waitUntil), so
 *  the visitor never waits on the salt or the dataset. null for any other request, or the var absent or anything else:
 *  the page, as before. */
function redirectHome(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname !== HOME_PATH || !REDIRECTED_METHODS.includes(request.method)) return null;
  const target = redirectTarget(env[REDIRECT_VAR]);
  if (!target) return null;
  const marker = markerOf(url.search);
  if (request.method === "GET" && !carriesNoTracking(request) && !isProgram(request.headers.get("user-agent") ?? "")) {
    const writing = recordRedirect(request, env, marker);
    ctx?.waitUntil(writing);
  }
  return redirectResponse(markedLocation(target, marker));
}

/** The three behaviours (with § 12's switch, 5. above, and the home page's redirect, 6.), and the assets for everything
 *  else: production's whole script, and the development Worker's last step once its own routes have not matched. */
export async function serveSite(request, env, ctx) {
  const { pathname } = new URL(request.url);
  if (pathname === BEACON_PATH && request.method === "POST") return carriesNoTracking(request) ? uncounted() : serveBeacon(request, env);
  if (pathname.startsWith(SHEETS_PATH)) return serveSheet(request, env);
  if (request.method === "GET") return switchTracking(request) ?? redirectHome(request, env, ctx) ?? servePage(request, env);
  return redirectHome(request, env, ctx) ?? env.ASSETS.fetch(request);
}

/** § 4 item 2: production with the save step, the development Worker's own handler (rung 4's routes and the cron). */
const withSaveStep = {
  fetch: (request, env, ctx) => development.fetch(request, env, ctx),
  scheduled: (controller, env, ctx) => development.scheduled(controller, env, ctx),
};

export default saveConfig.production === true ? withSaveStep : { fetch: serveSite };
