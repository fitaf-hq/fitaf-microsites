import test, { after } from "node:test";
import assert from "node:assert/strict";
import offersFile from "../data/offers.json" with { type: "json" };
import { validateSave } from "../src/worker/validate-save.js";
import { addDays } from "../src/worker/zoned-time.js";
import { insertRows, saveRows } from "../scripts/dummy-saves.mjs";
import { CODE_RE, dumpAllTables, fetchPage, PAST_OFFER_ID, postSave, rows, startWorker, validSave } from "./worker-harness.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());
const codeOnPage = (text) => /Your code: <strong>([A-Z0-9]{4})-([A-Z0-9]{4})<\/strong>/.exec(text)?.slice(1).join("");

test("S11: /o/<code> ORIGINAL — a known code whose offer is live shows that code", async () => {
  await postSave(mf, validSave({ email: "dummy-o1@example.com" }));
  const { offer_code: code, event_id } = await db.prepare("SELECT offer_code, event_id FROM saves").first();
  for (const path of [`/o/${code}`, `/o/${code.slice(0, 4)}-${code.slice(4)}`]) {
    const res = await fetchPage(mf, path);
    assert.equal(res.status, 200);
    assert.match(res.text, /<h1>Your offer<\/h1>/);
    assert.equal(codeOnPage(res.text), code);
    assert.match(res.text, new RegExp(`href="/${event_id}/#from-email">Build my plan →`));
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

test("S11b: data/offers.json — placeholders only, and exactly one general offer current on every date", () => {
  assert.equal(offersFile.status, "placeholder");
  const { offers } = offersFile;
  const ids = offers.map((o) => o.id);
  assert.equal(new Set(ids).size, ids.length, "ids unique");
  for (const o of offers) {
    assert.deepEqual(Object.keys(o).filter((k) => !["id", "label", "applies_to", "valid_from", "valid_to", "code_mode", "shared_code"].includes(k)), []);
    assert.equal(o.label, "[The offer]", `${o.id} is a placeholder`);
    assert.ok(["event", "general"].includes(o.applies_to));
    assert.ok(["unique", "shared"].includes(o.code_mode));
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
