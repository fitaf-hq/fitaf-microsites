import test, { after } from "node:test";
import assert from "node:assert/strict";
import offersFile from "../data/offers.json" with { type: "json" };
import { longDate, offerById } from "../src/worker/offers.js";
import { validateSave } from "../src/worker/validate-save.js";
import { addDays } from "../src/worker/zoned-time.js";
import { insertRows, saveRows } from "../scripts/dummy-saves.mjs";
import { CODE_RE, dumpAllTables, fetchPage, PAST_OFFER_ID, postSave, rows, startWorker, validSave } from "./worker-harness.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());
const codeOnPage = (text) => /Your code: <strong>([A-Z0-9]{4})-([A-Z0-9]{4})<\/strong>/.exec(text)?.slice(1).join("");

// The save is made today, so its offer is the one live today: since SPEC-save-offer-production § 10 the Boston event's
// offer (2026-10-01 to 2026-10-29) has no code and its page says the date its pricing is held until, and the general
// offer after it has one (SP12 holds the Boston offer's page at fixed dates).
test("S11: /o/<code> ORIGINAL — a known code whose offer is live shows that offer: its code, or the date it is held until", async () => {
  await postSave(mf, validSave({ email: "dummy-o1@example.com" }));
  const { offer_code: code, event_id, offer_id } = await db.prepare("SELECT offer_code, event_id, offer_id FROM saves").first();
  const offer = offerById(offer_id);
  for (const path of [`/o/${code}`, `/o/${code.slice(0, 4)}-${code.slice(4)}`]) {
    const res = await fetchPage(mf, path);
    assert.equal(res.status, 200);
    assert.match(res.text, /<h1>Your offer<\/h1>/);
    if (offer.code_mode === "none") {
      assert.match(res.text, new RegExp(`<p>Your pricing is held until <strong>${longDate(offer.valid_to)}</strong></p>`));
      assert.ok(!res.text.includes(code) && !/code/i.test(res.text.replace(/<[^>]*>/g, " ")), "no code on the page");
    } else {
      assert.equal(codeOnPage(res.text), code);
    }
    // SPEC-save-offer-production § 9.2 (ruled 2026-10-21): the page at /, the save's event in ?e=, #from-email (production
    // serves the page at / alone; /<event-id>/ is the development build's).
    assert.match(res.text, new RegExp(`href="/\\?e=${event_id}#from-email">Build my plan →`));
    assert.equal(res.headers["cache-control"], "no-store");
  }
});

test("S11: WELCOME_BACK — an expired offer's code gets the current offer and ONE reissued code, idempotent on revisit", async () => {
  const original = saveRows(validateSave(validSave({ email: "dummy-o2@example.com" })), {
    state: "lapsed",
    saveOverrides: { offer_id: PAST_OFFER_ID, message_state: "sent" },
  });
  await insertRows(db, [{ saveRow: original.saveRow }]); // a year on: the contact is long gone
  const code = original.saveRow.offer_code;

  const first = await fetchPage(mf, `/o/${code}`);
  assert.match(first.text, /<h1>Welcome back — that offer ended, but here's what we have now<\/h1>/);
  const reissued = codeOnPage(first.text);
  assert.match(reissued, CODE_RE);
  assert.notEqual(reissued, code);
  const again = await fetchPage(mf, `/o/${code}`);
  assert.equal(codeOnPage(again.text), reissued, "a revisit shows the same reissued code");
  assert.equal(again.text, first.text);

  const reissues = await rows(db, "SELECT * FROM saves WHERE kind = 'reissue'");
  assert.equal(reissues.length, 1, "at most one reissue per original per offer");
  assert.equal(reissues[0].reissued_from, original.saveRow.save_id, "linked to the original save");
  assert.equal(reissues[0].offer_code, reissued);
  assert.equal(reissues[0].event_id, original.saveRow.event_id, "attribution kept");
  assert.equal((await rows(db, "SELECT * FROM save_contacts WHERE save_id = ?", reissues[0].save_id)).length, 0, "no contact");

  const reissuedPage = await fetchPage(mf, `/o/${reissued}`);
  assert.match(reissuedPage.text, /<h1>Your offer<\/h1>/, "the reissued code is itself ORIGINAL");
});

test("S11: CURRENT — unknown and malformed codes get byte-identical pages, and write nothing", async () => {
  const before = (await dumpAllTables(db)).text;
  const pages = ["/o/ABCD2345", "/o/ZZZZ9999", "/o/abc", "/o/", "/o/ABCD-2345", "/o/ABCDE2345"].map((p) => fetchPage(mf, p));
  const [a, ...others] = await Promise.all(pages);
  assert.equal(a.status, 200);
  assert.match(a.text, /<h1>Our current offer<\/h1>/);
  for (const o of others) assert.equal(o.text, a.text);
  assert.doesNotMatch(a.text, /ABCD|ZZZZ/, "nothing from the request is echoed");
  assert.equal((await dumpAllTables(db)).text, before);
});

// Since SPEC-save-offer-production § 10 an offer may carry `code_mode: "none"` (no code field): the Boston event's does.
// Since its § 10.2 (2026-10-22) the Boston event offer's label is approved, with the same `label` and `label_approved` as
// boston/print-final's (28e951a); the file's status stays placeholder, every other offer still "[The offer]".
const APPROVED_LABELS = { "event-boston-2026-10-placeholder": { label: "Sign up today to save 25%", label_approved: "2026-10-21" } };
test("S11b: data/offers.json — placeholders but the Boston offer's approved label, and exactly one general offer current on every date", () => {
  assert.equal(offersFile.status, "placeholder");
  const { offers } = offersFile;
  const ids = offers.map((o) => o.id);
  assert.equal(new Set(ids).size, ids.length, "ids unique");
  for (const o of offers) {
    assert.deepEqual(Object.keys(o).filter((k) => !["id", "label", "label_approved", "applies_to", "valid_from", "valid_to", "code_mode", "shared_code"].includes(k)), []);
    const approved = APPROVED_LABELS[o.id];
    if (approved) assert.deepEqual({ label: o.label, label_approved: o.label_approved }, approved, `${o.id}: its approved label`);
    else assert.deepEqual({ label: o.label, label_approved: o.label_approved }, { label: "[The offer]", label_approved: undefined }, `${o.id} is a placeholder`);
    assert.ok(["event", "general"].includes(o.applies_to));
    assert.ok(["unique", "shared", "none"].includes(o.code_mode));
    assert.equal(o.code_mode === "shared" ? o.shared_code : undefined, o.code_mode === "shared" ? "PLACEHOLDER" : undefined);
    assert.ok(o.valid_from <= o.valid_to, `${o.id} dates in order`);
  }
  const general = offers.filter((o) => o.applies_to === "general").sort((x, y) => x.valid_from.localeCompare(y.valid_from));
  assert.ok(general[0].valid_from <= "2000-01-01", "covered from the start");
  assert.equal(general.at(-1).valid_to, "9999-12-31", "covered to the end");
  for (let i = 1; i < general.length; i++) {
    assert.equal(general[i].valid_from, addDays(general[i - 1].valid_to, 1), "contiguous: no gap, no overlap");
  }
  assert.ok(offers.some((o) => o.id === PAST_OFFER_ID && o.valid_to < "2026-09-01"), "a past offer exists for the expired paths");
});
