// MS-5 (SPEC-meal-selection.md § 6, § 5): a version-1 picks file (`menus` with "7" and "14", the week delivered 10-18 as
// written before this release) still builds; its `7` is the cart of *or*, every day, no breakfast and its `14` of *and*,
// every day, no breakfast, at every size (the same lines and links as before); the other six answer sets fall back to
// today's card, Choose your meals alone (§ 4). The committed week (data/picks/, version 1) builds too.
import test from "node:test";
import assert from "node:assert/strict";
import { PICKS_DIR } from "../build.mjs";
import { v1Problems } from "./ms-checks.mjs";
import { pageOf, V1_DIR } from "./ms-harness.mjs";
import { FIXTURE } from "./cc-harness.mjs";

test("MS-5: the version-1 fixture builds; its 7 and 14 are the two default rows' carts; the others fall back", async () => {
  assert.equal(FIXTURE.version, undefined, "fixture control: test/fixtures/picks/2026-10-04.json is version 1 (no version)");
  assert.deepEqual(Object.keys(FIXTURE.menus).sort(), ["14", "7"], "fixture control: its two menus");
  assert.deepEqual(v1Problems(await pageOf({ picks: V1_DIR })), []);
});

test("MS-5: the committed week (version 1) builds under the new questions", async () => {
  await assert.doesNotReject(pageOf({ picks: PICKS_DIR, on: "2026-10-01" }));
});
