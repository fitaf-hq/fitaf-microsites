// R2-27 (SPEC-rung2 § 11 item 1): the contract's own list of refused links — a RETIRED version-1 link (base64url JSON,
// kept alongside nothing), and malformed version-2 values: a bad key, `*1`, `*22`, a bad code, an empty item. Each is
// refused by both fills, changing nothing: nothing pressed, storage unchanged, the fragment removed, and the stop
// line naming its own reason. The rest of the grammar is R2-02.
import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCheckedOut,
  assertRefused,
  CART_KEY,
  CHECKOUT_PAYLOAD,
  FakeStorage,
  fakeWindow,
  orderPage,
  payloadText,
  rawFragment,
  refKey,
  run,
  script,
  v1Fragment,
} from "./r2-harness.mjs";

const [B, C, J] = CHECKOUT_PAYLOAD.items.map((it) => refKey(it.name)); // 1 + 2 + 4 = 7
const VALID = payloadText(CHECKOUT_PAYLOAD); // `2.${B}.${C}*2.${J}*4`

const CASES = [
  // Exactly what the link tool printed before § 11, for the same 7 meals.
  ["a v1 link", v1Fragment({ v: 1, mpid: 21, items: CHECKOUT_PAYLOAD.items }), /stopped: unknown version$/],
  ["a bad key", rawFragment(`2.${B}.${C.slice(0, 4)}*2.${J}*4`), new RegExp(`stopped: bad meal: ${C.slice(0, 4)}\\*2$`)],
  ["*1", rawFragment(`2.${B}*1.${C}*2.${J}*4`), new RegExp(`stopped: bad meal: ${B}\\*1$`)],
  ["*22", rawFragment(`2.${B}.${C}*2.${J}*22`), new RegExp(`stopped: bad meal: ${J}\\*22$`)],
  ["a bad code", rawFragment(`${VALID}.~BOSTON_26`), /stopped: bad code$/],
  ["an empty item", rawFragment(`2.${B}..${C}*2.${J}*4`), /stopped: bad meal: $/],
];

test("R2-27 control: the valid link the cases are mutated from fills (fill B) and is read (fill A)", async () => {
  const page = await orderPage();
  const b = fakeWindow({ fragment: rawFragment(VALID), page });
  run(await script("B"), b.window);
  b.timers.drain();
  assertCheckedOut(b, page, "/order?mpid=21");
  const a = fakeWindow({ fragment: rawFragment(VALID) });
  run(await script("A"), a.window);
  assert.ok(a.info.includes("[fitaf-handoff] fill A, mpid 21"), JSON.stringify(a.info));
});

for (const [label, fragment, reason] of CASES) {
  test(`R2-27 fill B refuses ${label}: nothing pressed, fragment removed`, async () => {
    const page = await orderPage();
    const h = fakeWindow({ fragment, page });
    run(await script("B"), h.window);
    h.timers.drain();
    assertRefused(h, "/order?mpid=21", reason);
    assert.deepEqual(page.all, [], "nothing pressed");
  });

  test(`R2-27 fill A refuses ${label}: storage unchanged, fragment removed`, async () => {
    const storage = new FakeStorage({ [CART_KEY]: '[{"localId":"36688"}]' });
    const before = storage.dump();
    const h = fakeWindow({ fragment, storage });
    run(await script("A"), h.window);
    assertRefused(h, "/order?mpid=21", reason);
    assert.equal(storage.dump(), before);
  });
}
