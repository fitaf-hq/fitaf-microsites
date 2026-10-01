// R2-67 (SPEC-rung2-progress-and-checkout § 15.2): fill B's 10 s for the meals starts at the first poll that finds a
// titled meal card, not when fill B starts. In 2 of 7 live runs (2026-09-30) the store drew no card within fill B's
// 10 s, and fill B refused every meal of the link. Here the synthetic page draws its cards 12 s after fill B starts
// (the fake timers: fill B's first poll runs at 0 s and each step is one 200 ms poll, so the poll at 12.0 s is the first
// to find them): done: /checkout, with R2-15's presses. Until the cards are drawn nothing is pressed and the fragment
// stays. ⭐ The mutant, made IN MEMORY from the shipped text (no file edited): the window counted from fill B's start,
// as before § 15.2 (the first-card condition removed, so every poll is one of the 50): refused at 9.8 s, R2-67 fails.
import test from "node:test";
import assert from "node:assert/strict";
import {
  ADD,
  assertCheckedOut,
  CHECKOUT_PAYLOAD,
  fakeWindow,
  fragmentFor,
  MEALS,
  orderPage,
  PAGE,
  POLL_MS,
  run,
  script,
  untouchableStorage,
  assertPollsAndPresses,
} from "./r2-harness.mjs";

/** When the page draws its cards, from fill B's start. */
const CARDS_AT_MS = 12_000;
/** The shipped text's start of the 10 s (§ 15.2): once a poll has found a titled card, every later poll counts. */
const FIRST_CARD = 'if (!polls && !first(w.document, "app-product-card .product__content-title", text))';

/** R2-67: `text` on the synthetic page whose cards are drawn at CARDS_AT_MS. Throws (an AssertionError) unless done. */
async function lateCase(text, cardsAtMs = CARDS_AT_MS) {
  const page = await orderPage();
  page.hide(); // the store has not drawn its cards yet
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page, storage: untouchableStorage() });
  run(text, h.window); // the first poll, at 0 s
  for (let t = POLL_MS; t < cardsAtMs; t += POLL_MS) h.timers.step(); // the polls at 0.2 s … 11.8 s
  assert.equal(page.total(), 0, "nothing pressed before the cards are drawn");
  assert.deepEqual(h.events, [], `the fragment stays while fill B waits for the cards: ${JSON.stringify(h.info)}`);
  page.show();
  h.timers.drain();
  assert.deepEqual(
    page.all,
    [
      [MEALS[0], ADD],
      [MEALS[1], ADD],
      [MEALS[2], ADD],
      [MEALS[1], ADD],
      [MEALS[2], ADD],
      [MEALS[2], ADD],
      [MEALS[2], ADD],
      [PAGE, "checkout:shown"],
    ],
    "the seven meals, then CHECKOUT once, and nothing else",
  );
  assertCheckedOut(h, page, "/order?mpid=21");
  assertPollsAndPresses(h.timers.delays, page.log.length, "§ 23:");
  return { h, page };
}

test("R2-67: the cards drawn 12 s after fill B starts — done: /checkout, the same presses (until § 15.2: refused)", async () => {
  await lateCase(await script());
});

test("R2-67 (mutant): the window counted from fill B's start — refused before the cards come, R2-67 fails", async () => {
  const text = await script();
  assert.equal(text.split(FIRST_CARD).length, 2, "the first-card condition the mutant removes is in the shipped text, once");
  const mutant = text.replace(FIRST_CARD, "if (false)");
  assert.notEqual(mutant, text, "the mutation applied");
  await assert.rejects(lateCase(mutant), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    assert.match(err.message, /the fragment stays while fill B waits/, "it fails on the refusal before the cards");
    return true;
  });
});
