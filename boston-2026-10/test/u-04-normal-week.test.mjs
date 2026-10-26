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
// ⚠ RE-RECORDED at e2284f1 (`node test/u-04-record.mjs --commit e2284f1`): SPEC-why-fit-af.md § 6 (2026-10-21) makes the
// /why/ page's link back to the plan page close the dialog, from app.js, which is inlined in the page. Against
// f02807e's record, all six contents and the visible page at all seven fragments were byte-identical; the six served
// pages moved (each +516 bytes: app.js's seven added lines, SPEC-why-fit-af § 6.1 lists them). From here the reference
// is e2284f1's tree.
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
// ⚠ RE-RECORDED at 1305f62 (`node test/u-04-record.mjs --commit 1305f62`): SPEC-save-offer-production.md § 1 (2026-10-21)
// puts the offer's line in the save step and makes its two buttons the page's quieter button, on the development page by
// design. Against f02807e's record, the three production entries (page and visible) and all six contents were
// byte-identical; the three development pages moved (+635 bytes each: the line, its style and comment, the buttons'
// class, the render line) and their visible page at the six answered fragments (the step is shown there; "(no fragment)"
// unchanged, the step hidden before a plan is chosen). From here the reference is 1305f62's tree.
// ⚠ RE-RECORDED at e11f775 (`node test/u-04-record.mjs --commit e11f775`): SPEC-save-offer-production.md § 9 (2026-10-21)
// puts the page's one reading of ?e= (src/qr-event.js) at the head of the analytics script on EVERY page, and on the
// development page links the form's Privacy notice to /privacy/ and sends the ?e= event. Against 1305f62's record, all six
// contents and the three production entries' visible pages were byte-identical; the three production pages moved by +63
// bytes each (the analytics script alone: S20's note lists the lines); the three development pages by +370 each (the same
// lines, the link in place of "[Privacy notice]", flow1.js's event lines) and their visible
// page at the six answered fragments (the link's words). From here the reference is e11f775's tree.
// ⚠ RE-RECORDED at 596d116 (`node test/u-04-record.mjs --commit 596d116`): the merge into boston/live-week-every-menu
// (2026-10-21) of boston/every-menu, boston/save-offer-production and boston/analytics-json onto boston/why-button,
// whose three records above (e2284f1, f72040a, e11f775) each held one branch's pages. Against each: all six contents
// byte-identical; the visible page at all 42 entries byte-identical to e11f775's record (save-offer-production's six
// answered development fragments, the only visible change of the three branches; why-button's and every-menu's records
// equal f02807e's there); the six served pages moved by exactly the union of the three branches' lines (`git merge-file`
// of every-menu's and save-offer-production's page into why-button's, each over 84807ce's, gives 596d116's byte for
// byte with no conflict; each production page +10,772 bytes and each development page +11,714 against f02807e's
// record). analytics-json changes no page. From here the reference is 596d116's tree.
// ⚠ RE-RECORDED at 5231265 (`node test/u-04-record.mjs --commit 5231265`): SPEC-every-menu-and-nutrition § 11
// (2026-10-22) with SPEC-meal-selection § 13. Every entry moved, and by § 11 alone: each content's week/picks-data.json
// is ce91cba's with each heading's " (<range>)" removed (cc-harness rangeless; 2, 8 and 8 headings; every other file
// byte-identical), and each served page is 5231265's own build's page with that content put in (pageWithWeek), byte for
// byte, so it moves by the build's § 11 lines and the headings alone (S20's note; § 11.1); the visible pages follow (the
// heading, the button and its no-script link above the tabs). From here the reference is 5231265's tree.
// ⚠ RE-RECORDED at 773e597 (`node test/u-04-record.mjs --commit 773e597`): § 11.2 (Why Fit AF? an outline button in the
// unselected chip's look). All six contents byte-identical to 5231265's record; each served page 773e597's own build's
// page with the same content put in, byte for byte (+647 bytes each, the build's lines: S20's note); the visible pages
// follow (the button's and its no-script link's class). From here the reference is 773e597's tree.
// ⚠ RE-RECORDED at a593811 (`node test/u-04-record.mjs --commit a593811`): SPEC-save-offer-production § 10 (2026-10-22, the
// offer a price promise; the official ZIP list). All six contents, the three production entries and every visible page
// byte-identical to 773e597's record; only the three development pages moved, each by +4,929 bytes: the page's save-data
// (the official list of 316 codes in place of the mock's eight prefixes; the Boston offer's valid_to 2026-10-29) and
// classifyZip's lines (the near ring by prefix). Built from 5f1e9f8's and a593811's trees (git archive), the development
// build differs in index.html, demo/, boston/ and seminar/ by those lines alone, and in /privacy/ by § 6's contact and
// response days. From here the reference is a593811's tree.
// ⚠ RE-RECORDED at 8f3baf0 (`node test/u-04-record.mjs --commit 8f3baf0`): its § 10.2 (the Boston offer's approved label).
// Against a593811's record, all six contents, production's three entries and every visible page byte-identical; the
// three development pages +14 bytes each, the save-data line alone (the Boston offer's label "[The offer]" -> "Sign up today
// to save 25%"; build:dev of both trees differs by that line in index.html, demo/, boston/ and seminar/, nothing else;
// the production builds identical). From here the reference is 8f3baf0's tree.
// ⚠ RE-RECORDED at 1dc7b05 (`node test/u-04-record.mjs --commit 1dc7b05`): § 10.7 (one offer, every visitor's, from
// 2026-10-01 to 2026-10-29; after it no offer is offered). Against 8f3baf0's record, all six contents and production's three
// entries byte-identical; the three development pages +19 bytes each (save-data's one offer; offers.js's and flow1.js's
// lines, the box and the step drawn only while an offer is live), and their visible pages at all seven fragments: U4 reads
// them at 2026-09-29, before the one offer, where 8f3baf0's page showed the general placeholder ("[The offer]"); now the
// offer box and the save step are not drawn. Element by element (scratch proof over both trees' development pages) the
// visible pages only lose lines: the box (6) at "(no fragment)", the box and the step (37) at #lean-7 and #family; nothing
// is added. From here the reference is 1dc7b05's tree.
// ⚠ RE-RECORDED at a3897d8 (`node test/u-04-record.mjs --commit a3897d8`): § 10.9 (a save held through its E1's day; the
// wording without a code). Against 1dc7b05's record, all six contents, production's three entries and every visible page
// byte-identical (U4 reads them on 2026-09-29, where no step is drawn); the three development pages +997 bytes each: the
// step's four reworded lines (section.html), heldUntil, longDate and addDays inlined with MS_PER_DAY, and flow1.js's lines
// filling the date held. build:dev of both trees differs in index.html, demo/, boston/ and seminar/ by those lines alone.
// ⚠ RE-RECORDED at ede2e07 (`node test/u-04-record.mjs --commit ede2e07`): SPEC-ui-and-copy-pass § 1 (2026-10-23).
// Against a3897d8's record, all six contents byte-identical; the three production pages +3,909 bytes each, item 8's card
// alone (the chips' grid, the count badge's rules, #cc-list's data-meal-qty and the script reading a line's count back),
// their visible page at the answered fragments (the card's attribute, a counted meal's badge and hidden words); the three
// development pages +9,720 bytes each (item 8's lines, items 1–3's box, step and messages, item 7's prices after the offer
// and plan-prices.js), their visible page at every fragment (the Family anchor, SAVE_FAMILY, is gone). Both trees' builds
// differ in index.html, demo/, boston/, seminar/ and privacy/ alone (§ 1 item 5's two paragraphs on the last).
// ⚠ RE-RECORDED at dbfcb62 (`node test/u-04-record.mjs --commit dbfcb62`): SPEC-ui-and-copy-pass § 1.2. Against ede2e07's
// record, all six contents byte-identical; the three production pages +531 bytes each (item 1: #plan-data's meals and
// totals, app.js's lines), their visible page at the two answer sets above their plan; the three development pages +2,451
// bytes each (item 1, item 2's struck prices, item 3's step with no offer), their visible page where a cart shows the step
// (U4 reads it on 2026-09-29, when no offer is live, so the step shows with no offer). Both trees' builds differ in
// index.html, demo/, boston/, seminar/ and privacy/ alone (DRAFT § 6's retention on the last).
// ⚠ RE-RECORDED at e8fd524 (`node test/u-04-record.mjs --commit e8fd524`): § 1.2 item 3's email help line after the
// offer's end (found in Chrome at the build). Against dbfcb62's record: contents and the production pages unchanged; the
// three development pages +310 bytes each (the field's second help line and the two lines showing one), their visible
// page where the step shows (on 2026-09-29, no offer live: the step's own help line).
// ⚠ RE-RECORDED at 8bfe4f8 (`node test/u-04-record.mjs --commit 8bfe4f8 --release-a`): SPEC-ui-and-copy-pass § 2 (round 2
// changeset 1, 2026-10-25: who it is for first, the goal last, the calculator below the goal's answers; the Family line;
// read_on). Recorded as this case builds since SPEC-save-offer-production § 12 (production false and release (a)'s
// wording, the recorder's new --release-a; without it the recorder built each commit's own data/save.json, production true
// since c6dd3a5, which this case no longer compares): the recorder with --release-a at c6dd3a5 reproduces e8fd524's record
// exactly. Against it, all six contents byte-identical; the three production pages +97 bytes each and the three
// development pages +1,738 bytes each, by § 2's lines alone (both trees' builds compared line by line: § 2.1 lists them),
// and their visible page at every fragment (the first question at the top of each; #family's Family line).
// ⚠ RE-RECORDED at 077f472 (`node test/u-04-record.mjs --commit 077f472 --release-a`): SPEC-ui-and-copy-pass § 2.2
// (Family's own question; the result card shared by both panels; a cart Family takes carries Family's link). The recorder
// at 8bfe4f8 reproduces 8bfe4f8's record exactly. Against it: the v1 fixture's two contents byte-identical (no cart of 5
// or 10); the v2 fixture's and the committed week's (2026-10-18) +100 and +267 bytes, by Family's link on and-5d alone
// (MS-20 and W4 compare every other byte with older trees); the three production pages +2,661 to +2,928 bytes and the
// development pages +2,627 to +2,894; the visible page at every fragment (visible() keeps the displayed markup, and the
// result card now sits outside the individual panel).
// ⚠ RE-RECORDED at 5eaad96 (`--commit 5eaad96 --release-a`): the Family door hidden in a browser too (§ 2.2, found by
// Storybook's run). The recorder at 077f472 reproduces 077f472's record. Against it: all six contents and every visible
// page byte-identical; every page +167 bytes, the template's one rule and its comment.
// ⚠ RE-RECORDED at f9273c0 (`--commit f9273c0 --release-a --without-snack-cells`): SPEC-analytics.md § 13 item 2 (the
// analytics script sends the first question's and Family's own question's answers). The first record of a tree after the
// hand-off's merge (c31603d), whose snack cells this case removes before comparing (below), so the recorder reads them as
// this case does (its new `--without-snack-cells`; without it the committed week's content and two visible pages would
// move by those cells, which § 13 does not touch). Controls: the recorder with `--release-a` at 5eaad96 reproduces
// 5eaad96's record byte for byte, and with both flags at 0fd55e3 its record is 5eaad96's. Against it: all six contents and
// every visible page byte-identical; every page +202 bytes, the script's three lines.
// ⚠ RE-RECORDED at 50515d9 (`--commit 50515d9 --release-a --without-snack-cells`): SPEC-ui-and-copy-pass.md § 3 (the
// desktop column: the template's token line and its media block). Control: the recorder with both flags at 2b409bb
// reproduces f9273c0's record (recorded_at apart). Against it: all six contents and every visible page byte-identical;
// every page +558 bytes.
// From here the reference is 50515d9's tree.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ROOT } from "../build.mjs";
import { normalWeekRecord } from "./u-checks.mjs";
import { productionFalseSavePath, withReleaseAWording } from "./cc-harness.mjs";
import { withoutSnackCells } from "./snack-cells.mjs";

