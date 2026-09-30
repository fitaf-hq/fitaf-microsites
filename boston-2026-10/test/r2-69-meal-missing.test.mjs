// R2-69 (SPEC-rung2-progress-and-checkout § 15.2; the rule unchanged, its 10 s moved): the cards drawn late, 12 s
// after fill B starts (as R2-67), and one meal of the link not among them: the link is refused 10 s after the FIRST
// CARD, naming the missing meal's key, nothing pressed. The 10 s is the 50 polls counting the one that found the first
// card, as R2-10a counts them from fill B's start when the cards are there at once: the stop comes at the 50th poll
// after the cards are drawn. (Until § 15.2 fill B refused at its own 50th poll, 9.8 s in, before the cards came.)
import test from "node:test";
import assert from "node:assert/strict";
import {
  assertRefused,
  CHECKOUT_PAYLOAD,
  fakeWindow,
  fragmentFor,
  MAX_WAIT_MS,
  MEALS,
  orderPage,
  POLL_MS,
  refKey,
  run,
  script,
} from "./r2-harness.mjs";

const CARDS_AT_MS = 12_000;
const STOP = `stopped: not on this page: ${refKey(MEALS[1])}`;

test("R2-69: cards drawn 12 s in, one meal absent — refused 10 s after the first card (its 50th poll), naming its key", async () => {
  const page = await orderPage();
  page.hide();
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  run(await script(), h.window);
  for (let t = POLL_MS; t < CARDS_AT_MS; t += POLL_MS) h.timers.step();
  assert.deepEqual(h.info.filter((l) => l.includes("stopped:")), [], "no refusal before the cards are drawn");
  // The store draws its cards, one meal of the link not among them (renamed: the page shows another meal).
  page.show();
  const title = [...page.document.querySelectorAll("app-product-card .product__content-title")].find((t) => /Pesto/.test(t.textContent));
  title.textContent = "Chicken Pesto Pasta (new recipe)";
  let polls = 0;
  while (!h.info.some((l) => l.includes("stopped:"))) {
    assert.ok(h.timers.step(), `fill B still polling after ${polls} polls`);
    polls += 1;
  }
  assert.equal(polls, MAX_WAIT_MS / POLL_MS, "refused at the 50th poll counting the one that found the first card");
  assertRefused(h, "/order?mpid=21", new RegExp(`${STOP}$`));
  assert.equal(page.total(), 0, "nothing pressed, not even the meals that were found");
  assert.equal(h.timers.pending(), 0, "and nothing left running");
});
