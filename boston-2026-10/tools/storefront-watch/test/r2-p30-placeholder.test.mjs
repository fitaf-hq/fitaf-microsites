// P1–P3 (SPEC-rung2-progress-and-checkout § 30): the progress screen never jumps. Every slide reserves its photograph's
// box at its final size from its first frame, holding a placeholder (the Fit AF mark, the store's own logo as § 15.3
// reads it, on its white plate, centred on the screen's background) until a photograph is drawn, and keeping it when
// there is none; the empty carousel, before the first meal, shows the same placeholder in the same place. Headless Chrome
// on the synthetic store (127.0.0.1); the link carries a photo part written by the site's own link tool, whose sheet (a
// generated SVG, never a photograph) the page's request interception serves for the listed host, held or refused.
//   P1  a slide with no cell shows the placeholder box at the photograph's size: the same box as a slide whose cell is
//       drawn, and the same place as the empty carousel's placeholder (Screen · A's state).
//   P2  ⭐ a photograph arriving changes nothing: at every frame of a run whose sheet and logo both arrive late, the
//       title, the bar, the carousel and the step line in the same place, the shown slide's box the same, the screen's
//       scroll height the same.
//   P3  the sheet failing (BAD): every box as P1, and still nothing moves.
// Mutant (with its control, the shipped text passing the same cases): the box drawn only when the photograph loads —
// P1 and P2 fail.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { sleep } from "../lib/browser.mjs";
import { LOGO_PATH, MEALS, startStore } from "./browser-store.mjs";
import { browserFor, DONE, mutate, openDeep, shipped, skip } from "./r2-browser.mjs";

