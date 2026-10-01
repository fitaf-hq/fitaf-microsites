// R2-20 (SPEC-rung2 § 10): the plan already FULL — the store shows its checkout control before any press (CHECKOUT
// below 1025 px, CHECKOUT NOW at 1025 px and wider) — is the same stop as R2-19: "stopped: the plan already holds
// meals", no press at all, not even of that CHECKOUT. So are the store's other non-empty states, per § 10's build
// note: over the plan's maximum ("Limit Exceeded" / "REMOVE N MEAL(S) TO CHECKOUT"), and a CHECKOUT shown disabled
// while the store is busy. The check goes by what the store displays, enabled or not.
import test from "node:test";
import assert from "node:assert/strict";
import { heldCase, MEALS, script } from "./r2-harness.mjs";

const SEVEN = [MEALS[0], MEALS[1], MEALS[1], MEALS[2], MEALS[2], MEALS[2], MEALS[2]];

const EXPECT = {
  full: { bar: ["CHECKOUT"], sidebar: ["CHECKOUT NOW"] },
  over: { bar: ["Limit Exceeded (disabled)"], sidebar: ["REMOVE 1 MEAL TO CHECKOUT (disabled)"] },
  busy: { bar: ["CHECKOUT (disabled)"], sidebar: ["CHECKOUT NOW (disabled)"] },
};

for (const width of ["bar", "sidebar"]) {
  test(`R2-20a ${width}: the plan already full, its CHECKOUT enabled before any press — stopped, not pressed`, async () => {
    const { before, page } = await heldCase(await script(), { width, pending: SEVEN });
    assert.deepEqual(before, EXPECT.full[width], "fixture control");
    assert.deepEqual(page.controls, [], "the store's CHECKOUT not pressed");
  });

  test(`R2-20b ${width}: the plan over its maximum (8 of 7) — the same`, async () => {
    const { before } = await heldCase(await script(), { width, pending: [...SEVEN, MEALS[0]] });
    assert.deepEqual(before, EXPECT.over[width], "fixture control");
  });

  test(`R2-20c ${width}: the plan full, its CHECKOUT shown disabled (the store busy) — the same`, async () => {
    const { before } = await heldCase(await script(), { width, pending: SEVEN, loadingTicks: 6 });
    assert.deepEqual(before, EXPECT.busy[width], "fixture control");
  });
}
