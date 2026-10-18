// U4 (SPEC-week-content.md § 8 items 3 and 5): a normal week is byte-identical to before § 8, the page and the content.
// "Before" is d1dac5b's own tree (the contract's commit), recorded by test/u-04-record.mjs into u-04-golden.json: per
// normal week (the two fixtures and the committed 2026-10-18) and target, the content command's files, the page as served
// with that week, and the visible page at seven fragments. The page's own bytes must move (the card's script reads
// `updating`), so it is compared once its lines naming `updating` are removed: § 8 adds whole lines only, each naming it,
// and changes no line that was there (§ 8.1). The content and the visible page are compared whole.
// ⚠ Like WC-9, this pins d1dac5b's inputs: an intended change to them (the words, data/plans.json, the fixtures, the
// committed 2026-10-18 week or its sheet) turns it red, and it is then re-recorded (`node test/u-04-record.mjs`).
// ⚠ RE-RECORDED at 8bf4dc0 (`node test/u-04-record.mjs --commit 8bf4dc0`): SPEC-rung4-save-offer.md § 2b moves the
// development page's Flow 1 to the end by design. Against d1dac5b's record, the three production entries and all six
// contents were byte-identical and only the three development pages (bytes and visible) moved; the served page's diff
// was § 2b's lines alone. What U4 showed against d1dac5b (a normal week unchanged by § 8 but for its `updating` lines) held
// on every commit up to 8bf4dc0's parent (c415795); from here the reference is 8bf4dc0's tree, which carries § 8, and the
// lines naming `updating` are still removed before comparing.
// ⚠ RE-RECORDED at ac52905 (`node test/u-04-record.mjs --commit ac52905`), the merge of boston/analytics into
// boston/integration-1022: SPEC-analytics.md § 4 puts the analytics script (build.mjs analyticsSlot) one line before
// #plan-data on every page by design. Against 8bf4dc0's record, all six contents and every visible fragment were
// byte-identical and only the six served pages moved, each by 2,543 bytes; each served page of ac52905 with that slot and
// its newline removed is 45b5e37's byte for byte (45b5e37's own record was 8bf4dc0's). From here the reference is
// ac52905's tree, which carries the analytics.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ROOT } from "../build.mjs";
import { normalWeekRecord } from "./u-checks.mjs";

const golden = JSON.parse(await readFile(new URL("./u-04-golden.json", import.meta.url), "utf8"));

test("U4: a normal week, the content and the page as served, byte-identical to ac52905's (the page's updating lines apart)", async () => {
  assert.equal(golden.recorded_at, "ac52905");
  assert.deepEqual(await normalWeekRecord(ROOT), golden.record);
});
