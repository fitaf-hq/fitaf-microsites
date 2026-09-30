// R2-59 and R2-62 on the synthetic order page (SPEC-rung2-progress-and-checkout § 12 item 2, the Advisor's ruling):
// fill B sets sessionStorage['ecc_additions_prompt_handled'] = "true", the store's own key for "the extras pop-up has
// been dealt with", IMMEDIATELY BEFORE it presses the store's CHECKOUT, and at no other moment; nothing else is ever
// written or read, in sessionStorage or anywhere. R2-62: an ordinary visit (R2-04's stub already throws on
// sessionStorage) and every link refused before CHECKOUT touch no storage at all. The store's own use of the key, and
// what it saves the visitor, is R2-59 in the watch package, in Chrome.
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
  PAGE,
  rawFragment,
  run,
  script,
  untouchableStorage,
} from "./r2-harness.mjs";

const KEY = "ecc_additions_prompt_handled";

/** A sessionStorage that records every touch into the window's own event list, in order with the presses. */
function recordingSession(h) {
  const touched = [];
  const s = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "setItem") return (k, v) => { touched.push(["setItem", k, v]); h.events.push(["session", k, v]); };
        touched.push([String(prop)]);
        return () => null;
      },
    },
  );
  h.window.sessionStorage = s;
  return touched;
}

test("R2-59: one write, the store's key set to \"true\", after the meals and immediately before the CHECKOUT press", async () => {
  const page = await orderPage();
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page, storage: untouchableStorage() });
  const touched = recordingSession(h);
  run(await script(), h.window);
  h.timers.drain();
  assert.deepEqual(touched, [["setItem", KEY, "true"]], "exactly one touch of sessionStorage: that write");
  assert.deepEqual(
    h.events,
    [["replaceState", "/order?mpid=21"], ["session", KEY, "true"], ["press", "checkout:shown"], ["pushState", "/checkout"]],
    "the fragment removed, the key set, then CHECKOUT pressed: nothing between the write and the press",
  );
  assert.equal(page.all.filter(([who]) => who !== PAGE).length, 7, "fixture control: the seven meals were pressed first");
  assert.ok(h.info.includes("[fitaf-handoff] done: /checkout"));
});

const REFUSED = [
  ["a malformed link", async () => ({ page: await orderPage(), fragment: rawFragment("2.nope!") })],
  ["the plan needs more meals than the link", async () => ({ page: await orderPage(), fragment: fragmentFor({ items: [{ name: MEALS[0], qty: 2 }] }) })],
  ["the plan already holds meals", async () => ({ page: await orderPage({ store: { pending: [MEALS[0]] } }), fragment: fragmentFor(CHECKOUT_PAYLOAD) })],
  ["two meals share a key", async () => {
    const page = await orderPage();
    for (const name of COLLIDING) addCard(page.document, name);
    return { page, fragment: fragmentFor(COLLISION_PAYLOAD) };
  }],
  ["no checkout control (after the meals, before CHECKOUT)", async () => ({ page: await orderPage({ need: 8 }), fragment: fragmentFor(CHECKOUT_PAYLOAD) })],
];

/** A storage that records every property read (a throwing one would be caught by fill B's guard, and read as a stop). */
function watched() {
  const touched = [];
  return { touched, storage: new Proxy({}, { get: (_, prop) => (touched.push(String(prop)), () => null) }) };
}

for (const [name, setup] of REFUSED) {
  test(`R2-62: a link refused before CHECKOUT (${name}) touches no storage at all`, async () => {
    const { page, fragment } = await setup();
    const local = watched();
    const session = watched();
    const h = fakeWindow({ fragment, page, storage: local.storage });
    h.window.sessionStorage = session.storage;
    run(await script(), h.window);
    h.timers.drain();
    assert.ok(h.info.some((l) => l.includes("stopped:")), `fixture control: refused: ${JSON.stringify(h.info)}`);
    assert.deepEqual(session.touched, [], "sessionStorage untouched");
    assert.deepEqual(local.touched, [], "localStorage untouched");
  });
}
