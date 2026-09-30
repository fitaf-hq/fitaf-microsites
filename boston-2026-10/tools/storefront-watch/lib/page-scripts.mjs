// SPEC-storefront-watch § 2.1: the page's script and module-preload URLs, in document order, and its entry bundle.
// A regular-expression reading of the served HTML (the store's page is plain markup; no parser dependency).

const COMMENT = /<!--[\s\S]*?-->/g;
/** An inline script's body is code, not markup: dropped so a string in it is never read as a tag. */
const SCRIPT_BODY = /(<script\b[^>]*>)[\s\S]*?(<\/script\s*>)/gi;
const TAG = /<(script|link)\b([^>]*)>/gi;
const ATTR = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const ENTITIES = { "&amp;": "&", "&quot;": '"', "&#39;": "'", "&lt;": "<", "&gt;": ">" };
/** The Angular build's entry: `main-<hash>.js`, loaded as a module. Also the form of the name `accept --release` takes. */
export const ENTRY_NAME = /^main-[A-Za-z0-9_-]+\.js$/;

const decode = (value) => value.replace(/&(amp|quot|#39|lt|gt);/g, (e) => ENTITIES[e]);

function attributes(text) {
  const out = {};
  for (const m of text.matchAll(ATTR)) out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? "");
  return out;
}

/** [{ url, kind: "script" | "modulepreload", module }] for every `<script src>` and `<link rel=modulepreload>`. */
export function pageScripts(html, pageUrl) {
  const markup = html.replace(COMMENT, "").replace(SCRIPT_BODY, "$1$2");
  const out = [];
  for (const m of markup.matchAll(TAG)) {
    const tag = m[1].toLowerCase();
    const a = attributes(m[2]);
    if (tag === "script" && a.src) {
      out.push({ url: new URL(a.src, pageUrl).href, kind: "script", module: a.type?.toLowerCase() === "module" });
    } else if (tag === "link" && a.href && (a.rel ?? "").toLowerCase().split(/\s+/).includes("modulepreload")) {
      out.push({ url: new URL(a.href, pageUrl).href, kind: "modulepreload", module: true });
    }
  }
  return out;
}

/** The one module script named `main-*.js`, or null if there is none or more than one (a change of shape). */
export function entryOf(scripts) {
  const found = scripts.filter(
    (s) => s.kind === "script" && s.module && ENTRY_NAME.test(new URL(s.url).pathname.split("/").pop()),
  );
  return found.length === 1 ? found[0].url : null;
}
