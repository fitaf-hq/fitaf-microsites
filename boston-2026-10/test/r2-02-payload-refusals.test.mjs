// R2-02: every malformed payload is refused, by both fills, changing nothing: the fragment is removed, there is
// no navigation, no press, no storage change, and the diagnostic names THIS case's reason (so each case proves
// its own check, not a later one that happens to catch it too).
import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCheckedOut,
  assertRefused,
  CART_KEY,
  FakeStorage,
  fakeWindow,
  fragmentFor,
  orderPage,
  rawFragment,
  run,
  script,
} from "./r2-harness.mjs";

const item = (over = {}) => ({ name: "Birria de Res Bowl", qty: 7, pid: 1353, ...over }); // 7 of mpid 21's 7
const valid = (over = {}) => ({ v: 1, mpid: 21, items: [item()], ...over });
const LONG_NAME = "x".repeat(1600);

const CASES = [
  ["not base64url", "#fitaf=@@not*base64", /base64url/],
  ["base64url, but not JSON", rawFragment("{not json"), /JSON/],
  ["JSON null", rawFragment("null"), /version/],
  ["JSON array", rawFragment("[1,2]"), /version/],
  ["JSON number", rawFragment("3"), /version/],
  ["over 2 KB", fragmentFor(valid({ items: [item({ name: LONG_NAME })] })), /2 KB/],
  ["v is 2", fragmentFor(valid({ v: 2 })), /version/],
  ["v missing", fragmentFor({ mpid: 21, items: [item()] }), /version/],
  ["v is the string 1", fragmentFor(valid({ v: "1" })), /version/],
  ["mpid a string", fragmentFor(valid({ mpid: "21" })), /mpid/],
  ["mpid missing", fragmentFor({ v: 1, items: [item()] }), /mpid/],
  ["items missing", fragmentFor({ v: 1, mpid: 21 }), /no items/],
  ["items empty", fragmentFor(valid({ items: [] })), /no items/],
  ["items not a list", fragmentFor(valid({ items: { name: "x", qty: 1 } })), /no items/],
  ["an item is null", fragmentFor(valid({ items: [item(), null] })), /name/],
  ["name empty", fragmentFor(valid({ items: [item({ name: "" })] })), /name/],
  ["name a number", fragmentFor(valid({ items: [item({ name: 5 })] })), /name/],
  ["name twice", fragmentFor(valid({ items: [item(), item({ qty: 1 })] })), /twice/],
  ["qty 0", fragmentFor(valid({ items: [item({ qty: 0 })] })), /qty/],
  ["qty 22", fragmentFor(valid({ items: [item({ qty: 22 })] })), /qty/],
  ["qty 1.5", fragmentFor(valid({ items: [item({ qty: 1.5 })] })), /qty/],
  ["qty a string", fragmentFor(valid({ items: [item({ qty: "2" })] })), /qty/],
  ["qty missing", fragmentFor(valid({ items: [{ name: "Birria de Res Bowl", pid: 1353 }] })), /qty/],
  ["pid a string", fragmentFor(valid({ items: [item({ pid: "1353" })] })), /pid/],
  ["pid 0", fragmentFor(valid({ items: [item({ pid: 0 })] })), /pid/],
  ["code a number", fragmentFor(valid({ code: 123 })), /code/],
  ["code with a space", fragmentFor(valid({ code: "BOSTON 26" })), /code/],
  ["code empty", fragmentFor(valid({ code: "" })), /code/],
];

const VISITOR_CART = JSON.stringify([{ localId: "36688", name: "a visitor's own line" }]);

for (const [label, fragment, reason] of CASES) {
  test(`R2-02 fill A refuses: ${label}`, async () => {
    const storage = new FakeStorage({ [CART_KEY]: VISITOR_CART });
    const before = storage.dump();
    const h = fakeWindow({ fragment, storage });
    run(await script("A"), h.window);
    assertRefused(h, "/order?mpid=21", reason);
    assert.equal(storage.dump(), before, "storage unchanged");
  });

  test(`R2-02 fill B refuses: ${label}`, async () => {
    const page = await orderPage();
    const h = fakeWindow({ fragment, document: page.document });
    run(await script("B"), h.window);
    h.timers.drain();
    assertRefused(h, "/order?mpid=21", reason);
    assert.equal(page.total(), 0, "nothing pressed");
  });
}

test("R2-02 control: the valid payload the cases are mutated from is accepted by both fills", async () => {
  const a = fakeWindow({ fragment: fragmentFor(valid()) });
  run(await script("A"), a.window);
  assert.deepEqual(a.events.at(-1), ["replace", "/checkout"]);
  const page = await orderPage();
  const b = fakeWindow({ fragment: fragmentFor(valid()), page });
  run(await script("B"), b.window);
  b.timers.drain();
  assertCheckedOut(b, page, "/order?mpid=21");
});
