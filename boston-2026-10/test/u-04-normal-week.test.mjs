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
// ⚠ RE-RECORDED at 5f55cbc (`node test/u-04-record.mjs --commit 5f55cbc`): SPEC-meal-selection.md § 12 (2026-10-20) puts
// each answer pair's default on the left, makes *Weekdays only* the default and moves the snack block inside the card's
// list, by design. Against ac52905's record, all six contents and the visible page at "(no fragment)" and #family were
// byte-identical; the six served pages and their visible page at the five answered fragments moved (§ 12.1 lists the
// lines). From here the reference is 5f55cbc's tree.
// ⚠ RE-RECORDED at f02807e (`node test/u-04-record.mjs --commit f02807e`): SPEC-why-fit-af.md § 2 (2026-10-21) puts the
// "Why Fit AF?" button, its dialog (the /why/ page in a frame) and its no-script link in the footer, by design. Against
// 5f55cbc's record, all six contents were byte-identical; the six served pages and their visible page at all seven
// fragments moved (the footer is on every one; SPEC-why-fit-af § 4 lists the lines). From here the reference is
// f02807e's tree.
// ⚠ RE-RECORDED at 9a19f48 (`node test/u-04-record.mjs --commit 9a19f48`): SPEC-every-menu-and-nutrition.md §§ 2–4
// (2026-10-21) put the chooser's fieldset, its styles and the card's new script on every page, by design. Against
// f02807e's record, all six contents and the visible page at all seven fragments were byte-identical (none of these
// weeks has a second list or meals, § 2 item 4); only the six served pages moved, each by 8,768 bytes (its § 9 lists the
// lines). From here the reference is 9a19f48's tree.
// ⚠ RE-RECORDED at f2d1748 (`node test/u-04-record.mjs --commit f2d1748`): the approved menu names (the Advisor's ruling
// of 2026-10-21) give the chooser's fieldset its aria-label, the page's one changed line. Against 9a19f48's record, all six
// contents (the heading now "{menu} ({week})", filled as before) and every visible fragment were byte-identical; only the
// six served pages moved, each by 18 bytes. From here the reference is f2d1748's tree.
// ⚠ RE-RECORDED at f72040a (`node test/u-04-record.mjs --commit f72040a`): SPEC-every-menu-and-nutrition § 10 (the
// Advisor, 2026-10-21) puts the 64 px touch target, the meal row as a button and its chevron in the card's style and
// script. Against f2d1748's record, all six contents and every visible fragment were byte-identical; only the six served
// pages moved, each by 1,407 bytes (§ 10.1 lists the lines). From here the reference is f72040a's tree.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ROOT } from "../build.mjs";
import { normalWeekRecord } from "./u-checks.mjs";

const golden = JSON.parse(await readFile(new URL("./u-04-golden.json", import.meta.url), "utf8"));

test("U4: a normal week, the content and the page as served, byte-identical to f72040a's (the page's updating lines apart)", async () => {
  assert.equal(golden.recorded_at, "f72040a");
  assert.deepEqual(await normalWeekRecord(ROOT), golden.record);
});
