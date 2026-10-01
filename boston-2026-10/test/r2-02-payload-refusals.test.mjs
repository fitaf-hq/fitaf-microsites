// R2-02: every malformed payload is refused by fill B, changing nothing: the fragment is removed, there is no
// navigation, no press, and the diagnostic names THIS case's reason (so each case proves its own check, not a later
// one that happens to catch it too). The grammar is payload version 2 (SPEC-rung2 § 11 item 1):
// `2.<meal>[.<meal>…][.~<code>]`, each `<meal>` a 5-character base-36 key, or `<key>*<n>` with n from 2 to 21, the code
// `[A-Za-z0-9-]{1,40}`. R2-27 is the contract's own short list of these; this is the whole grammar.
import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCheckedOut,
  assertRefused,
  fakeWindow,
  orderPage,
  rawFragment,
  refKey,
  run,
  script,
  v1Fragment,
} from "./r2-harness.mjs";

const B = refKey("Birria de Res Bowl"); // a real fixture meal, so a case's only fault is its own
const C = refKey("Chicken Pesto Pasta");
const valid = `2.${B}*7`; // 7 of mpid 21's 7
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const badMeal = (part) => new RegExp(`bad meal: ${escape(part)}$`);

const CASES = [
  ["empty", rawFragment(""), /unknown version/],
  ["version 1 (a retired base64 JSON link)", v1Fragment({ v: 1, mpid: 21, items: [{ name: "Birria de Res Bowl", qty: 7 }] }), /unknown version/],
  ["version 3", rawFragment(`3.${B}*7`), /unknown version/],
  ["version 02", rawFragment(`02.${B}*7`), /unknown version/],
  ["version v2", rawFragment(`v2.${B}*7`), /unknown version/],
  ["over 2 KB", rawFragment(`2.${`${B}.`.repeat(400)}${C}`), /payload over 2 KB/],
  ["no item", rawFragment("2"), /no items/],
  ["only a code", rawFragment("2.~BOSTON26"), /no items/],
  ["an empty item in the middle", rawFragment(`2.${B}*6..${C}`), badMeal("")],
  ["an empty item at the end", rawFragment(`2.${B}*7.`), badMeal("")],
  ["a key of 4 characters", rawFragment("2.t1fk*7"), badMeal("t1fk*7")],
  ["a key of 6 characters", rawFragment(`2.${B}x*7`), badMeal(`${B}x*7`)],
  ["a key in capitals", rawFragment(`2.${B.toUpperCase()}*7`), badMeal(`${B.toUpperCase()}*7`)],
  ["a key with a hyphen", rawFragment("2.t1-kl*7"), badMeal("t1-kl*7")],
  // A browser's location.hash percent-encodes a non-ASCII character, and so does the test window's URL.
  ["a non-ASCII key", rawFragment("2.t1fké*7"), badMeal("t1fk%C3%A9*7")],
  ["*1 (a count of 1 is the bare key)", rawFragment(`2.${B}*1.${C}*6`), badMeal(`${B}*1`)],
  ["*0", rawFragment(`2.${B}*0.${C}*7`), badMeal(`${B}*0`)],
  ["*22", rawFragment(`2.${B}*22`), badMeal(`${B}*22`)],
  ["*07 (a leading zero)", rawFragment(`2.${B}*07`), badMeal(`${B}*07`)],
  ["* with no count", rawFragment(`2.${B}*`), badMeal(`${B}*`)],
  ["*2.5 (the dot splits it: \"5\" is the bad item)", rawFragment(`2.${B}*2.5`), badMeal("5")],
  ["a doubled *", rawFragment(`2.${B}**7`), badMeal(`${B}**7`)],
  ["a key named twice", rawFragment(`2.${B}*6.${B}`), new RegExp(`named twice: ${B}$`)],
  ["a code not last", rawFragment(`2.~BOSTON26.${B}*7`), badMeal("~BOSTON26")],
  ["an empty code", rawFragment(`${valid}.~`), /bad code/],
  ["a code with an underscore", rawFragment(`${valid}.~BOSTON_26`), /bad code/],
  ["a code with a space", rawFragment(`${valid}.~BOSTON 26`), /bad code/],
  ["a code of 41 characters", rawFragment(`${valid}.~${"A".repeat(41)}`), /bad code/],
  ["two codes", rawFragment(`${valid}.~A.~B`), badMeal("~A")],
];

for (const [label, fragment, reason] of CASES) {
  test(`R2-02 fill B refuses: ${label}`, async () => {
    const page = await orderPage();
    const h = fakeWindow({ fragment, document: page.document });
    run(await script(), h.window);
    h.timers.drain();
    assertRefused(h, "/order?mpid=21", reason);
    assert.equal(page.total(), 0, "nothing pressed");
  });
}

test("R2-02 control: the valid payload the cases are mutated from is read by fill B", async () => {
  for (const fragment of [rawFragment(valid), rawFragment(`${valid}.~BOSTON-26`), rawFragment(`${valid}.~${"A".repeat(40)}`)]) {
    const page = await orderPage();
    const b = fakeWindow({ fragment, page });
    run(await script(), b.window);
    b.timers.drain();
    assertCheckedOut(b, page, "/order?mpid=21");
  }
});
