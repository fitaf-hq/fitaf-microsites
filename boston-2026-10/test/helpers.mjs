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

/** Everything the page's markup and CSS load: <img src>, <iframe src> (since SPEC-why-fit-af.md § 2 item 2, the /why/
 *  page's frame) and CSS url(). */
export function loadedUrls(html) {
  const imgs = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
  const frames = [...html.matchAll(/<iframe\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
  const css = [...html.matchAll(/url\(\s*["']?([^"')]+)/g)].map((m) => m[1]);
  return [...imgs, ...frames, ...css];
}

/** T5 amended by SPEC-why-fit-af.md § 2 items 2 and 4 (as SPEC-analytics § 4 amended it for one sendBeacon): the page holds
 *  exactly one <iframe>, the /why/ page's frame, its `src` same-origin (`why/` after the page's asset prefix, which
 *  loadedUrls reads, so T5's same-origin check covers it); and one link that is not an order link, the footer's no-script
 *  link to the same page. `prefix` is the page's asset prefix ("" production, "/" development). */
export const whyHref = (prefix = "") => `${prefix}why/`;
export function assertOneWhyFrame(html, where, prefix = "") {
  const frames = [...html.matchAll(/<iframe\b[^>]*>/gi)].map((m) => m[0]);
  assert.equal(frames.length, 1, `${where}: exactly one <iframe>, the /why/ frame (found ${frames.length})`);
  assert.match(frames[0], new RegExp(`\\bsrc="${whyHref(prefix)}"`), `${where}: its src is the /why/ page by the asset prefix`);
}
