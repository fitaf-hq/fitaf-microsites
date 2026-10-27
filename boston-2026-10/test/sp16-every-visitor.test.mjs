// SP16 (SPEC-save-offer-production.md § 10.7, the Advisor's ruling of 2026-10-22): every visitor gets the Boston offer
// until 2026-10-29, and after it no offer is offered.
//   - data/offers.json: one offer, the general one, the Boston offer (its approved label and label_approved, code_mode
//     none, valid_to 2026-10-29); no placeholder, so with its status approved the gate refuses nothing about the offers;
//   - a plain visit's save (no ?e=) on 2026-10-24 holds the pricing until 2026-10-29, and E1 says so;
//   - the page opened on 2026-10-30 (its clock: page-sim's `now`, as S21's date cases have it; the build is the same on
//     any date, S24) renders no save step and no offer box; on 2026-10-24 both;
//   - after the offer's end: the saved offer's page (/o/…) takes the lapse path (This offer has ended, the link to the
//     plans, nothing reissued), an unknown code's page too; E1 that goes after it says the offer has ended; the Worker
//     refuses an offer save (offer_ended), writing nothing.
// The Worker's clock is the harness's (TEST_NOW_MS, 2026-10-24) or a case's own; nothing depends on the day a case runs.
// ⚠ AMENDED by SPEC-ui-and-copy-pass § 1 (2026-10-23): item 2 shows the step only beside a week's Continue to checkout,
// so the page cases open the pages with the fixture week (#lean-or-7d its cart) as a browser runs them (openPlanPage);
// item 1 prints the headline in the box, so the label read is the step's line.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import offersFile from "../data/offers.json" with { type: "json" };
import { ROOT } from "../build.mjs";
import { insertRows, saveRows } from "../scripts/dummy-saves.mjs";
import { productionRefusals } from "../scripts/production-inputs.mjs";
import { offerForSave } from "../src/worker/offers.js";
import { validateSave } from "../src/worker/validate-save.js";
import { zonedTimeToInstant } from "../src/worker/zoned-time.js";
import saveConfig from "../data/save.json" with { type: "json" };
import { hiddenInTree, openPlanPage } from "./cc-harness.mjs";
import { devPage } from "./dev-page.mjs";
import { simulatePage } from "./page-sim.mjs";
import { approvedWeekPage, weekPage } from "./uc-harness.mjs";
import { lineTexts } from "./email-html.mjs";
import { pageText, productionInputs, saveData } from "./sp-production.mjs";
import { assertNoCodeText, BOSTON_OFFER_ID, HELD_LINE, HELD_UNTIL } from "./sp-promise.mjs";
import { count, FixedRedemptions, IN_ZIP, NEAR_ZIP, postSave, RecordingSender, rows, runSendDue, startWorker, validSave } from "./worker-harness.mjs";

const ZONE = saveConfig.send_time_zone;
const at = (ymd, hour) => zonedTimeToInstant(ymd, hour, ZONE);
const SAVE_DAY = "2026-10-24";
const AFTER = "2026-10-30";
/** The lapse page's heading, § 10.7 item 2's words. */
const ENDED = "This offer has ended";

test("SP16: data/offers.json holds one offer, the general one: the Boston offer, approved label, code_mode none, valid_to 2026-10-29", () => {
  assert.deepEqual(offersFile.offers.map((o) => o.id), [BOSTON_OFFER_ID], "one offer, the Boston offer");
  const [offer] = offersFile.offers;
  assert.equal(offer.applies_to, "general", "every visitor's");
  assert.equal(offer.label, "Sign up today to save 25%");
  assert.equal(offer.label_approved, "2026-10-21");
  assert.equal(offer.code_mode, "none");
  assert.ok(!("shared_code" in offer));
  assert.equal(offer.valid_to, HELD_UNTIL);
});

