// The preview sites (SPEC-preview-sites.md § 3): the PREVIEW Worker's one entry, at https://preview.eatfitaf.com/. ⛔ It
// shares nothing with the live Workers (site.js, index.js) but the page's own module, script-json.js (the one escaping
// of #picks-data), and it never reads the store or the live buckets: its bucket is bound as PREVIEW, its assets are the
// preview build's (dist-preview/, `npm run build -- --env preview`), which hold no week.
//
//   GET /                           the deliveries with a preview (an object previews/<delivery>/picks-data.json in
//                                   PREVIEW), newest first, each a link
//   GET /<delivery>/                dist-preview's page (the assets' /) with previews/<delivery>/picks-data.json put into
//                                   its #picks-data, exactly as site.js puts the live week (SPEC-week-content § 4.2):
//                                   HTMLRewriter, escaped by scriptJson; no such object (or not one preview week of that
//                                   date in the shape the page reads): a 404 naming the date
//   GET /<delivery>/week/<f>.jpg    that week's photo sheet, previews/<delivery>/week/<f>.jpg, image/jpeg
//   /fonts/…, /assets/…             the page's static files, from the assets
//   anything else                   a 404 (a path is matched as it arrives, never decoded: a ".." or a segment that is not
//                                   a real YYYY-MM-DD date is a 404 and the bucket is not read for it)
//
// Freshness, as the live page's (SPEC-week-content § 7 item 3): a publish is what the next request gets. The page, the
// list and a 404 go out `Cache-Control: no-cache` with no ETag or Last-Modified, the page asked of the assets without
// the visitor's conditional headers; a sheet `no-cache` with the object's own ETag (a 304 while it is unchanged).
//
// The platform must run this script first for every path (assets `run_worker_first: true`): the assets hold the
// preview build's page at /, which must never be served bare, and the list is at /. That setting, the bucket and the
// custom domain are fitaf-infra's (its Amendment 1.9); nothing is deployed from here.
import { scriptJson } from "./script-json.js";

/** § 3: the bucket's keys (fitaf-infra's content job writes the preview content command's --out/previews/ under them). */
export const PREVIEWS_PREFIX = "previews/";
const DATA_FILE = "picks-data.json";
const SHEETS_SEGMENT = "week";
/** A delivery as the address names it: YYYY-MM-DD, a real calendar date. */
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** A sheet's file name: letters, digits, ".", "_" and "-", starting with a letter or digit, ending ".jpg" (as site.js). */
const SHEET_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.jpg$/;
/** The page's own files, from the assets (the page addresses them from the root: fonts, the logo, the carousel). */
const STATIC_PREFIXES = ["/fonts/", "/assets/"];
/** No week is near this (the week delivered 2026-10-18 is 31 KB); a larger object is not read into memory. */
const MAX_WEEK_BYTES = 1024 * 1024;
const PICKS_ELEMENT = "script#picks-data";
/** The request headers that could make the assets answer with less than the whole page (a 304, a 206, a 412). */
const CONDITIONAL = ["if-none-match", "if-modified-since", "if-match", "if-unmodified-since", "if-range", "range"];
export const CACHE_CONTROL = "no-cache";
const HTML = "text/html; charset=utf-8";

/** "YYYY-MM-DD" that is a real calendar date. */
export function isDate(text) {
  const m = DATE.exec(text);
  if (!m) return false;
  const day = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return day.toISOString().slice(0, 10) === text;
}

/**
 * What a path is, matched as it arrives: { kind: "list" } for "/", { kind: "page", delivery } for "/<date>/",
 * { kind: "sheet", delivery, key } for "/<date>/week/<file>.jpg", { kind: "asset" } for the page's static files, or null
 * (a 404) for anything else, a ".." anywhere included.
 */
export function route(pathname) {
  if (pathname.includes("..")) return null;
  if (pathname === "/") return { kind: "list" };
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return { kind: "asset" };
  const parts = pathname.split("/");
  if (parts[0] !== "" || !isDate(parts[1] ?? "")) return null;
  const delivery = parts[1];
  if (parts.length === 3 && parts[2] === "") return { kind: "page", delivery };
  if (parts.length === 4 && parts[2] === SHEETS_SEGMENT && SHEET_NAME.test(parts[3])) {
    return { kind: "sheet", delivery, key: `${PREVIEWS_PREFIX}${delivery}/${SHEETS_SEGMENT}/${parts[3]}` };
  }
  return null;
}

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string";
const isListOf = (v, item) => Array.isArray(v) && v.every(item);
const isMapOf = (v, item) => isObject(v) && Object.values(v).every(item);
/** A list the page's script fills (a cart's meals, a day count's snacks): its lines, and a tile style or null per line. */
const isLines = (v) => isObject(v) && isListOf(v.meals, isText) && isListOf(v.thumbs, (t) => t === null || isText(t));
/** A cart, as src/chefs-choice/chefs-choice.js reads it: heading, meals, thumbs, links by mpid, and snack_links if any. */
const isCart = (v) => isLines(v) && isText(v.heading) && isMapOf(v.links, isText) && (v.snack_links === undefined || isMapOf(v.snack_links, isText));