const HOST = "https://eatfitaf.com";
const CELL = 176;
const SHEET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="${CELL * 7}"><rect width="${CELL}" height="${CELL * 7}" fill="#e67e22"/></svg>`;
const MEALS7 = MEALS.slice(0, 7);
/** The third meal has no cell in the sheet (as a meal with no bound photograph). */
const NO_CELL = MEALS7[2];
const WIDTHS = [1280, 390];

let store;
let browser;
let site;
let photoPart;
before(async () => {
  if (skip) return;
  store = await startStore();
  browser = await browserFor();
  site = await shipped();
  // The photo part as the microsite's link tool writes it (§ 17.1), host code 0, from a manifest of the generated sheet.
  const cells = Object.fromEntries(MEALS7.map((name, i) => [name, { x: 0, y: CELL * i, w: CELL, h: CELL }]).filter(([name]) => name !== NO_CELL));
  const manifest = { base: "assets/photo-sheets/", chefs_choice: { "2026-10-04": { file: "p30.svg", width: CELL, height: CELL * 7, cells } } };
  const args = ["--mpid", "21", ...MEALS7.flatMap((n) => ["--item", `${n}:1`]), "--photos", "2026-10-04", "--host", "0"];
  const link = site.code.handoffLink(site.code.plans, site.code.payloadFromArgs(args, site.code.counts, manifest));
  photoPart = link.slice(link.indexOf("!"));
});
after(async () => {
  await browser?.close();
  await store?.close();
});

/** Serve the sheet (after `sheetMs`, or 404 when `fail`), hold the store's logo `logoMs`; the store's own requests pass. */
const serving = ({ sheetMs = 0, fail = false, logoMs = 0 } = {}) => async (page) => {
  await page.setRequestInterception(true);
  page.on("request", (r) => {
    const url = r.url();
    if (url.startsWith(`${HOST}/`)) {
      const answer = () => (fail ? r.respond({ status: 404, contentType: "text/plain", body: "not found" }) : r.respond({ status: 200, contentType: "image/svg+xml", body: SHEET_SVG }));
      return sheetMs ? setTimeout(answer, sheetMs) : answer();
    }
    if (!url.startsWith(store.origin)) return r.abort();
    if (logoMs && new URL(url).pathname === LOGO_PATH) return setTimeout(() => r.continue(), logoMs);
    return r.continue();
  });
};

/**
 * In the page (self-contained): the screen now. The empty carousel's placeholder and the shown slide's box, each as the
 * browser draws it (the element's box, and its ::before: the plate, its size and place, its mark); whether the shown
 * box holds a drawn photograph; and where the screen's parts are.
 */
function readScreen() {
  const s = document.getElementById("fitaf-screen");
  if (!s) return null;
  const px = (v) => Math.round(parseFloat(v));
  const top = (el) => (el ? Math.round(el.getBoundingClientRect().top * 10) / 10 : null);
  const drawn = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const b = getComputedStyle(el, "::before");
    return { box: [Math.round(r.width), Math.round(r.height), Math.round(r.top)], content: b.content, plate: [px(b.width), px(b.height), Math.round(r.top + parseFloat(b.top))], mark: b.backgroundImage, plateColour: b.backgroundColor };
  };
  const c = s.querySelector(".c");
  const on = c.querySelector(":scope > .on");
  const f = on?.querySelector(":scope > .f") ?? null;
  const img = f?.querySelector("img") ?? null;
  return {
    viewport: [innerWidth, innerHeight],
    slides: c.children.length,
    on: on?.querySelector("b")?.textContent ?? null,
    firstChild: on?.firstElementChild?.className ?? null,
    empty: c.children.length ? null : drawn(c),
    shown: drawn(f),
    photo: Boolean(img && img.complete && img.naturalWidth > 0),
    slideH: on ? Math.round(on.getBoundingClientRect().height) : null,
    logo: s.querySelector('img[alt="Fit AF"]')?.src ?? null,
    cH: Math.round(c.getBoundingClientRect().height * 10) / 10,
    h2: top(s.querySelector("h2")),
    bar: top(s.querySelector(".b")),
    c: top(c),
    p: top(s.querySelector('[role="status"]')),
  };
}

/** In every document: readScreen's reading at every frame while the screen is up. */
function recorder() {
  window.__p = [];
  const frame = () => {
    if (document.getElementById("fitaf-screen")) window.__p.push(window.__readScreen());
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
const recorderInit = `window.__readScreen = ${readScreen}; (${recorder})();`;

/** The box a slide's photograph takes: square, the slide's height, min(220px, 32vh). */
const side = (viewport) => Math.round(Math.min(220, 0.32 * viewport[1]));

/**
 * Open the link on the synthetic store at `width` and read the screen once it shows `k` slide(s) and its logo. Held by
 * the store, as the Storybook's Screen stories are: `k` 0, the store's Footer runs the block at 150 ms and the store draws
 * no card for 30 s (orderAfterMs), so the block keeps polling with the empty carousel up (Screen · A); `k` above 0, the
 * block pasted once the cards are drawn, and the store's timers stopped after `k` meals are counted (hangAfter k).
 */
async function held(text, k, { width = 1280, serve = {} } = {}) {
  store.set(k ? { hangAfter: k } : { footer: text, orderAfterMs: 30_000 });
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text, width, photoPart, onPage: serving(serve), skipCards: !k });
  try {
    const ready = await run.until((n) => {
      const s = document.getElementById("fitaf-screen");
      return s && s.querySelectorAll(".c > *").length === n && s.querySelector('img[alt="Fit AF"]') ? true : null;
    }, k);
    assert.ok(ready, `the screen held with ${k} slide(s) and its logo`);
    await sleep(700); // the shown slide's entrance (0.4 s) and its sheet
    return await run.page.evaluate(readScreen);
  } finally {
    await run.close();
  }
}

/** P1's check over `text` at `width`: Screen · A's placeholder, a cell's slide (meal 2), the slide with no cell (meal 3). */
async function p1Case(text, width) {
  const empty = await held(text, 0, { width });
  const cell = await held(text, 2, { width });
  const none = await held(text, 3, { width });
  const n = side(empty.viewport);
  const what = `${width}: ${JSON.stringify({ empty, cell, none })}`;
  // The empty carousel (no meal added yet): its placeholder, the plate holding the store's logo, on the screen's own
  // background, where a slide's box will be.
  assert.equal(empty.slides, 0, `fixture control: no slide yet ${what}`);
  assert.notEqual(empty.empty.content, "none", `the empty carousel shows the placeholder ${what}`);
  assert.ok(empty.empty.mark.includes(LOGO_PATH), `its mark is the store's own logo ${what}`);
  // The slide whose cell is drawn, and the slide with no cell: the same box, square at the slide's height, the box first.
  assert.equal(cell.on, MEALS7[1], `fixture control: meal 2 shown ${what}`);
  assert.ok(cell.photo, `fixture control: meal 2's cell drawn ${what}`);
  assert.equal(none.on, NO_CELL, `fixture control: meal 3 shown ${what}`);
  assert.equal(none.photo, false, `fixture control: meal 3 has no photograph ${what}`);
  assert.equal(none.firstChild, "f", `the slide with no cell: its box first ${what}`);
  assert.deepEqual(none.shown?.box, [n, n, cell.shown.box[2]], `its box the photograph's size, where the cell's slide has it ${what}`);
  assert.deepEqual(cell.shown.box, [n, n, cell.shown.box[2]], `the cell's box square at the slide's height ${what}`);
  assert.notEqual(none.shown.content, "none", `the placeholder in it ${what}`);
  assert.ok(none.shown.mark.includes(LOGO_PATH), `the mark the store's own logo ${what}`);
  assert.deepEqual(none.shown.plate, empty.empty.plate, `the placeholder where the empty carousel showed it ${what}`);
  for (const k of ["h2", "bar", "c", "p", "cH"]) assert.equal(none[k], empty[k], `${k} where it was before the first meal ${what}`);
  for (const k of ["h2", "bar", "c", "p", "cH"]) assert.equal(cell[k], empty[k], `${k} where it was before the first meal ${what}`);
}

