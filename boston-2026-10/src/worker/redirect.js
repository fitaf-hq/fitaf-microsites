// eatfitaf.com's home page as a way into the store (SPEC-the-redirect.md, 2026-10-27: the Advisor's pivot,
// ts=2026-10-27T15:12:46.204Z, "instant and server-side"). A MODE, set by one var, REDIRECT_TO (§ 1): while it is an
// absolute https URL with no fragment, a GET or HEAD of exactly "/" (any query) is a 302 to it carrying a marker (§ 2),
// and the Worker writes one `redirect` data point once it has answered (§ 3); absent, empty or anything else, the page
// is served exactly as before. site.js's serveSite decides which requests (after § 12's switch); this module holds the
// rules: the var's reading, the marker, the answer and the event, and serves nothing.
//
// ⛔ Never 301 or 308: a browser keeps them, and a phone that had scanned once would never reach the page after a switch
//    back. ⛔ The visitor's own query is never passed on (not `e`, not `via`, nothing): the marker alone.
// ⛔ The data point carries no query, path, referrer, IP or user agent (SPEC-analytics.md § 1's bar): its fields are a
//    random `s`, the QR id and `via` (each from a closed vocabulary), and what beacon.js's writeEvent adds to every event.
import { qrEvent } from "../qr-event.js";
import { QR_IDS, randomId, REDIRECT_EVENT, writeEvent } from "./beacon.js";

/** § 1 item 1: the var (fitaf-infra sets it on both Workers; wrangler.jsonc names it for local preview). */
export const REDIRECT_VAR = "REDIRECT_TO";
/** § 1 item 3: the one path redirected, whatever its query, and the two methods. */
export const HOME_PATH = "/";
export const REDIRECTED_METHODS = ["GET", "HEAD"];
/** § 1 item 5: found, never moved for good (not 301 or 308), and kept by no cache. */
const REDIRECT_STATUS = 302;
const REDIRECT_CACHE_CONTROL = "no-store";
/** § 2: the marker, three UTM parameters in this order; utm_source at this value is the Footer block's trigger. */
const SOURCE = "eatfitaf";
/** § 4: the offer page's links name the email by `via=email`. */
const VIA_PARAM = "via";
export const VIA_EMAIL = "email";
/** § 2's mediums: the offer email's link, a QR code's event, anything else. */
export const MEDIUMS = { email: "email", qr: "qr", direct: "direct" };
/** § 3: a user agent naming a program rather than a person (a crawler, a link preview, a scanner, a script): its redirect
 *  is not counted, since a redirect, unlike the page's beacon, needs no script to run. The one closed list, kept here.
 *  § 10 item 2 (2026-10-27): `bot` not preceded by `cu`, so a Cubot phone (`… Android 11; CUBOT X30 …`), a person, is
 *  counted, and every program the list names still is not (Googlebot, bingbot, Slackbot, Twitterbot, …). */
export const PROGRAM_AGENT = /(?<!cu)bot|crawl|spider|slurp|preview|facebookexternalhit|curl|wget|python|go-http-client|headless/i;

/** § 1 item 1: the var's URL when it parses as an absolute URL whose protocol is https: and that names no fragment (not
 *  even an empty "#"); null for anything else (absent, empty, http:, not a URL), and the page is served as before. */
export function redirectTarget(value) {
  if (typeof value !== "string" || value === "" || value.includes("#")) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  return url.protocol === "https:" ? url : null;
}

/** § 2: what a request's query says of its visitor: `qr`, the event its `e` names (one of data/events.json's ids, by the
 *  page's own rule, qrEvent; "" when none); `via`, "email" when the query has via=email (the offer page's links, § 4),
 *  else ""; and the medium: email, else qr for a known event, else direct. Nothing else of the query is read. */
export function markerOf(search) {
  const qr = qrEvent(search, QR_IDS);
  const via = new URLSearchParams(search).getAll(VIA_PARAM).includes(VIA_EMAIL) ? VIA_EMAIL : "";
  return { qr, via, medium: via ? MEDIUMS.email : qr ? MEDIUMS.qr : MEDIUMS.direct };
}

/** § 2: the var's URL with the marker appended ("?" when it has no query, else "&"): utm_source=eatfitaf, utm_medium,
 *  and utm_campaign the event id when the query names one. */
export function markedLocation(target, { medium, qr }) {
  const marker = [`utm_source=${SOURCE}`, `utm_medium=${medium}`, ...(qr ? [`utm_campaign=${encodeURIComponent(qr)}`] : [])].join("&");
  const href = target.href;
  return href + (target.search ? "&" : href.endsWith("?") ? "" : "?") + marker;
}

/** § 1 item 5: the answer: 302, the Location, no-store, no body, no cookie. */
export const redirectResponse = (location) => new Response(null, { status: REDIRECT_STATUS, headers: { location, "cache-control": REDIRECT_CACHE_CONTROL } });

/** § 3: whether a user agent names a program rather than a person. */
export const isProgram = (userAgent) => PROGRAM_AGENT.test(userAgent);

/** § 3: the `redirect` data point of this request, `s` the Worker's own (one request, one visit), `qr` and `via` as § 2;
 *  written through beacon.js's writeEvent (the salt, `v`, the country, the device). Never throws: § 1 item 6, an unbound
 *  binding or a failing write never stops the redirect, which has been answered before this runs. */
export async function recordRedirect(request, env, { qr, via }) {
  try {
    await writeEvent(request, env, { event: REDIRECT_EVENT, s: randomId(), qr, via });
  } catch {
    // SALTS or ANALYTICS unbound, or KV or the dataset failing: nothing written, the visitor already on the way.
  }
}