/**
 * Whether `data` is a preview of `delivery` the page can show: an object whose `weeks` is a list of exactly one week, of
 * that delivery, marked `preview: true` with `approved` true or false (the preview content command's marks: a live week's
 * content, which carries the store's links, is never served here), its `carts` an object of carts and its `snacks`, if
 * any, an object of lists, and `carted`, if any, true or false: the keys the page's two scripts read, and no more.
 */
export function isPreviewWeek(data, delivery) {
  if (!isObject(data) || !Array.isArray(data.weeks) || data.weeks.length !== 1) return false;
  if (data.carted !== undefined && typeof data.carted !== "boolean") return false;
  const [week] = data.weeks;
  if (!isObject(week) || week.delivery !== delivery || week.preview !== true || typeof week.approved !== "boolean") return false;
  return isMapOf(week.carts, isCart) && (week.snacks === undefined || isMapOf(week.snacks, isLines));
}

/** The preview of `delivery`, or null for anything the page should not show (see isPreviewWeek); never throws. */
async function readPreview(env, delivery) {
  try {
    const object = await env.PREVIEW.get(`${PREVIEWS_PREFIX}${delivery}/${DATA_FILE}`);
    if (!object || object.size > MAX_WEEK_BYTES) return null;
    const data = JSON.parse(await object.text());
    return isPreviewWeek(data, delivery) ? data : null;
  } catch {
    return null;
  }
}

/** Every delivery with a preview (its data object), newest first. */
async function deliveries(env) {
  const found = [];
  let cursor;
  do {
    const page = await env.PREVIEW.list({ prefix: PREVIEWS_PREFIX, ...(cursor ? { cursor } : {}) });
    for (const { key } of page.objects) {
      const parts = key.slice(PREVIEWS_PREFIX.length).split("/");
      if (parts.length === 2 && parts[1] === DATA_FILE && isDate(parts[0])) found.push(parts[0]);
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return found.sort().reverse();
}

/** A small page of the Worker's own (browser defaults: it draws no colour), `no-cache`. */
function htmlPage(status, title, body) {
  const html = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${title}</title>\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
  return new Response(html, { status, headers: { "content-type": HTML, "cache-control": CACHE_CONTROL } });
}

const notFound = () => new Response(null, { status: 404, headers: { "cache-control": CACHE_CONTROL } });

/** GET /: the deliveries with a preview, newest first, each a link to its page. A delivery is a validated date, so it
 *  needs no escaping. */
async function serveList(env) {
  let list;
  try {
    list = await deliveries(env);
  } catch {
    return htmlPage(503, "Previews", "<p>The previews cannot be listed just now.</p>");
  }
  const items = list.map((d) => `<li><a href="/${d}/">${d}</a></li>`).join("\n");
  return htmlPage(200, "Previews", `<h1>Previews</h1>\n${list.length ? `<ul>\n${items}\n</ul>` : "<p>No week has a preview.</p>"}`);
}

/** GET /<delivery>/: dist-preview's page with the delivery's preview in #picks-data; a 404 naming the date without one. */
async function servePage(request, env, delivery) {
  const week = await readPreview(env, delivery);
  if (!week) return htmlPage(404, "No preview", `<p>No preview of the week delivered ${delivery}.</p>\n<p><a href="/">All previews</a></p>`);
  const headers = new Headers(request.headers);
  for (const name of CONDITIONAL) headers.delete(name);
  const asset = await env.ASSETS.fetch(new Request(new URL("/", request.url), { method: "GET", headers, redirect: "manual" }));
  if (asset.status !== 200 || !/^text\/html\b/i.test(asset.headers.get("content-type") ?? "")) return asset;
  const out = new Headers(asset.headers);
  out.set("cache-control", CACHE_CONTROL);
  out.delete("etag");
  out.delete("last-modified");
  const page = new Response(asset.body, { status: 200, headers: out });
  const text = scriptJson(week);
  return new HTMLRewriter()
    .on(PICKS_ELEMENT, {
      element(element) {
        element.setInnerContent(text, { html: true }); // raw: the text is JSON with every "<" escaped, as at build
      },
    })
    .transform(page);
}

/** GET /<delivery>/week/<file>.jpg: the sheet, image/jpeg, `no-cache` with its ETag; absent, a 404. */
async function serveSheet(request, env, key) {
  let object;
  try {
    object = await env.PREVIEW.get(key, { onlyIf: request.headers });
  } catch {
    return notFound();
  }
  if (!object) return notFound();
  const headers = { "content-type": "image/jpeg", "cache-control": CACHE_CONTROL, etag: object.httpEtag };
  // A precondition that held (If-None-Match naming this object) gives the object without its body: not modified.
  return object.body ? new Response(object.body, { headers }) : new Response(null, { status: 304, headers });
}

/** The preview Worker: the list, a delivery's page and its sheets (GET only), the page's static files from the assets,
 *  and a 404 for everything else. */
export async function servePreview(request, env) {
  const target = route(new URL(request.url).pathname);
  if (target?.kind === "asset") return env.ASSETS.fetch(request);
  if (!target || request.method !== "GET") return notFound();
  if (target.kind === "list") return serveList(env);
  if (target.kind === "page") return servePage(request, env, target.delivery);
  return serveSheet(request, env, target.key);
}

export default { fetch: servePreview };
