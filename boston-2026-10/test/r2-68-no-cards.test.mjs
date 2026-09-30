// R2-68 (SPEC-rung2-progress-and-checkout § 15.2): the page draws no meal card for 30 s: fill B stops with `stopped: no
// meal cards on this page`, pressing nothing: the fragment removed, the screen gone before the line (§ 2 item 4, as
// R2-43 for every stop), no mark, no style. The 30 s is fill B's own 200 ms polls, counted as R2-28 counts the wait
// after CHECKOUT: the 150th poll (29.8 s after the first, at 0 s) is the last, and the stop comes there, having set
// exactly 149 timers. R2-68b, the edge: cards drawn by the 150th poll are found (done); drawn after it, nothing is
// left running to find them. (Until § 15.2 fill B refused at its 50th poll, `not on this page`.)
import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCheckedOut,
  assertRefused,
  CHECKOUT_PAYLOAD,
  fakeWindow,
  fragmentFor,
  LOG_PREFIX,
  orderPage,
  POLL_MS,
  run,
  script,
  untouchableStorage,
} from "./r2-harness.mjs";
import { deepState, screenOf, watchLines } from "./r2-screen.mjs";

/** § 15.2: fill B waits for the page's cards up to 30 s. */
const MAX_WAIT_FOR_CARDS_MS = 30_000;
const LAST_POLL = MAX_WAIT_FOR_CARDS_MS / POLL_MS; // 150
const LINE = "stopped: no meal cards on this page";

test("R2-68: no cards for 30 s — stopped: no meal cards on this page, at the 150th poll; nothing pressed; the screen gone first", async () => {
  const page = await orderPage();
  page.hide();
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page, storage: untouchableStorage() });
  const lines = watchLines(h, page.document);
  run(await script(), h.window);
  h.timers.drain();
  assert.deepEqual(page.all, [], "no press at all: no meal, no page control");
  assertRefused(h, "/order?mpid=21", new RegExp(`${LINE}$`));
  assert.equal(lines.at(-1)?.line, `${LOG_PREFIX} ${LINE}`, JSON.stringify(lines));
  assert.equal(lines.at(-1).screen, false, "the screen is gone before the stop's line");
  assert.equal(screenOf(page.document), null);
  assert.deepEqual(deepState(page.document), { mark: false, styles: 0, inHead: true, css: "" }, "no mark, no style");
  assert.ok(h.timers.delays.every((ms) => ms === POLL_MS), "only 200 ms polls");
  assert.equal(h.timers.delays.length, LAST_POLL - 1, "the stop at the 150th poll: 149 timers set before it");
  assert.equal(h.timers.pending(), 0, "and nothing left running");
});

/** The cards drawn after `polls` of fill B's polls have run (the first at 0 s, run by the script itself). */
async function drawnAfter(polls) {
  const page = await orderPage();
  page.hide();
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page, storage: untouchableStorage() });
  run(await script(), h.window);
  for (let n = 1; n < polls; n++) h.timers.step();
  page.show();
  h.timers.drain();
  return { h, page };
}

test("R2-68b: the edge — cards drawn after the 149th poll are found by the 150th (done); after the 150th, the stop stands", async () => {
  const early = await drawnAfter(LAST_POLL - 1);
  assert.equal(early.page.total(), 7, JSON.stringify(early.h.info));
  assertCheckedOut(early.h, early.page, "/order?mpid=21");
  const late = await drawnAfter(LAST_POLL);
  assert.equal(late.page.total(), 0, "nothing pressed");
  assertRefused(late.h, "/order?mpid=21", new RegExp(`${LINE}$`));
});
