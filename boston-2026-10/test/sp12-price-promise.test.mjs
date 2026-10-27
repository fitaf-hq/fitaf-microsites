// SP12 (SPEC-save-offer-production.md § 10 items 1–3 and 6): the offer is a price promise, not a discount code. The
// Boston event's offer carries `code_mode: "none"`, no code field, and `valid_to` 2026-10-29. A save made on any date
// before that day is held until it: E1 and the saved offer's page (/o/…) say "Your pricing is held until October 29,
// 2026" (DRAFT § 3's line) and carry no code in any visible text; the link's identifier is the opaque token in /o/'s path.
// After valid_to, the lapse path as today: /o says the offer ended, the /confirm link is gone, and the contact lapses
// 30 days after. The saves are written at fixed dates (scripts/dummy-saves.mjs saveRows, the Worker's own choice of
// offer at each date), sent by the cron's own step (a recording sender), and /o and /confirm are the Worker's own
// handlers called with a fixed date: nothing here depends on the day the case runs.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { insertRows, saveRows } from "../scripts/dummy-saves.mjs";
import { handleConfirm } from "../src/worker/confirm.js";
import { tokenMinter } from "../src/worker/confirm-token.js";
import { e1 } from "../src/worker/messages.js";
import { longDate, offerById } from "../src/worker/offers.js";
import { handleOffer } from "../src/worker/redeem.js";
import { lapse } from "../src/worker/lapse.js";
import { lapseInputs } from "../src/worker/scheduled.js";
import { validateSave } from "../src/worker/validate-save.js";
import { addDays, zonedTimeToInstant } from "../src/worker/zoned-time.js";
import saveConfig from "../data/save.json" with { type: "json" };
import { hrefsOf, lineTexts } from "./email-html.mjs";
import { pageText } from "./sp-production.mjs";
import { assertE1Promise, assertNoCodeText, BOSTON_OFFER_ID, draftHeldLine, HELD_LINE, HELD_UNTIL, workerTreeWith } from "./sp-promise.mjs";
import { d1Adapter, FixedRedemptions, linkIn, RecordingSender, rows, runSendDue, startWorker, TEST_CONFIRM_TOKEN_KEY, validSave } from "./worker-harness.mjs";

const BOSTON = offerById(BOSTON_OFFER_ID);
const ZONE = saveConfig.send_time_zone;
/** Noon in New York on `ymd`: a save made that day. */
const noonOn = (ymd) => zonedTimeToInstant(ymd, 12, ZONE);
/** 09:00 in New York on `ymd` (the send hour): the morning E1 goes. */
const nineOn = (ymd) => zonedTimeToInstant(ymd, saveConfig.send_hour, ZONE);
const iso = (ms) => new Date(ms).toISOString();

/** Every date from `from` to `to`, inclusive. */
function datesFrom(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** The saved offer's page at `today` (the Worker's handler; the lookup's rate limit is index.js's, not its). */
async function offerPage(db, code, today) {
  const res = await handleOffer({ DB: db }, code, { now: iso(nineOn(today)), today });
  return { status: res.status, html: await res.text() };
}

test("SP12: the Boston event's offer — code_mode none, no code field, valid_to 2026-10-29 (§ 10 item 1)", () => {
  assert.ok(BOSTON, `data/offers.json holds ${BOSTON_OFFER_ID}`);
  assert.equal(BOSTON.applies_to, "general", "every visitor's since § 10.7");
  assert.equal(BOSTON.code_mode, "none");
  assert.ok(!("shared_code" in BOSTON), "no code field");
  assert.equal(BOSTON.valid_to, HELD_UNTIL);
});

test("SP12: E1 for an offer without a code says the date its pricing is held until, and no code (DRAFT § 3)", async () => {
  await assertE1Promise(e1);
});

