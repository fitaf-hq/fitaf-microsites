// R2-43 (SPEC-rung2-progress-and-checkout § 2 item 4, § 3 item 1): at every stop AFTER the checks of § 1 (so the screen
// was shown), the screen goes BEFORE the stop's own console line; there is no mark and no style; and the line is the
// stop's own (SPEC-rung2 § 10 item 3). Each stop is set up as its own rung 2 case sets it up, on the synthetic page.
// A link refused before the checks shows nothing at all: R2-03's refusals run against a document that throws if touched.
import test from "node:test";
import assert from "node:assert/strict";
import {
  addCard,
  CHECKOUT_PAYLOAD,
  COLLIDING,
  COLLISION_PAYLOAD,
  fakeWindow,
  fragmentFor,
  MEALS,
  orderPage,
  refKey,
  run,
  script,
} from "./r2-harness.mjs";
import { deepState, SCREEN_ID, screenOf, watchLines, watchMutations } from "./r2-screen.mjs";

const STOPS = [
  {
    name: "not on this page (a meal renamed on the page)",
    line: `stopped: not on this page: ${refKey(MEALS[1])}`,
    setup: async () => {
      const page = await orderPage();
      const title = [...page.document.querySelectorAll(".product__content-title")].find((t) => /Pesto/.test(t.textContent));
      title.textContent = "Chicken Pesto Pasta (new recipe)";
      return { page, payload: CHECKOUT_PAYLOAD };
    },
  },
  {
    name: "the plan already holds meals",
    line: "stopped: the plan already holds meals",
    setup: async () => ({ page: await orderPage({ store: { pending: [MEALS[0]] } }), payload: CHECKOUT_PAYLOAD }),
  },
  {
    name: "two meals share a key",
    line: `stopped: two meals share a key: ${refKey(COLLIDING[0])}`,
    setup: async () => {
      const page = await orderPage();
      for (const name of COLLIDING) addCard(page.document, name);
      return { page, payload: COLLISION_PAYLOAD };
    },
  },
  {
    name: "no checkout control (the plan not full on the page)",
    line: "stopped: no checkout control",
    setup: async () => ({ page: await orderPage({ need: 8 }), payload: CHECKOUT_PAYLOAD }),
  },
  {
    name: "/checkout not reached (the store never routes)",
    line: "stopped: /checkout not reached",
    setup: async () => ({ page: await orderPage({ routes: false }), payload: CHECKOUT_PAYLOAD }),
  },
];

for (const stop of STOPS) {
  test(`R2-43: ${stop.name} — the screen gone before the line; no mark, no style; the stop's own line`, async () => {
    const { page, payload } = await stop.setup();
    const h = fakeWindow({ fragment: fragmentFor(payload), page });
    const mutations = watchMutations(page.document);
    const lines = watchLines(h, page.document);
    run(await script(), h.window);
    h.timers.drain();
    const events = await mutations.settle();
    assert.ok(events.some((e) => e[0] === "added" && e[1] === SCREEN_ID), `the screen was shown (the checks passed): ${JSON.stringify(events)}`);
    const last = lines.at(-1);
    assert.equal(last?.line, `[fitaf-handoff] ${stop.line}`, JSON.stringify(lines));
    assert.equal(last.screen, false, "the screen is gone before the stop's line");
    assert.equal(screenOf(page.document), null);
    assert.deepEqual(deepState(page.document), { mark: false, styles: 0, inHead: true, css: "" }, "no mark, no style");
    assert.ok(!lines.some((l) => l.line.endsWith("done: /checkout")));
  });
}
