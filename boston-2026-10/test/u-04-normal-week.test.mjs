// U4 (SPEC-week-content.md § 8 items 3 and 5): a normal week is byte-identical to before § 8, the page and the content.
// "Before" is d1dac5b's own tree (the contract's commit), recorded by test/u-04-record.mjs into u-04-golden.json: per
// normal week (the two fixtures and the committed 2026-10-18) and target, the content command's files, the page as served
// with that week, and the visible page at seven fragments. The page's own bytes must move (the card's script reads
// `updating`), so it is compared once its lines naming `updating` are removed: § 8 adds whole lines only, each naming it,
// and changes no line that was there (§ 8.1). The content and the visible page are compared whole.
// ⚠ Like WC-9, this pins d1dac5b's inputs: an intended change to them (the words, data/plans.json, the fixtures, the
// committed 2026-10-18 week or its sheet) turns it red, and it is then re-recorded (`node test/u-04-record.mjs`).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ROOT } from "../build.mjs";
import { normalWeekRecord } from "./u-checks.mjs";

const golden = JSON.parse(await readFile(new URL("./u-04-golden.json", import.meta.url), "utf8"));

test("U4: a normal week, the content and the page as served, byte-identical to d1dac5b's (the page's updating lines apart)", async () => {
  assert.equal(golden.recorded_at, "d1dac5b");
  assert.deepEqual(await normalWeekRecord(ROOT), golden.record);
});
