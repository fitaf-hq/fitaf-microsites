// P6: the slideshow. 3–5 photo slides, each with one line from the data, then a closing slide with the offer
// and the QR code; arrow keys and clicks move between them. The page's own script is run in a Node `vm`
// over a stand-in for the few DOM calls it makes, the way page-sim.mjs runs the microsite's.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import vm from "node:vm";
import { loadInputs, MOCKUPS_DIR, renderMockups } from "../mockups/build-mockups.mjs";
import { elements, hasClass, pieceRuns } from "./mockup-html.mjs";

const html = renderMockups(await loadInputs({ photosDir: join(MOCKUPS_DIR, "no-such-folder") })).slideshow;
const script = await readFile(join(MOCKUPS_DIR, "slideshow.js"), "utf8");
const SLIDE_OPEN = /<section\b[^>]*\bclass="slide\b[^"]*"[^>]*>/g;

function classList() {
  const set = new Set();
  return {
    set,
    add: (c) => set.add(c),
    remove: (c) => set.delete(c),
    contains: (c) => set.has(c),
    toggle(c, force) {
      const on = force ?? !set.has(c);
      if (on) set.add(c);
      else set.delete(c);
      return on;
    },
  };
}

/** Run slideshow.js over `n` slides; return the controls a test needs. */
function run(n, { hash = "", width = 1600 } = {}) {
  const node = (sel) => ({ sel, hidden: false, classList: classList(), attrs: {}, setAttribute(k, v) { this.attrs[k] = String(v); }, closest: () => null });
  const slides = Array.from({ length: n }, () => node(".slide"));
  const legendHit = { closest: (sel) => (sel.includes(".legend") ? {} : null) };
  const boxListeners = {};
  const filesBox = { checked: false, addEventListener: (type, fn) => ((boxListeners[type] ??= []).push(fn)) };
  const listeners = {};
  const location = { hash };
  const body = { classList: classList() };
  const document = {
    body,
    documentElement: { requestFullscreen: () => Promise.resolve(), style: { setProperty() {} } },
    fullscreenElement: null,
    querySelectorAll: (sel) => (sel === ".slide" ? slides : []),
    querySelector: (sel) => (sel === ".files-toggle input" ? filesBox : null),
  };
  const window = {
    document,
    location,
    innerWidth: width,
    history: { replaceState: (_s, _t, url) => (location.hash = url) },
    addEventListener: (type, fn) => ((listeners[type] ??= []).push(fn)),
    // SPEC-slideshow.md § 1 item 3: the slideshow advances on its own; here its clock never runs (SS-3 runs it).
    setTimeout: () => 0,
    clearTimeout: () => {},
  };
  window.window = window;
  vm.runInNewContext(script, window);
  const fire = (type, event) => {
    const e = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...event };
    for (const fn of listeners[type] ?? []) fn(e);
    return e;
  };
  return {
    // Updated (SPEC-slideshow.md § 1 item 3): a slide is shown by its `on` class, so two can be drawn during the fade.
    shown: () => slides.map((s, i) => (s.classList.contains("on") ? i : -1)).filter((i) => i >= 0),
    key: (key, mods = {}) => fire("keydown", { key, ...mods }),
    click: (clientX, target = { closest: () => null }) => fire("click", { clientX, target }),
    clickLegend: () => fire("click", { clientX: 1500, target: legendHit }),
    body,
    location,
    filesBox,
    tick: () => { filesBox.checked = !filesBox.checked; for (const fn of boxListeners.change ?? []) fn({}); },
  };
}

test("P6: 3–5 photo slides, each with one line from the data, then the closing slide with the offer and the QR", () => {
  const slides = [...html.matchAll(SLIDE_OPEN)].map((m) => m[0]);
  const photo = slides.filter((s) => /\bslide-photo\b/.test(s));
  assert.ok(photo.length >= 3 && photo.length <= 5, `${photo.length} photo slides`);
  assert.equal(slides.length, photo.length + 1);
  assert.match(slides.at(-1), /\bslide-close\b/, "the closing slide is last");
  const sections = html.split(SLIDE_OPEN).slice(1);
  for (const section of sections.slice(0, -1)) {
    assert.ok(elements(section).some((e) => e.attrs["data-slot"]), "a photo slide has a photo slot");
    const lines = elements(section).filter((e) => hasClass(e, "slide-line"));
    assert.equal(lines.length, 1, "one line per photo slide");
    assert.match(lines[0].attrs["data-src"], /^data\/plans\.json#\//);
  }
  const close = sections.at(-1);
  assert.ok(elements(close).some((e) => hasClass(e, "qr")), "the closing slide has the QR");
  assert.ok(elements(close).some((e) => /^data\/offers\.json#/.test(e.attrs["data-src"] ?? "")), "and the offer");
  assert.ok(pieceRuns(html).length > 0);
});

test("P6: arrow keys, Page keys and space move through the slides; Home and End jump; the ends wrap", () => {
  const s = run(5);
  assert.deepEqual(s.shown(), [0], "starts on the first slide, one slide shown");
  for (const [key, want] of [["ArrowRight", 1], ["ArrowDown", 2], ["PageDown", 3], [" ", 4], ["ArrowRight", 0], ["ArrowLeft", 4], ["ArrowUp", 3], ["PageUp", 2], ["Home", 0], ["End", 4]]) {
    const e = s.key(key);
    assert.deepEqual(s.shown(), [want], `${key} -> slide ${want + 1}`);
    assert.equal(e.defaultPrevented, true, `${key} is handled`);
  }
  assert.equal(s.location.hash, "#5", "the slide is in the URL, so a reload stays on it"); // the dots are gone: SS-1
});

test("P6: a click moves forward, a click on the left quarter moves back, a click on the legend does neither", () => {
  const s = run(5, { width: 1600 });
  s.click(1200);
  assert.deepEqual(s.shown(), [1]);
  s.click(100);
  assert.deepEqual(s.shown(), [0]);
  s.clickLegend();
  assert.deepEqual(s.shown(), [0]);
});

test("P6: a browser shortcut (Cmd/Ctrl/Alt + key) is left alone; L toggles the legend", () => {
  const s = run(5);
  const e = s.key("ArrowRight", { metaKey: true });
  assert.deepEqual(s.shown(), [0]);
  assert.equal(e.defaultPrevented, false);
  const open = s.body.classList.contains("legend-open");
  s.key("l");
  assert.equal(s.body.classList.contains("legend-open"), !open);
});

test("P6: the URL fragment opens a slide; a bad one opens the first", () => {
  assert.deepEqual(run(5, { hash: "#3" }).shown(), [2]);
  assert.deepEqual(run(5, { hash: "#99" }).shown(), [4]);
  assert.deepEqual(run(5, { hash: "#x" }).shown(), [0]);
});

test("P6: the legend starts open on a wide screen and closed on a phone", () => {
  assert.equal(run(5, { width: 1600 }).body.classList.contains("legend-open"), true);
  assert.equal(run(5, { width: 390 }).body.classList.contains("legend-open"), false);
});

test("P6: N and the switch show and hide the file names, and agree with each other", () => {
  const s = run(5);
  assert.equal(s.body.classList.contains("show-files"), false, "starts with the plain labels");
  const e = s.key("n");
  assert.equal(e.defaultPrevented, true);
  assert.equal(s.body.classList.contains("show-files"), true);
  assert.equal(s.filesBox.checked, true, "the switch follows the key");
  s.tick();
  assert.equal(s.body.classList.contains("show-files"), false, "the switch turns them off");
  assert.deepEqual(s.shown(), [0], "neither moves the slide");
});
