// Shared by r2-72 … r2-76 (SPEC-rung2-progress-and-checkout § 17: the screen shows Fit AF's own photographs, carried by
// the link). Not a test file itself. The links here are written by the TEST's own encoder of the photo part (below), as
// r2-harness.mjs writes the meal part with refKey, so a block case never depends on the link tool under test; R2-72
// checks that the tool writes the same text. The week is the FIXTURE's: test/fixtures/picks/2026-10-04.json's 7-menu
// (five invented meals, 7 in all, mpid 21's count) and test/fixtures/photo-sheets/photo-sheets.json (a generated sheet,
// 24 x 72, three cells; two of the five meals have none). linkedom loads nothing, so a card's image is given the state a
// browser would report (R2-52's way), and "a request" is an img the block gives a src.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { addCard, fakeWindow, fragmentFor, LOG_PREFIX, orderPage, run } from "./r2-harness.mjs";

/** § 17.1's fixed list, as the contract names it: the production site, then the test address (README, "Dev URL"). */
export const HOSTS = ["https://eatfitaf.com", "https://fitaf-microsites-dev.fitaf-microsite-boston-2026-10.workers.dev"];
export const PHOTOS = JSON.parse(await readFile(join(ROOT, "test", "fixtures", "photo-sheets", "photo-sheets.json"), "utf8"));
export const PICKS = JSON.parse(await readFile(join(ROOT, "test", "fixtures", "picks", "2026-10-04.json"), "utf8"));
export const DELIVERY = "2026-10-04";
export const SHEET = PHOTOS.chefs_choice[DELIVERY];
/** The week's 7-menu: [{ name, qty }], 7 meals of mpid 21. */
export const MENU = PICKS.menus["7"];
export const NAMES = MENU.map((m) => m.name);
export const PIXEL = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"><rect width="4" height="3" fill="#48aeee"/></svg>')}`;

export const DONE = `${LOG_PREFIX} done: /checkout`;
export const WITH_CELL = NAMES.filter((n) => SHEET.cells[n]);
export const NO_CELL = NAMES.filter((n) => !SHEET.cells[n]);

/** The sheet's URL on host `code`: the host, then the manifest's base and file. */
export const sheetUrl = (code = 0) => `${HOSTS[code]}/${PHOTOS.base}${SHEET.file}`;

/**
 * The photo part as this build encodes it (§ 18): after the meal part, "!"-separated, the host's code (its index in the
 * block's list), the sheet's path on it (from its first "/"), the sheet's width in base 36, then one cell per meal in the link's order,
 * "x,y,w,h" in base 36, or empty for a meal with no cell. `fields` overrides any of them (a forged host, say).
 */
export function photoText({ host = 0, path = `/${PHOTOS.base}${SHEET.file}`, width = SHEET.width, cells = NAMES.map((n) => SHEET.cells[n] ?? null) } = {}) {
  const cell = (c) => (c ? [c.x, c.y, c.w, c.h].map((n) => n.toString(36)).join(",") : "");
  return ["", host, path, typeof width === "number" ? width.toString(36) : width, ...cells.map(cell)].join("!");
}

/** The test's own reader of a link's photo part: null when it has none. */
export function readPhotoPart(href) {
  const fragment = new URL(href).hash.slice("#fitaf=".length);
  const [, ...fields] = fragment.split("!");
  if (!fields.length) return null;
  const [host, path, width, ...cells] = fields;
  const cell = (c) => {
    if (!c) return null;
    const [x, y, w, h] = c.split(",").map((n) => parseInt(n, 36));
    return { x, y, w, h };
  };
  return { host: Number(host), path, width: parseInt(width, 36), cells: cells.map(cell) };
}

/** The fragment of the week's 7-menu: its meal part (r2-harness's), then `photos` (a photo part, or "" for none). */
export const weekFragment = (photos = photoText()) => fragmentFor({ items: MENU }) + photos;

/** Give a card an img in the state a browser would report (R2-52's helper). */
export function cardPhoto(document, name, { complete = false, naturalWidth = 0, currentSrc = "" } = {}) {
  const card = [...document.querySelectorAll("app-product-card")].find(
    (c) => c.querySelector(".product__content-title").textContent.replace(/\s+/g, " ").trim() === name,
  );
  const img = document.createElement("img");
  img.setAttribute("alt", "");
  Object.defineProperties(img, { complete: { value: complete }, naturalWidth: { value: naturalWidth }, currentSrc: { value: currentSrc } });
  card.prepend(img);
  return img;
}

/** The synthetic order page holding the week's cards, each card's image in `state(name)`'s state (default: never loads). */
export async function weekPage(state = () => ({})) {
  const page = await orderPage();
  for (const name of NAMES) addCard(page.document, name);
  for (const name of NAMES) cardPhoto(page.document, name, state(name));
  return page;
}

const styleOf = (el, prop) => {
  const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(el?.getAttribute("style") ?? "");
  return m ? m[1].trim() : null;
};
const round = (n) => (n === null || Number.isNaN(n) ? null : Math.round(n * 1000) / 1000 || 0); // -0 is 0