test("SP16: no placeholder offer — with its status approved (the switch-on's one change), the gate refuses nothing about the offers", async () => {
  const { dir, save, zips, vars, options } = await productionInputs();
  try {
    const draftText = await readFile(options.draftPath, "utf8");
    const offers = { ...structuredClone(offersFile), status: "approved" };
    const refusals = productionRefusals({ save, offers, zips, draftText, vars, printed: [] });
    assert.deepEqual(refusals.filter((r) => /offers\.json/.test(r)), [], "nothing about the offers");
    const committed = productionRefusals({ save, offers: offersFile, zips, draftText, vars, printed: [] }).filter((r) => /offers\.json/.test(r));
    // SPEC-save-offer-production § 12: release (b) made the switch-on's change, so the committed file is refused nothing.
    assert.deepEqual(committed, [], "control: as committed since release (b), its status approved, nothing");
  } finally {
    const { rm } = await import("node:fs/promises");
    await rm(dir, { recursive: true, force: true });
  }
});

test("SP16: a plain visit's save on 2026-10-24 (no ?e=) holds the pricing until 2026-10-29, and E1 says so", async () => {
  const page = simulatePage(await devPage(), { now: at(SAVE_DAY, 12) });
  page.type("save-email", "dummy-sp16-plain@example.com");
  page.type("save-zip", IN_ZIP);
  page.el("save-form").dispatch("submit");
  await page.settle();
  const body = JSON.parse(page.record.fetches[0].init.body);
  assert.equal(body.event_id, "demo", "control: a plain visit, the first event");
  const { mf, db } = await startWorker({ now: at(SAVE_DAY, 12) });
  try {
    assert.equal((await postSave(mf, body)).status, 200);
    const [row] = await rows(db, "SELECT offer_id, offer_code FROM saves");
    assert.equal(row.offer_id, BOSTON_OFFER_ID, "the Boston offer");
    const sender = new RecordingSender();
    await runSendDue(db, { nowMs: at("2026-10-25", 9), sender, redemptions: new FixedRedemptions() });
    const [m] = sender.messages;
    assert.ok(m.text.split("\n").includes(HELD_LINE), "E1: held until October 29, 2026");
    assert.ok(lineTexts(m.html).includes(HELD_LINE));
  } finally {
    await mf.dispose();
  }
});

/** The page opened at `instant` with a plan chosen (the fixture week's cart): whether the save step and the offer box are
 *  drawn, the offer's label the step shows, and (SPEC-ui-and-copy-pass § 1.2 item 3) whether it is the step with no offer. */
function stepAt(html, instant) {
  const page = openPlanPage(html, { now: instant, hash: "#lean-or-7d" });
  return {
    step: !hiddenInTree(page.el("save")),
    box: !hiddenInTree(page.el("offer-box")),
    label: page.el("save-step-offer-label").textContent,
    later: !hiddenInTree(page.el("save-lead-later")),
  };
}

// ⚠ AMENDED by SPEC-ui-and-copy-pass § 1.2 item 3 (2026-10-23, the Advisor: after the offer's end "We should still
// save"): on 2026-10-30 no offer box, and the step with no offer (UC9 holds its words and its save).
test("SP16: the page opened on 2026-10-30 renders no offer box and the step with no offer; on 2026-10-24 and on 2026-10-29, both with the offer", async () => {
  for (const [name, html] of [["the development page", await weekPage()], ["the production page (production true)", (await approvedWeekPage()).html]]) {
    for (const day of [SAVE_DAY, HELD_UNTIL]) {
      const on = stepAt(html, at(day, 12));
      assert.ok(on.step && on.box && !on.later, `${name} on ${day}: the step and the box, with the offer`);
      assert.equal(on.label, offerForSave(day, saveData(html).offers).label, `${name} on ${day}: the offer's label (the page's own offers)`);
    }
    for (const instant of [at(AFTER, 0) + 60_000, at(AFTER, 12), at("2027-06-01", 12)]) {
      const off = stepAt(html, instant);
      assert.ok(off.step && off.later, `${name} at ${new Date(instant).toISOString()}: the step with no offer`);
      assert.ok(!off.box, `${name} at ${new Date(instant).toISOString()}: no offer box`);
    }
  }
});

