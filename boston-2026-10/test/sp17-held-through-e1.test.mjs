// SP17 (SPEC-save-offer-production.md § 10.9, the Advisor's ruling of 2026-10-22): a save holds through the morning its
// email arrives; the wording without a code.
//   - a save's held date is the later of its offer's valid_to and the day its E1 is due: a save on 2026-10-29 at 15:00
//     Eastern is held until 2026-10-30 (E1, /o, and E1's /confirm link that day), a save on 2026-10-24 until 2026-10-29;
//     on 2026-10-31 the 10-29 save's /o is the lapse and its link gone;
//   - the page's step says the date as the page can know it (the offer's valid_to, or the next day on the last day), and
//     carries no "code" but the ZIP code's label;
//   - DRAFT.md carries § 10.9 item 2's words, and the confirmation page says "weekly".
// The clocks are the harness's (a case's own `now`) and page-sim's; nothing depends on the day a case runs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import saveConfig from "../data/save.json" with { type: "json" };
import { ROOT } from "../build.mjs";
import { insertRows, saveRows } from "../scripts/dummy-saves.mjs";
import { handleConfirm } from "../src/worker/confirm.js";
import { validateSave } from "../src/worker/validate-save.js";
import { zonedTimeToInstant } from "../src/worker/zoned-time.js";
import { hiddenInTree, openPlanPage } from "./cc-harness.mjs";
import { pageText } from "./sp-production.mjs";
import { approvedWeekPage, weekPage } from "./uc-harness.mjs";
import { FixedRedemptions, linkIn, postSave, RecordingSender, rows, runSendDue, startWorker, validSave } from "./worker-harness.mjs";

const ZONE = saveConfig.send_time_zone;
const at = (ymd, hour) => zonedTimeToInstant(ymd, hour, ZONE);
const iso = (ms) => new Date(ms).toISOString();
const LAST_DAY = "2026-10-29";
const NEXT = "2026-10-30";
const AFTER = "2026-10-31";
const held = (date) => `Your pricing is held until ${date}`;

/** A save made through the Worker at `instant`, its E1 sent the morning it is due: the message and the save's row. */
async function saveAndSend(instant, { consent_marketing = false } = {}) {
  const { mf, db } = await startWorker({ now: instant });
  const email = `dummy-sp17-${instant}@example.com`;
  assert.deepEqual((await postSave(mf, validSave({ email, consent_marketing }))).json, { ok: true }, "the save is accepted");
  const [row] = await rows(db, "SELECT * FROM saves");
  const sender = new RecordingSender();
  await runSendDue(db, { nowMs: Date.parse(row.send_at), sender, redemptions: new FixedRedemptions() });
  return { mf, db, row, message: sender.messages[0] };
}

test("SP17: a save on 2026-10-29 at 15:00 Eastern — E1 is due 2026-10-30 and says the pricing is held until October 30, 2026", async () => {
  const { mf, row, message } = await saveAndSend(at(LAST_DAY, 15));
  try {
    assert.equal(row.send_at, iso(at(NEXT, 9)), "control: E1 due at 09:00 Eastern on 2026-10-30");
    assert.ok(message.text.split("\n").includes(held("October 30, 2026")), message.text);
    assert.ok(!message.text.includes("This offer has ended"), "never the ended form for a save made within the offer");
  } finally {
    await mf.dispose();
  }
});

test("SP17: a save on 2026-10-24 keeps 2026-10-29", async () => {
  const { mf, message } = await saveAndSend(at("2026-10-24", 12));
  try {
    assert.ok(message.text.split("\n").includes(held("October 29, 2026")), message.text);
  } finally {
    await mf.dispose();
  }
});

test("SP17: the 10-29 save's /o page on 2026-10-30 is the held offer (until October 30, 2026); on 2026-10-31 the lapse", async () => {
  const saved = saveRows(validateSave(validSave({ email: "dummy-sp17-o@example.com" })), { nowMs: at(LAST_DAY, 15) });
  for (const [day, expect] of [[NEXT, "held"], [AFTER, "lapse"]]) {
    const { mf, db } = await startWorker({ now: at(day, 12) });
    try {
      await insertRows(db, [saved]);
      const res = await mf.dispatchFetch(`http://localhost/o/${saved.saveRow.offer_code}`, { headers: { "CF-Connecting-IP": "198.51.100.17" } });
      const words = pageText(await res.text());
      if (expect === "held") {
        assert.ok(words.includes("Your offer") && words.includes(held("October 30, 2026")), `${day}: the held offer (${words})`);
      } else {
        assert.ok(words.includes("This offer has ended") && !words.includes("held until"), `${day}: the lapse (${words})`);
      }
    } finally {
      await mf.dispose();
    }
  }
});