/**
 * A slide's photograph as the visitor would see it: `sheet`, the window it shows onto a sheet of a listed host (the
 * img's src, its box's aspect ratio, and the img's width, left and top as percentages of that box), or null; and
 * `card`, the src of any other img in the slide (today's rule: the card's loaded photo), or null.
 */
export function slidePhoto(slide) {
  const imgs = [...slide.querySelectorAll("img")];
  const sheet = imgs.find((i) => HOSTS.some((h) => (i.getAttribute("src") ?? "").startsWith(`${h}/`)));
  const card = imgs.find((i) => i !== sheet);
  const box = sheet?.parentElement;
  return {
    sheet: sheet
      ? {
          src: sheet.getAttribute("src"),
          ratio: round(parseFloat(styleOf(box, "aspect-ratio"))),
          width: round(parseFloat(styleOf(sheet, "width"))),
          left: round(parseFloat(styleOf(sheet, "left"))),
          top: round(parseFloat(styleOf(sheet, "top"))),
        }
      : null,
    card: card ? card.getAttribute("src") : null,
  };
}

/** What § 17.2 says a slide shows for `name`: its cell, at the slide's size (the cell's ratio), the cell's pixels only. */
export function expectedWindow(name, code = 0) {
  const c = SHEET.cells[name];
  return { src: sheetUrl(code), ratio: round(c.w / c.h), width: round((SHEET.width / c.w) * 100), left: round((-c.x / c.w) * 100), top: round((-c.y / c.h) * 100) };
}

const nameOf = (slide) => slide.querySelector("b")?.textContent.replace(/\s+/g, " ").trim() ?? null;

/**
 * Run `text` on `page` with `fragment`, stepping the timers one at a time. Returns: `first`, each slide as it was at the
 * first step it was seen (the step of its meal's first press: the slide is made there); `last`, each slide as it was the
 * last time the screen was seen; `srcs`, the src of every img the block made (a request, in a browser; a card's own
 * images are not the block's); and the window `h`. `onStep({ page, h, made })` runs after the text starts and after
 * every step (a test fires a browser's event there).
 */
export async function observe(text, page, fragment, { onStep = () => {} } = {}) {
  const doc = page.document;
  const made = [];
  const createElement = doc.createElement.bind(doc);
  doc.createElement = (tag, ...rest) => {
    const el = createElement(tag, ...rest);
    if (String(tag).toLowerCase() === "img") made.push(el);
    return el;
  };
  const h = fakeWindow({ fragment, page });
  const first = new Map();
  let last = [];
  const look = () => {
    const slides = [...(doc.querySelector("#fitaf-screen .c")?.children ?? [])];
    if (!slides.length) return;
    last = slides.map((s) => ({ name: nameOf(s), ...slidePhoto(s) }));
    for (const s of last) if (!first.has(s.name)) first.set(s.name, s);
  };
  run(text, h.window);
  look();
  onStep({ page, h, made });
  for (let n = 0; h.timers.step(); n++) {
    assert.ok(n < 2000, "timers never settle");
    look();
    onStep({ page, h, made });
    look();
  }
  return { h, first, last, srcs: made.map((i) => i.getAttribute("src")).filter(Boolean), made };
}

/** R2-73's case over `text`: returns what it saw, after asserting the whole of R2-73 (a mutant is run through it). */
export async function slideAtFirstPress(text, code = 0) {
  const page = await weekPage(); // every card's image never loads
  const seen = await observe(text, page, weekFragment(photoText({ host: code })));
  assert.ok(seen.h.info.includes(DONE), JSON.stringify(seen.h.info));
  for (const name of WITH_CELL) {
    assert.deepEqual(seen.first.get(name)?.sheet, expectedWindow(name, code), `${name}: its cell at its first press`);
  }
  for (const name of NO_CELL) assert.deepEqual(seen.first.get(name), { name, sheet: null, card: null }, `${name}: no cell, the name alone`);
  assert.ok(seen.srcs.length > 0 && seen.srcs.every((s) => s === sheetUrl(code)), `only the sheet is requested: ${seen.srcs}`);
  return seen;
}

/** R2-75's case over `text`, asserting the whole of R2-75 (a mutant is run through it). */
export async function unknownHost(text) {
  const forged = ["7", "9", "https://evil.example", "evil.example", "x", "-1", "constructor", ""];
  for (const host of forged) {
    const page = await weekPage();
    const seen = await observe(text, page, weekFragment(photoText({ host })));
    assert.ok(seen.h.info.includes(DONE), `${host}: the fill as ever: ${JSON.stringify(seen.h.info)}`);
    assert.deepEqual(seen.srcs, [], `host ${JSON.stringify(host)}: no request at all`);
    assert.deepEqual(seen.last, NAMES.map((name) => ({ name, sheet: null, card: null })), `host ${JSON.stringify(host)}: today's slides`);
  }
}
