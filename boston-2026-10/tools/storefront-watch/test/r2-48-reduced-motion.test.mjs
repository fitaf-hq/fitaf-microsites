// R2-48 (SPEC-rung2-progress-and-checkout § 2 item 2): with prefers-reduced-motion, nothing slides and nothing cycles:
// the carousel shows the newest meal and stays on it. The control is the same run without it: once all meals are added
// the carousel cycles through them every 2.5 s until done. The store here takes 7 s to route after CHECKOUT, so the
// screen stays up long enough to watch. What moves is read from the browser's own animation list (every running
// CSS animation and transition on the screen), and from which slide is shown over time.
// Headless Chrome against the synthetic store on 127.0.0.1; skipped without Chrome.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { sleep } from "../lib/browser.mjs";
import { MEALS, startStore } from "./browser-store.mjs";
import { browserFor, DONE, openDeep, screenRead, shipped, skip } from "./r2-browser.mjs";

const ROUTE_DELAY_MS = 7_000;
const CYCLE_MS = 2_500;

let store;
let browser;
let site;
before(async () => {
  if (skip) return;
  store = await startStore();
  browser = await browserFor();
  site = await shipped();
});
after(async () => {
  await browser?.close();
  await store?.close();
});

/** In the page: every animation on the screen and inside it, by name, with its duration and iterations (as text:
 * JSON has no Infinity, so a repeating animation's count would arrive as null). */
function motion() {
  const s = document.getElementById("fitaf-screen");
  if (!s) return null;
  return s.getAnimations({ subtree: true }).map((a) => ({
    name: a.animationName ?? a.transitionProperty ?? a.constructor.name,
    kind: a.constructor.name,
    duration: a.effect.getTiming().duration,
    iterations: String(a.effect.getTiming().iterations),
    own: a.effect.target === s,
  }));
}

/** Run to "all meals added", then sample which slide is shown for `ms`. */
async function watchCarousel(reducedMotion) {
  store.set({ routeDelayMs: ROUTE_DELAY_MS });
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text: site.text, reducedMotion });
  try {
    const full = await run.until(() => {
      const s = document.getElementById("fitaf-screen");
      return s && s.querySelector(".c") && s.querySelector(".c").children.length === 7 && document.querySelector("button.checkout-control") && [...document.querySelectorAll("button.checkout-control")].some((b) => !b.disabled) ? true : null;
    });
    assert.ok(full, "fixture control: all seven meals added while the screen is up");
    const shown = [];
    const animations = [];
    const until = Date.now() + 2 * CYCLE_MS + 700;
    while (Date.now() < until) {
      const r = await run.page.evaluate(screenRead);
      if (r) shown.push(r.slides[r.shown]?.name ?? null);
      animations.push(await run.page.evaluate(motion));
      await sleep(250);
    }
    assert.equal(await run.verdict(ROUTE_DELAY_MS + 5_000), DONE, "then done, as ever");
    return { shown, animations: animations.flat().filter(Boolean) };
  } finally {
    await run.close();
  }
}

test("R2-48: prefers-reduced-motion — no animation but the screen's own clock; the newest meal shown and never cycled", { skip, timeout: 90_000 }, async () => {
  const { shown, animations } = await watchCarousel(true);
  assert.ok(shown.length > 10, `sampled ${shown.length} times`);
  assert.deepEqual([...new Set(shown)], [MEALS[6]], "the newest meal, the seventh added, and nothing else, for over two cycles");
  const moving = animations.filter((a) => !a.own);
  assert.deepEqual(moving, [], "nothing inside the screen animates or transitions");
  assert.ok(animations.every((a) => a.own && a.duration === 90_000), "only the screen's own 90 s clock runs (it moves nothing)");
});

test("R2-48 control: without it, once all are added the carousel cycles every 2.5 s", { skip, timeout: 90_000 }, async () => {
  const { shown, animations } = await watchCarousel(false);
  const changes = shown.filter((name, i) => i > 0 && name !== shown[i - 1]).length;
  assert.ok(changes >= 2, `the shown meal changed ${changes} times in ${shown.length} samples: ${shown.join(" | ")}`);
  const cycle = animations.find((a) => !a.own && a.iterations === "Infinity");
  assert.ok(cycle, `a repeating animation drives the cycle: ${JSON.stringify(animations.slice(0, 5))}`);
  assert.equal(cycle.duration, CYCLE_MS, "every 2.5 s");
});
