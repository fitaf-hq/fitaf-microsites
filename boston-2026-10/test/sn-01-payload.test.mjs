// SN-1 (SPEC-snacks-in-the-cart § 5 item 1, § 2, § 3.1): the payload with snacks. Accepted: snack items after the meals,
// bare (`_<key>`) and counted (`_<key>*<n>`): the fill ends at CHECKOUT with the plan the link's meals and the cart its
// snacks. Refused, with NOTHING pressed (no card, no control), the fragment removed and the stop line naming why: a bad
// snack key, `*1`, `*22`, a key named twice across a meal and a snack and across two snacks, a meal after a snack, a snack
// after `~<code>`; and the full-plan rule reads the MEALS only (13 meals and a snack for the 14-meal plan is refused, as 13
// meals alone are). The links are written from refKey (r2-harness), not by the link tool.
import test from "node:test";
import assert from "node:assert/strict";
import { FC_PATH, FC_PAYLOAD } from "./fc-harness.mjs";
import { assertRefused, LOG_PREFIX, payloadText, rawFragment, refKey } from "./r2-harness.mjs";
import { assertFullCart, DIRECT, snRun, SN_PAYLOAD, TOGGLED } from "./sn-harness.mjs";

const meals = payloadText(FC_PAYLOAD);
const snack = refKey(TOGGLED);

test("SN-1: snack items after the meals, bare and counted, are accepted: the plan is the meals, the cart the snacks", async () => {
  assert.match(payloadText(SN_PAYLOAD), new RegExp(`\\.\\_${snack}\\._${refKey(DIRECT)}\\*2$`), "control: the link carries `_<key>` and `_<key>*2` last");
  const r = await snRun();
  assert.equal(r.last, `${LOG_PREFIX} done: /checkout`, JSON.stringify(r.ours));
  assertFullCart(r.page);
});

const REFUSED = [
  ["a bad snack key", rawFragment(`${meals}._abc`), /stopped: bad meal: _abc$/],
  ["a snack's count of 1 written out", rawFragment(`${meals}._${snack}*1`), new RegExp(`stopped: bad meal: _${snack}\\*1$`)],
  ["a snack's count of 22", rawFragment(`${meals}._${snack}*22`), new RegExp(`stopped: bad meal: _${snack}\\*22$`)],
  ["a snack with a meal's key", rawFragment(`${meals}._${refKey(FC_PAYLOAD.items[1].name)}`), new RegExp(`stopped: named twice: ${refKey(FC_PAYLOAD.items[1].name)}$`)],
  ["a snack named twice", rawFragment(`${meals}._${snack}._${snack}*2`), new RegExp(`stopped: named twice: ${snack}$`)],
  [
    "a meal after a snack",
    rawFragment(`${payloadText({ items: FC_PAYLOAD.items.slice(0, -1) })}._${snack}.${refKey(FC_PAYLOAD.items.at(-1).name)}`),
    new RegExp(`stopped: a meal after a snack: ${refKey(FC_PAYLOAD.items.at(-1).name)}$`),
  ],
  ["a snack after the offer code", rawFragment(`${meals}.~SPRING-10._${snack}`), /stopped: bad meal: ~SPRING-10$/],
  ["13 meals and a snack for the 14-meal plan (the snack is not a meal)", null, /stopped: the plan needs 14 meals; the link has 13$/],
];

for (const [what, fragment, reason] of REFUSED) {
  test(`SN-1: ${what} — refused, nothing pressed, the fragment removed`, async () => {
    const short = { items: [...FC_PAYLOAD.items.slice(0, -1)], snacks: [{ name: TOGGLED, qty: 1 }] };
    const r = await snRun(fragment ? { fragment } : { payload: short });
    assert.deepEqual(r.page.all, [], "no press at all: no card, no control");
    assertRefused(r.h, FC_PATH, reason);
    assert.deepEqual([r.page.store.pending, r.page.store.cart], [[], []], "the plan and the cart hold nothing");
  });
}
