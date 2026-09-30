// R2-49 (SPEC-rung2-progress-and-checkout § 2 item 4): fill B never reaches a verdict (a hang planted under it: after
// the third meal is added, the page's setTimeout runs nothing, so fill B's next poll never comes), and the screen goes
// in any case 90 s after it appeared. The screen's clock is its own (it cannot be fill B's timers, which the hang has
// stopped): read from the browser's animation list, it is one 90 s animation on the screen, and moving its time to
// 89.9 s leaves the screen up while moving it to 90 s removes it. No verdict line is ever written.
// Headless Chrome against the synthetic store on 127.0.0.1; skipped without Chrome.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { sleep } from "../lib/browser.mjs";
import { startStore } from "./browser-store.mjs";
import { browserFor, openDeep, shipped, skip } from "./r2-browser.mjs";

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

/** In the page: the screen's own animations (not its children's): duration, and the time each has run. */
const clock = () => {
  const s = document.getElementById("fitaf-screen");
  return s ? s.getAnimations().map((a) => ({ duration: a.effect.getTiming().duration, iterations: a.effect.getTiming().iterations })) : null;
};
/** In the page: move the screen's own animation to `ms` of its time. */
const seek = (ms) => {
  const s = document.getElementById("fitaf-screen");
  s.getAnimations()[0].currentTime = ms;
};

test("R2-49: a planted hang — no verdict; the screen gone at 90 s, by its own clock", { skip, timeout: 60_000 }, async () => {
  store.set({ hangAfter: 3 });
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text: site.text });
  try {
    await run.until(() => document.querySelectorAll("#fitaf-screen .c > *").length === 3);
    await sleep(1_500);
    const slides = await run.page.evaluate(() => document.querySelectorAll("#fitaf-screen .c > *").length);
    assert.equal(slides, 3, "fixture control: fill B stopped moving after the third meal (the hang holds)");
    assert.equal(await run.verdict(500), null, "no verdict line");
    assert.deepEqual(await run.page.evaluate(clock), [{ duration: 90_000, iterations: 1 }], "the screen's own clock: one 90 s animation");
    await run.page.evaluate(seek, 89_900);
    await sleep(300);
    assert.equal(await run.page.evaluate(() => Boolean(document.getElementById("fitaf-screen"))), true, "up at 89.9 s");
    await run.page.evaluate(seek, 90_000);
    const gone = await run.until(() => !document.getElementById("fitaf-screen"), undefined, 3_000);
    assert.equal(gone, true, "gone at 90 s");
    assert.equal(await run.verdict(500), null, "still no verdict line: the screen went on its own");
    const left = await run.page.evaluate(() => ({ mark: document.documentElement.classList.contains("fitaf-deep"), style: Boolean(document.getElementById("fitaf-deep")) }));
    assert.deepEqual(left, { mark: false, style: false }, "and nothing else of ours is left");
  } finally {
    await run.close();
  }
});