test("SP16: after the offer's end, the saved offer's page and an unknown code's take the lapse path; nothing reissued", async () => {
  const { mf, db } = await startWorker({ now: at(AFTER, 12) });
  try {
    const saved = saveRows(validateSave(validSave({ email: "dummy-sp16-after@example.com" })), { nowMs: at(SAVE_DAY, 12) });
    await insertRows(db, [saved]);
    const code = saved.saveRow.offer_code;
    for (const path of [`/o/${code}`, "/o/ZZZZ9999"]) {
      const res = await mf.dispatchFetch(`http://localhost${path}`, { headers: { "CF-Connecting-IP": "198.51.100.9" } });
      const html = await res.text();
      assert.equal(res.status, 200, path);
      assert.match(html, new RegExp(`<h1>${ENDED}</h1>`), `${path}: ${ENDED}`);
      assert.match(html, /<a href="\/\?(e=demo&amp;)?via=email">Build my plan →<\/a>/, `${path}: the link to the plans (via=email since SPEC-the-redirect.md § 4)`);
      assert.doesNotMatch(html, /class="action"/, `${path}: no orange button`);
      assertNoCodeText(pageText(html), code, path);
    }
    assert.deepEqual(await rows(db, "SELECT save_id FROM saves WHERE kind = 'reissue'"), [], "nothing reissued");
  } finally {
    await mf.dispose();
  }
});

// ⚠ AMENDED by SPEC-ui-and-copy-pass § 1.2 item 3: an offer save after the end is kept with no offer, nothing due (UC9).
test("SP16: after the offer's end, the Worker keeps an offer save with no offer and nothing due; an expansion save is still taken", async () => {
  const { mf, db } = await startWorker({ now: at(AFTER, 12) });
  try {
    assert.deepEqual((await postSave(mf, validSave({ email: "dummy-sp16-late@example.com" }))).json, { ok: true });
    assert.deepEqual(await rows(db, "SELECT offer_id, message_state, send_at FROM saves"), [{ offer_id: null, message_state: null, send_at: null }], "no offer, nothing due");
    assert.equal((await postSave(mf, validSave({ kind: "expansion", email: "dummy-sp16-x@example.com", zip: NEAR_ZIP }))).status, 200);
  } finally {
    await mf.dispose();
  }
});

// Since § 10.9 a save is held through the morning its E1 is due (a save on the last day until the next), so E1 says the
// offer has ended only when it goes after its held date: here a save of 2026-10-24 (held until 2026-10-29) whose E1 goes
// only on 2026-10-30 (no cron ran in between).
test("SP16: E1 that goes after its held date says the offer has ended (DRAFT § 3's form), not the date held", async () => {
  const { mf, db } = await startWorker({ now: at(SAVE_DAY, 12) });
  try {
    await postSave(mf, validSave({ email: "dummy-sp16-late@example.com" }));
    const sender = new RecordingSender();
    await runSendDue(db, { nowMs: at(AFTER, 9), sender, redemptions: new FixedRedemptions() });
    const [m] = sender.messages;
    const md = await readFile(join(ROOT, "consent", "DRAFT.md"), "utf8");
    const line = md.split("## 3. The emails")[1].split("**E-X")[0].split("\n").find((l) => l.startsWith("> *(sent after the offer's last day)*"));
    assert.ok(line, "DRAFT § 3 carries E1's form for an offer that ended before it went");
    const ended = line.slice(2).replace("*(sent after the offer's last day)*", "").replace(/\*+/g, "").trim();
    assert.equal(ended, ENDED);
    assert.ok(m.text.split("\n").includes(ENDED), `E1: ${ENDED}`);
    assert.ok(!m.text.includes(HELD_LINE), "not the date held");
    assert.ok(lineTexts(m.html).includes(ENDED));
  } finally {
    await mf.dispose();
  }
});
