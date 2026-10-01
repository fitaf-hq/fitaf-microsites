// FC-6 (SPEC-rung2-fill-c § 1.6): every stop of fill C's own, after its first press and before CHECKOUT, names the
// store's counts, `stopped: the store counted K of N; short: <keys>` / `over: <keys>` (then what § 1.4 found, when it is
// § 1.4 that stops it), and the screen says, in the visitor's words, that the cart could not be filled and that the
// store's own page is next: data/messages.json's handoff.stopped, in the step line (the one role=status), from the same
// place as the screen's other words (R2-50). Then the screen goes, by its own clock: the class `z`, a CSS animation in
// the screen's own style whose end removes it (as its 90 s clock does, R2-49; Chrome runs it in the watch's FC-6c). A
// stop before the first press, or after CHECKOUT, removes the screen at once, as before (R2-43). On a clock.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MESSAGES_PATH } from "../build.mjs";
import { screenWords, STOREFRONT_SOURCE, storefrontText } from "../scripts/build-storefront.mjs";
import { LOG_PREFIX, MEALS, RETRIES } from "./r2-harness.mjs";
import { endScreenClock, fatesFrom, fcRun, FC_TOTAL, keyOf, shortNow } from "./fc-harness.mjs";
import { deepState, screenOf, screenState, WORDS } from "./r2-screen.mjs";

/** FC-2c's store: MEALS[2]'s Add to Cart never counted, 1 + RETRIES times. */
const NEVER = fatesFrom(Object.fromEntries(Array.from({ length: 1 + RETRIES }, (_, i) => [2 + i, { drop: true }])));

test("FC-6a: a stop after the retries — the exact line: the store counted 2 of 14; short: every meal short, by key", async () => {
  const r = await fcRun({ fates: NEVER });
  const short = shortNow(r.page);
  assert.deepEqual(short.slice(0, 2), [keyOf(MEALS[0]), keyOf(MEALS[2])], "fixture control: MEALS[0] (1 of 2) and MEALS[2] (0 of 3) first");
  assert.equal(r.last, `${LOG_PREFIX} stopped: the store counted 2 of ${FC_TOTAL}; short: ${short.join(",")}`);
});

test("FC-6b: at that stop the screen stays, says the cart could not be filled, carries its exit clock, and goes at its end", async () => {
  const r = await fcRun({ fates: NEVER });
  const doc = r.page.document;
  const s = screenOf(doc);
  assert.ok(s, "the screen is still up at the stop's line");
  assert.equal(screenState(doc).step, WORDS.stopped, "the step line: data/messages.json's handoff.stopped");
  assert.equal(s.className, "z", "its exit clock");
  const css = s.querySelector("style").textContent;
  assert.match(css, /#fitaf-screen\.z\{animation:fitaf-z \d+(\.\d+)?s!important\}/, "the clock: a CSS animation on the screen itself");
  assert.match(css, /@keyframes fitaf-z\{\}/);
  assert.deepEqual(deepState(doc), { mark: false, styles: 0, inHead: true, css: "" }, "no mark, no style");
  assert.deepEqual(r.h.timers.delays.slice(-1), [200], "fixture control: no timer of fill C's left behind it");
  assert.equal(r.h.timers.pending(), 0, "nothing left running: the clock is the browser's, not a timer");
  endScreenClock(doc);
  assert.equal(screenOf(doc), null, "gone at its clock's end");
});

test("FC-6c: the words are data/messages.json's handoff.stopped: required by the build, never in the source; a changed phrase follows", async () => {
  assert.equal(typeof WORDS.stopped, "string");
  assert.ok(WORDS.stopped.trim(), "a phrase");
  const source = await readFile(STOREFRONT_SOURCE, "utf8");
  assert.ok(!source.includes(WORDS.stopped), "the source carries no phrase");
  const words = JSON.parse(await readFile(MESSAGES_PATH, "utf8")).handoff;
  const { stopped, ...without } = words;
  assert.ok(stopped);
  assert.throws(() => screenWords({ handoff: without }), /handoff\.stopped is missing/, "the build refuses a block without it");
  const dir = await mkdtemp(join(tmpdir(), "boston-fc-06-"));
  try {
    const copy = join(dir, "messages.json");
    const m = JSON.parse(await readFile(MESSAGES_PATH, "utf8"));
    m.handoff.stopped = "FC-6 A CHANGED STOP";
    await writeFile(copy, JSON.stringify(m, null, 2));
    const text = await storefrontText({ messagesPath: copy });
    assert.notEqual(text, await storefrontText(), "the built text changed");
    const r = await fcRun({ text, fates: NEVER });
    assert.equal(screenState(r.page.document).step, "FC-6 A CHANGED STOP", "and the screen says it");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
