// The Worker-rendered pages (/confirm, /o): minimal HTML in the browser's own colours — no colour is
// drawn here, so there is no pair for `npm run contrast` to measure. Marked DRAFT like the dev page.
import saveConfig from "../../data/save.json" with { type: "json" };

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

const STYLE =
  "body{margin:0 auto;max-width:36rem;padding:24px 16px;font:16px/1.55 system-ui,-apple-system,sans-serif}" +
  "h1{font-size:1.5rem;line-height:1.25}button{font:inherit;min-height:48px;padding:10px 18px;margin:0 8px 8px 0}" +
  ".draft{font-size:.8rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase}";

/** `bodyHtml` is trusted markup built by the callers from escaped values. */
export function page(title, bodyHtml) {
  return (
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<meta name="robots" content="noindex">\n' +
    `<title>Fit AF — ${esc(title)}</title>\n<style>${STYLE}</style>\n</head>\n<body>\n` +
    `<p class="draft">DRAFT — not for use · wording ${esc(saveConfig.wording_version)}</p>\n` +
    `${bodyHtml}\n</body>\n</html>\n`
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
