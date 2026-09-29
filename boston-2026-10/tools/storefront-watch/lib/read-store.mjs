// Reading the store's public files, shared by the watch (§ 2, F1) and by accept (§ 5). Files are named as paths
// relative to the store's origin ("main-FEK5K7ML.js"); a URL on another origin keeps its full form, and is refused.
import { createHash } from "node:crypto";
import { bundleImports } from "./bundle-imports.mjs";
import { entryOf, pageScripts } from "./page-scripts.mjs";

const PARALLEL = 8;

export const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

export function storeName(url, origin) {
  const u = new URL(url);
  return u.origin === origin ? u.pathname.replace(/^\//, "") + u.search : u.href;
}

/**
 * § 2.1–2.2, two requests: the page, then its entry. Scripts on other origins are listed and refused, never fetched.
 * Returns the names the baseline compares (`html` in document order, `imports` sorted) and the entry's text.
 */
export async function readEntry({ fetcher, page }) {
  const name = (url) => storeName(url, fetcher.origin);
  const html = await fetcher.get(page);
  const scripts = pageScripts(html.text, html.url);
  for (const s of scripts) if (!fetcher.isStore(s.url)) fetcher.refuse(s.url);
  const entryUrl = entryOf(scripts.filter((s) => fetcher.isStore(s.url)));
  let entryText = null;
  let imports = [];
  if (entryUrl) {
    entryText = (await fetcher.get(entryUrl)).text;
    imports = bundleImports(entryText, entryUrl);
    for (const url of imports) if (!fetcher.isStore(url)) fetcher.refuse(url);
  }
  return {
    entryUrl,
    entryText,
    live: { html: scripts.map((s) => name(s.url)), entry: entryUrl && name(entryUrl), imports: imports.map(name).sort() },
  };
}

/**
 * F1: every JS file reachable from the entry, statically or dynamically, each fetched once (the entry's text is
 * reused). Returns Map(name -> text). An import on another origin is refused and not followed.
 */
export async function readRelease({ fetcher, entryUrl, entryText }) {
  const texts = new Map();
  const seen = new Set([entryUrl]);
  const queue = [entryUrl];
  while (queue.length) {
    const batch = queue.splice(0, PARALLEL);
    const got = await Promise.all(
      batch.map(async (url) => [url, url === entryUrl && entryText !== null ? entryText : (await fetcher.get(url)).text]),
    );
    for (const [url, text] of got) {
      texts.set(storeName(url, fetcher.origin), text);
      for (const dep of bundleImports(text, url)) {
        if (seen.has(dep)) continue;
        seen.add(dep);
        if (fetcher.isStore(dep)) queue.push(dep);
        else fetcher.refuse(dep);
      }
    }
  }
  return new Map([...texts].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** name -> SHA-256, in name order. */
export const fileHashes = (texts) => Object.fromEntries([...texts].map(([name, text]) => [name, sha256(text)]));