const golden = JSON.parse(await readFile(new URL("./u-04-golden.json", import.meta.url), "utf8"));

test("U4: a normal week, the content and the page as served, byte-identical to 50515d9's (the page's updating lines apart)", async () => {
  assert.equal(golden.recorded_at, "50515d9");
  // SPEC-save-offer-production § 12: the pages as release (a) made them (its data/save.json), the rollback.
  // ⚠ Amended for SPEC-rung2-progress-and-checkout § 31.2 item 1 (2026-10-25): a snack link's photo part now carries its
  // snacks' cells; the week's data and the page are read with exactly those removed (test/snack-cells.mjs
  // withoutSnackCells), every other byte as e8fd524's. (Its recorder builds a commit's own tree, production true since
  // SPEC-save-offer-production § 12, where U4 reads release (a)'s pages, so it is not re-run for this.) Since SPEC-analytics
  // § 13 the recorder reads them so too, with `--release-a --without-snack-cells`: these options exactly.
  let cut = 0;
  const undo = (text) => {
    const read = withoutSnackCells(text);
    cut += read.links;
    return read.text;
  };
  const options = {
    savePath: await productionFalseSavePath(),
    transform: (html) => undo(withReleaseAWording(html)),
    content: (bytes, key) => (key.endsWith(".json") ? Buffer.from(undo(bytes.toString("utf8")), "utf8") : bytes),
  };
  assert.deepEqual(await normalWeekRecord(ROOT, options), golden.record);
  assert.ok(cut > 0, "control: the snack links' cells were there to remove");
});
