// R2-22 (SPEC-rung2 § 10): a RELOAD of the same link after a first run's meals were pressed adds nothing. The reload is
// a new page load: a fresh window (no once-per-load marker) over a page whose store kept the first run's pending list
// (as the store's own storage does), on the same address — B removes the fragment only just before it presses
// CHECKOUT, so a reload before that carries the link again. A second tab is the same case. The second run stops at
// § 10 item 1 with nothing pressed, and the pending meals stay exactly the first run's.
// ⭐ "stepper" is the store's own case (§ 10's build note): a meal already chosen shows the store's counter in place of
// its Add to Cart, so on the reload the link's meals are never all "found" by their Add to Cart. B must still stop
// with § 10's line, at once — not wait out its 10 s and stop as "not on this page". "stays" is the other shape.
import test from "node:test";
import assert from "node:assert/strict";
import {
  assertRefused,
  CHECKOUT_PAYLOAD,
  fakeWindow,
  fragmentFor,
  HELD_LINE,
  MAX_WAIT_MS,
  orderPage,
  POLL_MS,
  run,
  script,
  untouchableStorage,
} from "./r2-harness.mjs";

async function reload({ width, afterFirstPress, after }) {
  const store = { pending: [] };
  const fragment = fragmentFor(CHECKOUT_PAYLOAD);
  const first = await orderPage({ width, afterFirstPress, store });
  const h1 = fakeWindow({ fragment, page: first, storage: untouchableStorage() });
  run(await script("B"), h1.window);
  while (first.log.length < after) assert.ok(h1.timers.step(), "the first run still pressing");
  // The page reloads here: the first window's timers never run again.
  assert.equal(h1.url.hash, fragment, "fixture control: the link is still in the address when the page reloads");
  assert.equal(store.pending.length, after, "fixture control: the first run's meals are pending");
  const pressed = [...store.pending];
  const second = await orderPage({ width, afterFirstPress, store });
  const h2 = fakeWindow({ path: h1.url.pathname + h1.url.search, fragment: h1.url.hash, page: second, storage: untouchableStorage() });
  assert.equal(second.displayed().length, 1, "fixture control: the store shows the pending meals");
  run(await script("B"), h2.window);
  h2.timers.drain();
  assert.deepEqual(second.all, [], "the reload presses nothing");
  assertRefused(h2, "/order?mpid=21", /stopped: the plan already holds meals$/);
  assert.ok(h2.info.includes(HELD_LINE), JSON.stringify(h2.info));
  assert.deepEqual(store.pending, pressed, "the pending meals stay exactly the first run's");
  assert.ok(h2.timers.delays.length * POLL_MS < MAX_WAIT_MS, `stopped at once: ${h2.timers.delays.length} polls`);
}

for (const width of ["bar", "sidebar"]) {
  for (const afterFirstPress of ["stepper", "stays"]) {
    test(`R2-22a ${width}, ${afterFirstPress}: reloaded after all seven meals, before CHECKOUT — the reload adds nothing`, async () => {
      await reload({ width, afterFirstPress, after: 7 });
    });

    test(`R2-22b ${width}, ${afterFirstPress}: reloaded in the middle of the fill, after 3 meals — the same`, async () => {
      await reload({ width, afterFirstPress, after: 3 });
    });
  }
}
