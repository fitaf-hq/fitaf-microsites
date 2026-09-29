// R2-01: a payload version 2 (SPEC-rung2 § 11) as the link tool writes it is read by the shipped script: every meal
// (including a non-ASCII name) and count arrives intact, and the plan is the page's own ?mpid=. The offer code is
// accepted but not applied. Fill A reads the same payload and then refuses it: a v2 link carries no product id, which A
// needs for every line it writes (§ 6; see R2-06).
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
  payloadText,
  refKey,
  run,
  script,
} from "./r2-harness.mjs";

// mpid 24 is Lean 21: 1 + 20.
const PAYLOAD = {
  mpid: 24,
  items: [
    { name: "Birria de Res Bowl", qty: 1 },
    { name: "Jalapeño Lime Chicken", qty: 20 },
  ],
  code: "BOSTON26",
};

test("R2-01a: the v2 form: \"2\", one key per meal (\"*n\" above 1), the code last; ASCII, dot-separated, no plan id", () => {
  const text = payloadText(PAYLOAD);
  assert.equal(text, `2.${refKey("Birria de Res Bowl")}.${refKey("Jalapeño Lime Chicken")}*20.~BOSTON26`);
  assert.match(text, /^[\x21-\x7e]+$/, "printable ASCII");
  assert.ok(!text.includes("24"), "the plan's id is not in the fragment");
});

test("R2-01b: fill A reads it (the log names the page's plan and the unapplied code), then refuses: no product id", async () => {
  const storage = new FakeStorage({ [CART_KEY]: '[{"localId":"36688"}]' });
  const before = storage.dump();
  const h = fakeWindow({ path: "/order?mpid=24", fragment: fragmentFor(PAYLOAD), storage });
  run(await script("A"), h.window);
  assert.ok(h.info.includes("[fitaf-handoff] fill A, mpid 24; offer code not applied"), JSON.stringify(h.info));
  assertRefused(h, "/order?mpid=24", new RegExp(`stopped: no product id: ${refKey("Birria de Res Bowl")}$`));
  assert.equal(storage.dump(), before, "storage byte-identical");
});

test("R2-01c: fill B reads it: each meal pressed its count, then the store's own CHECKOUT (§ 8)", async () => {
  const page = await orderPage();
  const h = fakeWindow({ path: "/order?mpid=24", fragment: fragmentFor(PAYLOAD), page });
  run(await script("B"), h.window);
  h.timers.drain();
  assert.equal(page.presses.get("Birria de Res Bowl").length, 1);
  assert.equal(page.presses.get("Jalapeño Lime Chicken").length, 20);
  assert.ok(h.info.includes("[fitaf-handoff] fill B, mpid 24; offer code not applied"), JSON.stringify(h.info));
  assertCheckedOut(h, page, "/order?mpid=24");
});