test("SP12: a save on every date before valid_to — E1 and /o say it is held until 2026-10-29, with no code text", async () => {
  const { mf, db, vars } = await startWorker();
  try {
    const dates = datesFrom(BOSTON.valid_from, addDays(BOSTON.valid_to, -1));
    assert.ok(dates.length >= 28, `control: the offer's whole window before its last day (${dates.length} dates)`);
    const saves = dates.map((d, i) => {
      const r = saveRows(validateSave(validSave({ email: `dummy-sp12-${d}@example.com`, consent_marketing: i % 2 === 0 })), { nowMs: noonOn(d) });
      assert.equal(r.saveRow.offer_id, BOSTON_OFFER_ID, `control: a save on ${d} gets the Boston offer`);
      return { d, ...r };
    });
    await insertRows(db, saves);

    const sender = new RecordingSender();
    const counts = await runSendDue(db, { nowMs: nineOn(BOSTON.valid_to), sender, redemptions: new FixedRedemptions() });
    assert.equal(counts.sent, dates.length, "control: every E1 goes, the last on the offer's last morning");
    const line = await draftHeldLine(longDate(BOSTON.valid_to));
    assert.equal(line, HELD_LINE, "control: DRAFT § 3's line, filled, is § 10 item 3's sentence");

    for (const { d, saveRow, contactRow } of saves) {
      const code = saveRow.offer_code;
      const m = sender.messages.find((x) => x.to === contactRow.email);
      const where = `a save on ${d}`;
      assert.ok(m.text.split("\n").includes(line), `${where}: E1's text says ${line}`);
      assert.ok(lineTexts(m.html).includes(line), `${where}: E1's HTML says it`);
      const link = `${vars.SITE_URL}/o/${code}`;
      assertNoCodeText(m.text, code, `${where}, E1's text`, { link });
      assertNoCodeText(lineTexts(m.html).join("\n"), code, `${where}, E1's HTML`);
      assert.equal(linkIn(m.text, "/o/"), code, `${where}: the button (Claim my offer since SPEC-ui-and-copy-pass § 8) -> /o/<token>`);
      assert.equal(hrefsOf(m.html)[0], link, `${where}: the HTML's first link, the button`);

      for (const today of [addDays(d, 1), BOSTON.valid_to]) {
        const page = await offerPage(db, code, today);
        const words = pageText(page.html);
        assert.equal(page.status, 200);
        assert.match(page.html, /<h1>Your offer<\/h1>/, `${where}, /o on ${today}: the saved offer`);
        assert.ok(words.includes(line), `${where}, /o on ${today}: says ${line}`);
        assertNoCodeText(words, code, `${where}, /o on ${today}`);
        assert.ok(!page.html.includes(code), `${where}, /o on ${today}: the page never prints its token`);
        assert.match(page.html, /href="\/\?e=demo#from-email">Build my plan →/, `${where}, /o on ${today}: the link back to the page`);
      }
    }
  } finally {
    await mf.dispose();
  }
});

