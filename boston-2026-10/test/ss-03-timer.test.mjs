// SS-3 (SPEC-slideshow.md § 1 item 3): ⭐ the timer. The two durations are named once, in slideshow.js, and the
// stylesheet takes the fade's from it (no duration of its own); with a fake clock the slide advances at 7 s, wraps at the
// end, and a key that moves the slide restarts the 7 s. The script runs in a Node `vm` over a stand-in for the few DOM
// calls it makes, as P6 runs it.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import vm from "node:vm";
import { MOCKUPS_DIR } from "../mockups/build-mockups.mjs";

const script = await readFile(join(MOCKUPS_DIR, "slideshow.js"), "utf8");
const css = await readFile(join(MOCKUPS_DIR, "mockups.css"), "utf8");
const SLIDE_MS = 7000;

/** slideshow.js over `n` slides with a fake clock: `wait(ms)` moves it on, firing what falls due, in order. */
function run(n) {
  let now = 0;
  let timers = [];
  let nextId = 1;
  const classes = () => {
    const set = new Set();
    return { contains: (c) => set.has(c), toggle(c, on = !set.has(c)) { if (on) set.add(c); else set.delete(c); return on; }, add: (c) => set.add(c), remove: (c) => set.delete(c) };
  };
  const slides = Array.from({ length: n }, () => ({ hidden: false, classList: classes() }));
  const listeners = {};
  const location = { hash: "" };
  const root = { style: { props: {}, setProperty(k, v) { this.props[k] = v; } }, requestFullscreen: () => Promise.resolve() };
  const document = {
    body: { classList: classes() },
    documentElement: root,
    querySelectorAll: (sel) => (sel === ".slide" ? slides : []),
    querySelector: () => ({ checked: false, addEventListener() {} }),
  };
  const window = {
    document,
    location,
    innerWidth: 1600,
    history: { replaceState: (_s, _t, url) => (location.hash = url) },
    addEventListener: (type, fn) => ((listeners[type] ??= []).push(fn)),
    setTimeout: (fn, ms) => (timers.push({ id: nextId, at: now + ms, fn }), nextId++),
    clearTimeout: (id) => (timers = timers.filter((t) => t.id !== id)),
  };
  window.window = window;
  vm.runInNewContext(script, window);
  return {
    root,
    shown: () => slides.map((s, i) => (s.classList.contains("on") ? i : -1)).filter((i) => i >= 0),
    wait(ms) {
      const end = now + ms;
      for (;;) {
        const due = timers.filter((t) => t.at <= end).sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        timers = timers.filter((t) => t !== due);
        now = due.at;
        due.fn();
      }
      now = end;
    },
    key: (key) => { for (const fn of listeners.keydown ?? []) fn({ key, preventDefault() {} }); },
  };
}

test("SS-3: the durations come from one place; the slide advances at 7 s and wraps; a key restarts the 7 s", () => {
  assert.deepEqual(script.match(/^\s*const (SLIDE_MS|FADE_MS) = (\d+);/gm)?.map((l) => l.trim()), ["const SLIDE_MS = 7000;", "const FADE_MS = 500;"], "named once, in slideshow.js");
  assert.match(css, /transition:[^;]*opacity\s+var\(--fade\)/, "the stylesheet's fade is the script's");
  assert.doesNotMatch(css.match(/\.slide\s*\{[^}]*\}/)?.[0] ?? "", /\d+(\.\d+)?m?s\b/, "and has no duration of its own");
  const s = run(4);
  assert.equal(s.root.style.props["--fade"], "500ms", "the script hands the fade to the stylesheet");
  assert.deepEqual(s.shown(), [0], "starts on the first");
  s.wait(SLIDE_MS - 1);
  assert.deepEqual(s.shown(), [0], "not before 7 s");
  s.wait(1);
  assert.deepEqual(s.shown(), [1], "at 7 s, the next");
  s.wait(2 * SLIDE_MS);
  assert.deepEqual(s.shown(), [3], "and on");
  s.wait(SLIDE_MS);
  assert.deepEqual(s.shown(), [0], "it wraps");
  s.wait(3000);
  s.key("ArrowRight");
  assert.deepEqual(s.shown(), [1], "a key moves it");
  s.wait(SLIDE_MS - 1);
  assert.deepEqual(s.shown(), [1], "and restarts the 7 s (not 4 s left)");
  s.wait(1);
  assert.deepEqual(s.shown(), [2]);
});
