// Shared by the *.test.mjs files. Not a test file itself.
import assert from "node:assert/strict";
import { loadJson, PLANS_PATH } from "../build.mjs";

/** PLANS_PATH may be overridden (e.g. to a mutant COPY) to show a case failing. */
export const plansPath = () => process.env.PLANS_PATH || PLANS_PATH;
export const loadPlans = () => loadJson(plansPath());

/** Every <a> in the page, with its attributes. */
export function anchors(html) {
  return [...html.matchAll(/<a\b([^>]*)>/g)].map((m) => {
    const attrs = Object.fromEntries(
      [...m[1].matchAll(/([a-z-]+)="([^"]*)"/g)].map((a) => [a[1], a[2].replace(/&amp;/g, "&")]),
    );
    return attrs;
  });
}
export const hrefs = (html) => anchors(html).filter((a) => a.href).map((a) => a.href);
export const mpidOf = (href) => Number(new URL(href).searchParams.get("mpid"));

/** T3's assertion, callable on any rendered page so T7 can run it against a mutant. */
export function assertSignature14Is29(html) {
  const cell = anchors(html).filter((a) => a["data-cell"] === "signature-14");
  assert.equal(cell.length, 1, "exactly one Signature 14 grid link");
  assert.equal(mpidOf(cell[0].href), 29, "Signature 14 must link to mpid=29 (not 28)");
}

/** A URL the page may load: a data: URI or a same-origin relative path (no scheme, no "//"). */
export const isSameOrigin = (url) => url.startsWith("data:") || !/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url);

/** Everything the page's markup and CSS load: <img src> and CSS url(). */
export function loadedUrls(html) {
  const imgs = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
  const css = [...html.matchAll(/url\(\s*["']?([^"')]+)/g)].map((m) => m[1]);
  return [...imgs, ...css];
}
