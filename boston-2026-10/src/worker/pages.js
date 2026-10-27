// The Worker-rendered pages (/confirm, /o). Since SPEC-save-offer-production.md § 10.3 in the site's look, as /privacy/ is:
// one head for every page, its <style> src/worker/page-style.json (the template's tokens and font faces, the fonts from
// the site's own /fonts/, then src/worker/page.css's rules; DERIVED by `npm run worker:style`, since a Worker cannot read
// the template), and Fit AF's logo first in one column, linking to /. Every pair it draws is in src/contrast-pairs.json
// ("build": "worker"). Marked DRAFT like the dev page while the wording is a draft (§ 3 item 2: the draft tag never in
// production, whose build refuses a draft wording; one rule for both Workers, which share this module and data/save.json).
// SPEC-analytics.md § 16 item 1 (2026-10-27): the offer page (/o/<code>) counts its own opening. Its column ends with its
// data (#offer-data: the page's kind and the save's event id, nothing else) and the plan page's own analytics script
// (src/worker/page-script.json, DERIVED by `npm run worker:script` from the build's slot), which reads the data and sends
// one `offer` to /a. Every other page carries neither.
import saveConfig from "../../data/save.json" with { type: "json" };
import pageScript from "./page-script.json" with { type: "json" };
import pageStyle from "./page-style.json" with { type: "json" };
import { scriptJson } from "./script-json.js";

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

/** Fit AF's logo, the file the build copies into both Workers' assets, linking to the site's page. */
const LOGO = '<a class="logo" href="/"><img src="/assets/fitaf-logo.png" alt="Fit AF" width="88" height="56"></a>';

/** The DRAFT line, while `wording_version` names a draft. */
const DRAFT_MARK = /draft/i.test(saveConfig.wording_version)
  ? `<p class="draft">DRAFT — not for use · wording ${esc(saveConfig.wording_version)}</p>\n`
  : "";

/** § 16 item 1: an offer page's analytics, its data then the script: `kind` and `qr` given to the script, never read by
 *  it from the page's address. */
const offerAnalytics = ({ kind, qr }) =>
  `<script type="application/json" id="offer-data">${scriptJson({ kind, qr })}</script>\n${pageScript.html}\n`;

/** `bodyHtml` is trusted markup built by the callers from escaped values. `offer` (an offer page's: { kind, qr }) adds its
 *  analytics at the end of the column. */
export function page(title, bodyHtml, { offer } = {}) {
  return (
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<meta name="robots" content="noindex">\n' +
    `<title>Fit AF — ${esc(title)}</title>\n<style>\n${pageStyle.css}\n</style>\n</head>\n<body>\n<main class="worker-page">\n` +
    DRAFT_MARK +
    `${LOGO}\n${bodyHtml}\n${offer ? offerAnalytics(offer) : ""}</main>\n</body>\n</html>\n`
  );
}

/** Every Worker page's headers: nothing cached, nothing indexed, no referrer carried off-site. */
export const PAGE_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
  "x-robots-tag": "noindex",
};

export const htmlResponse = (status, html) => new Response(html, { status, headers: PAGE_HEADERS });

export const TOO_MANY = page("Please wait", "<h1>Too many tries — please wait a minute and try again.</h1>");