test("P1: a slide with no cell shows the placeholder box at the photograph's size (the cell's box, Screen · A's place), both widths", { skip, timeout: 120_000 }, async () => {
  for (const width of WIDTHS) await p1Case(site.text, width);
});

/**
 * A whole run, recorded at every frame; the frames and the verdict. The block is the store's Footer (placed at 150 ms,
 * before the cards and before the page's load event, as on the live store), so the screen comes up before a late logo.
 */
async function recorded(text, serve, width) {
  store.set({ footer: text });
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text, width, photoPart, onPage: serving(serve), init: recorderInit });
  try {
    const verdict = await run.verdict(30_000);
    return { verdict, frames: await run.page.evaluate(() => window.__p ?? []) };
  } finally {
    await run.close();
  }
}

/** Nothing moved: every frame with a slide shown has one box, and every frame the parts in one place. */
function assertStill(frames, what) {
  const shown = frames.filter((f) => f.on);
  assert.ok(shown.length > 10, `fixture control: frames recorded with a slide shown (${shown.length}) ${what}`);
  const n = side(frames[0].viewport);
  const boxes = new Set(shown.map((f) => JSON.stringify(f.shown?.box ?? null)));
  assert.equal(boxes.size, 1, `one box at every frame: ${[...boxes]} ${what}`);
  const box = JSON.parse([...boxes][0]);
  assert.ok(box && box[0] === n && box[1] === n, `the box the photograph's size, ${n} square: ${box} ${what}`);
  for (const k of ["h2", "bar", "c", "p", "cH"]) {
    const at = new Set(frames.map((f) => f[k]));
    assert.equal(at.size, 1, `${k} in one place at every frame (${[...at]}) ${what}`);
  }
  // Each slide's own height, at every frame it is shown, whether its photograph has arrived or not.
  for (const name of new Set(shown.map((f) => f.on))) {
    const heights = new Set(shown.filter((f) => f.on === name).map((f) => f.slideH));
    assert.equal(heights.size, 1, `${name}: one height at every frame (${[...heights]}) ${what}`);
  }
}

/** P2's check over `text` at `width`: the sheet held 1.2 s, the store's logo 1.5 s. */
async function p2Case(text, width) {
  const r = await recorded(text, { sheetMs: 1_200, logoMs: 1_500 }, width);
  const what = `(${width})`;
  assert.equal(r.verdict, DONE, what);
  const arrived = r.frames.findIndex((f) => f.photo);
  assert.ok(arrived > 0 && r.frames.slice(0, arrived).some((f) => f.on && !f.photo), `fixture control: a slide shown before its photograph arrived, then with it ${what}`);
  assert.ok(r.frames.some((f) => !f.logo) && r.frames.some((f) => f.logo), `fixture control: the logo arrived after the screen came up ${what}`);
  assertStill(r.frames, what);
}

test("P2: a photograph (and the logo) arriving late changes no slide's box and moves nothing on the screen, both widths", { skip, timeout: 120_000 }, async () => {
  for (const width of WIDTHS) await p2Case(site.text, width);
});

test("P3: the sheet failing (BAD) — every slide's box as P1, the placeholder kept, nothing moves", { skip, timeout: 120_000 }, async () => {
  for (const width of WIDTHS) {
    const r = await recorded(site.text, { fail: true }, width);
    const what = `(${width})`;
    assert.equal(r.verdict, DONE, what);
    assert.ok(r.frames.every((f) => !f.photo), `fixture control: no photograph drawn ${what}`);
    assertStill(r.frames, what);
    const names = new Set(r.frames.filter((f) => f.on).map((f) => f.on));
    assert.ok(names.size >= 3, `several slides seen (${[...names]}) ${what}`);
    assert.ok(r.frames.filter((f) => f.on).every((f) => f.shown.content !== "none" && f.shown.mark.includes(LOGO_PATH)), `every box holds the placeholder ${what}`);
  }
});

/** The mutant: the box's class given only when the sheet's img loads (no box before, none for a slide with no cell). */
const boxOnLoad = (text) =>
  mutate(
    mutate(text, '(f = el.appendChild(d.createElement("div"))).className = "f";', 'f = el.appendChild(d.createElement("div"));'),
    "g.onerror = function () { BAD = 1; ui(",
    'g.onload = function () { f.className = "f"; }; g.onerror = function () { BAD = 1; ui(',
  );

test("P1 (mutant): the box drawn only when the photograph loads — P1 fails", { skip, timeout: 120_000 }, async () => {
  await assert.rejects(p1Case(boxOnLoad(site.text), 1280), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    return true;
  });
});

test("P2 (mutant): the box drawn only when the photograph loads — P2 fails", { skip, timeout: 120_000 }, async () => {
  await assert.rejects(p2Case(boxOnLoad(site.text), 1280), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    return true;
  });
});
