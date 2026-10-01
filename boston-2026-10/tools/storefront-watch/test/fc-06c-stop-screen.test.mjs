// FC-6c (SPEC-rung2-fill-c § 1.6), in Chrome: a stop of fill C's own (after its first press, before CHECKOUT) leaves
// the progress screen up with the stop's words and its exit clock, ONE animation on the screen itself (fitaf-z), whose
// end removes it, as the screen's 90 s clock does (R2-49). The site's FC-6b reads the same in a DOM without CSS; this is
// the browser running it. And the smoke, which judges a stopped run by W10 alone (the screen gone at the end), reads the
// faces only once that clock has had its time (SPEC-rung2-fill-c § 2c). The synthetic store on 127.0.0.1 drops the
// first meal's press three times (the counter's schedule), so fill C stops after its retries: about 15 s.
// Headless Chrome; skipped without Chrome.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { smokeRun } from "../lib/smoke.mjs";
import { startStore } from "./browser-store.mjs";
import { browserFor, chrome, openDeep, shipped, skip } from "./r2-browser.mjs";

/** The first meal's Add to Cart, pressed 1 + RETRIES times, never counted. */
const NEVER_FIRST = { counter: { drop: [0, 1, 2] } };
const STOPPED = /^\[fitaf-handoff\] stopped: the store counted 0 of 7; short: /;

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

const screenNow = () => {
  const s = document.getElementById("fitaf-screen");
  if (!s) return null;
  return {
    className: s.className,
    step: s.querySelector('[role="status"]')?.textContent ?? null,
    clocks: s.getAnimations().map((a) => ({ name: a.animationName, duration: a.effect.getTiming().duration })),
  };
};

test("FC-6c: at a stop of fill C's own the screen says so, runs its own exit clock, and is gone at its end", { skip, timeout: 60_000 }, async () => {
  store.set(NEVER_FIRST);
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text: site.text });
  try {
    const line = await run.verdict(30_000);
    assert.match(line ?? "", STOPPED, `fill C stopped, naming the counts: ${line}`);
    const at = await run.page.evaluate(screenNow);
    assert.ok(at, "the screen is still up at the stop's line");
    assert.equal(at.className, "z");
    assert.equal(at.step, (await import("../../../data/messages.json", { with: { type: "json" } })).default.handoff.stopped);
    assert.equal(at.clocks.length, 1, `one clock on the screen itself: ${JSON.stringify(at.clocks)}`);
    assert.equal(at.clocks[0].name, "fitaf-z");
    const gone = await run.until(() => !document.getElementById("fitaf-screen"), undefined, at.clocks[0].duration + 2_000);
    assert.equal(gone, true, `gone by its clock's end (${at.clocks[0].duration} ms)`);
  } finally {
    await run.close();
  }
});

test("FC-6c: the smoke's reading of a stopped run waits for that clock — W10 does not report the screen still up", { skip, timeout: 90_000 }, async () => {
  store.set(NEVER_FIRST);
  const r = await smokeRun({ origin: store.origin, width: 1280, mode: { kind: "paste", text: site.text, label: "fill C, pasted" }, code: site.code, executablePath: chrome });
  assert.ok(r.outcome.console.some((l) => STOPPED.test(l)), JSON.stringify(r.outcome.console));
  assert.equal(r.verdict.pass, false, "a stop fails the width (the smoke's own rule)");
  assert.equal(r.outcome.faces.screenAtEnd, false, "the screen gone when the faces are read");
  assert.ok(!r.verdict.reasons.some((x) => /still on the page/.test(x)), r.verdict.reasons.join("; "));
});