test("SP17: the 10-29 save's E1 link to /confirm works on 2026-10-30, and is gone on 2026-10-31", async () => {
  const { mf, db, message } = await saveAndSend(at(LAST_DAY, 15), { consent_marketing: true });
  try {
    const token = linkIn(message.text, "/confirm/");
    assert.ok(token, "control: the ticked E1 carries the link");
    const status = async (day) =>
      (await handleConfirm(new Request(`http://localhost/confirm/${token}`), { DB: db }, token, { now: iso(at(day, 12)), today: day })).status;
    assert.equal(await status(NEXT), 200, "the morning it arrives");
    assert.equal(await status(AFTER), 404, "and gone the day after");
  } finally {
    await mf.dispose();
  }
});

/** The step's markup (section#save), as a visitor reads it, with the page's script having filled its slots at `now`.
 *  ⚠ AMENDED by SPEC-ui-and-copy-pass § 1 item 2 (2026-10-23): the step is shown only beside a week's Continue to
 *  checkout, so the pages carry the fixture week (#lean-or-7d its cart) and run as a browser runs them (openPlanPage). */
function stepAt(html, now) {
  const page = openPlanPage(html, { now, hash: "#lean-or-7d" });
  const section = /<section class="save js-only" id="save"[\s\S]*?<\/section>/.exec(html)[0];
  return { date: page.el("save-held-date").textContent, text: pageText(section), shown: !hiddenInTree(page.el("save")) };
}

test("SP17: the page's step says the date held (the offer's last day, or the next day on it) and no code but the ZIP code's label", async () => {
  for (const [name, html] of [["the development page", await weekPage()], ["the production page (production true)", (await approvedWeekPage()).html]]) {
    for (const [day, date] of [["2026-10-24", "October 29, 2026"], ["2026-10-28", "October 29, 2026"], [LAST_DAY, "October 30, 2026"]]) {
      const step = stepAt(html, at(day, 12));
      assert.ok(step.shown, `${name} on ${day}: the step`);
      assert.equal(step.date, date, `${name} on ${day}: held until ${date}`);
    }
    const { text } = stepAt(html, at("2026-10-24", 12));
    assert.match(text, /with today's pricing held until \. We'll send it once\./, `${name}: the slot in its sentence`);
    assert.deepEqual(text.replace(/\bZIP code\b/g, "").match(/\bcodes?\b/gi) ?? [], [], `${name}: no "code" in the step but the ZIP code's label`);
  }
});

test("SP17: DRAFT.md carries § 10.9 item 2's words; the confirmation page says weekly", async () => {
  const md = await readFile(join(ROOT, "consent", "DRAFT.md"), "utf8");
  const flat = md.replace(/\n>\s?/g, " ").replace(/\*+/g, "").replace(/\s+/g, " ");
  for (const words of [
    "Not ready today? Save it — tomorrow morning we'll email you a link back here, with today's pricing held until [date]. We'll send it once.",
    "we'll send your link here tomorrow",
    "We'll use your email to send this once, tomorrow.",
    "to send the saved offer, or the expansion news, they asked for",
    "The saved offer and its event are kept",
    "Fit AF menus and offers. Weekly; unsubscribe anytime.",
    "Menus and offers by email, weekly.",
  ]) assert.ok(flat.includes(words), `DRAFT.md: ${words}`);
  assert.doesNotMatch(flat, /about once a week/i, "no 'about once a week' left");
  const { mf, db, message } = await saveAndSend(at("2026-10-24", 12), { consent_marketing: true });
  try {
    const token = linkIn(message.text, "/confirm/");
    const res = await handleConfirm(new Request(`http://localhost/confirm/${token}`), { DB: db }, token, { now: iso(at("2026-10-25", 12)), today: "2026-10-25" });
    assert.ok(pageText(await res.text()).includes("Menus and offers by email, weekly."), "the confirmation page");
  } finally {
    await mf.dispose();
  }
});