test("SP12: after valid_to, the lapse path — /o says the offer ended, the /confirm link is gone, the contact lapses 30 days on", async () => {
  const { mf, db } = await startWorker();
  try {
    const saved = saveRows(validateSave(validSave({ email: "dummy-sp12-after@example.com", consent_marketing: true })), { nowMs: noonOn("2026-10-24") });
    assert.equal(saved.saveRow.offer_id, BOSTON_OFFER_ID, "control: a save on 2026-10-24 gets the Boston offer");
    await insertRows(db, [saved]);
    const sender = new RecordingSender();
    await runSendDue(db, { nowMs: nineOn("2026-10-25"), sender, redemptions: new FixedRedemptions() });
    // SPEC-ui-and-copy-pass § 8 item 7: E1 carries no /confirm link; the send step still derives the ticked save's token
    // and stores its hash, and that token's page is what this case holds.
    assert.equal(linkIn(sender.messages[0].text, "/confirm/"), null, "E1 carries no /confirm link");
    const token = await tokenMinter(TEST_CONFIRM_TOKEN_KEY)(saved.saveRow.save_id);
    assert.ok((await rows(db, "SELECT confirm_token_hash FROM save_contacts WHERE save_id = ?", saved.saveRow.save_id))[0].confirm_token_hash, "control: its hash was stored at the send");
    const code = saved.saveRow.offer_code;

    const last = await offerPage(db, code, BOSTON.valid_to);
    assert.ok(pageText(last.html).includes(HELD_LINE), "on its last day the offer is still held");
    const ended = await offerPage(db, code, addDays(BOSTON.valid_to, 1));
    // § 10.7: no offer follows it, so the ended offer's page is the lapse (This offer has ended, the link to the plans).
    assert.match(ended.html, /<h1>This offer has ended<\/h1>/, "the day after valid_to: the offer has ended");
    assert.ok(!pageText(ended.html).includes(HELD_LINE), "and no longer says it is held");

    const confirm = async (today) =>
      (await handleConfirm(new Request(`http://localhost/confirm/${token}`), { DB: db }, token, { now: iso(nineOn(today)), today })).status;
    assert.equal(await confirm(BOSTON.valid_to), 200, "the /confirm link works through valid_to");
    assert.equal(await confirm(addDays(BOSTON.valid_to, 1)), 404, "and is gone after it (the token expires with the offer)");

    const contact = async () => (await rows(db, "SELECT * FROM save_contacts WHERE save_id = ?", saved.saveRow.save_id))[0] ?? null;
    const at = (ymd) => lapseInputs(noonOn(ymd));
    assert.ok(!at(addDays(BOSTON.valid_to, 30)).lapsedOfferIds.includes(BOSTON_OFFER_ID), "30 days after valid_to: not yet");
    await lapse(d1Adapter(db), at(addDays(BOSTON.valid_to, 30)), { dryRun: false });
    assert.ok(await contact(), "the contact is kept 30 days after the offer ends");
    assert.ok(at(addDays(BOSTON.valid_to, 31)).lapsedOfferIds.includes(BOSTON_OFFER_ID), "31 days after: the offer has lapsed");
    await lapse(d1Adapter(db), at(addDays(BOSTON.valid_to, 31)), { dryRun: false });
    assert.equal(await contact(), null, "then the contact is deleted");
    assert.equal((await rows(db, "SELECT state FROM saves WHERE save_id = ?", saved.saveRow.save_id))[0].state, "lapsed");
  } finally {
    await mf.dispose();
  }
});

test("SP12: an ended offer's page whose current offer has no code — the current offer and its date, no code, nothing reissued", async () => {
  // A copy of the Worker's modules and data in which a later general offer without a code follows the Boston offer (since
  // § 10.7 none does in the committed file; § 10 item 1's rule is for any offer without a code).
  const tree = await workerTreeWith((offers) => {
    const later = { id: "general-later-fixture", label: "SP12 fixture: a later offer", applies_to: "general", valid_from: "2026-10-30", valid_to: "2026-12-31", code_mode: "none" };
    offers.offers.push(later);
    return later;
  });
  const { mf, db } = await startWorker();
  try {
    const { handleOffer: copied } = await import(tree.module("redeem.js"));
    const original = saveRows(validateSave(validSave({ email: "dummy-sp12-ended@example.com" })), {
      nowMs: noonOn("2026-10-24"),
      state: "lapsed",
      saveOverrides: { message_state: "sent" },
    });
    await insertRows(db, [{ saveRow: original.saveRow }]);
    const code = original.saveRow.offer_code;
    const res = await copied({ DB: db }, code, { now: iso(nineOn("2026-10-30")), today: "2026-10-30" });
    const html = await res.text();
    const words = pageText(html);
    assert.equal(res.status, 200);
    assert.match(html, /that offer ended/);
    assert.ok(words.includes(tree.edited.label), "the current offer");
    // SPEC-ui-and-copy-pass § 1 item 4 (2026-10-23): "held until", everywhere (it read "Good until").
    assert.ok(words.includes(`Held until ${longDate(tree.edited.valid_to)}`), "and the date it is held until");
    assertNoCodeText(words, code, "the ended offer's page");
    assert.deepEqual(await rows(db, "SELECT save_id FROM saves WHERE kind = 'reissue'"), [], "no code reissued");
  } finally {
    await mf.dispose();
    await tree.dispose();
  }
});
