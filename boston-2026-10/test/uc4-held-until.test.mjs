// UC4 (SPEC-ui-and-copy-pass.md § 1 item 4, the Advisor's note f-good-until: "Let's harmonize on "held until""): /o's
// "Good until" (an unknown link's page, and a current offer without a code after an ended one) and every "good until" a
// code's line prints (E1's and /o's) read "Held until" / "held until", and consent/DRAFT.md's copies with them. The
// Worker's own handlers, through the harness's Worker (the committed offers, or a case's own) and messages.js's e1.
import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { insertRows, saveRows } from "../scripts/dummy-saves.mjs";
import { e1 } from "../src/worker/messages.js";
import { longDate } from "../src/worker/offers.js";
import { validateSave } from "../src/worker/validate-save.js";
import { pageText } from "./sp-production.mjs";
import { fetchPage, PAST_OFFER, PAST_OFFER_ID, startWorker, TEST_NOW_MS, validSave } from "./worker-harness.mjs";

const LATER = { applies_to: "general", valid_from: "2000-01-01", valid_to: "2026-12-31" };
const LATER_DATE = longDate(LATER.valid_to);

/** /o/<code> for a save of the past offer (ended 2026-06-30), in a Worker whose current offer is `current`. */
async function welcomeBack(current) {
  const own = await startWorker({ offers: { status: "fixture", offers: [PAST_OFFER, current] } });
  try {
    const original = saveRows(validateSave(validSave({ email: "dummy-uc4@example.com" })), {
      nowMs: TEST_NOW_MS,
      state: "lapsed",
      saveOverrides: { offer_id: PAST_OFFER_ID, message_state: "sent", send_at: "2026-06-01T13:00:00.000Z" },
    });
    await insertRows(own.db, [{ saveRow: original.saveRow }]);
    const res = await fetchPage(own.mf, `/o/${original.saveRow.offer_code}`);
    assert.match(res.text, /that offer ended/, "control: WELCOME_BACK");
    return pageText(res.text);
  } finally {
    await own.mf.dispose();
  }
}

test("UC4: an unknown link's page says Held until, never Good until", async () => {
  const { mf } = await startWorker();
  try {
    const words = pageText((await fetchPage(mf, "/o/ZZZZ9999")).text);
    assert.ok(words.includes("Our current offer"), "control: the unknown link's page");
    assert.ok(words.includes("Held until October 29, 2026"), "Held until the offer's last day");
    assert.doesNotMatch(words, /good until/i);
  } finally {
    await mf.dispose();
  }
});

test("UC4: after an ended offer, a current offer without a code says Held until; one with a code, its line · held until", async () => {
  const none = await welcomeBack({ ...LATER, id: "uc4-none", label: "UC4 fixture: no code", code_mode: "none" });
  assert.ok(none.includes(`Held until ${LATER_DATE}`), `no code: Held until ${LATER_DATE}`);
  const unique = await welcomeBack({ ...LATER, id: "uc4-unique", label: "UC4 fixture: unique codes", code_mode: "unique" });
  assert.match(unique, new RegExp(`Your code: [A-Z0-9]{4}-[A-Z0-9]{4} · held until ${LATER_DATE}`), "a reissued code: · held until");
  const shared = await welcomeBack({ ...LATER, id: "uc4-shared", label: "UC4 fixture: a shared code", code_mode: "shared", shared_code: "UC4SHARED" });
  assert.ok(shared.includes(`Your code: UC4SHARED · held until ${LATER_DATE}`), "a shared code: · held until");
  for (const words of [none, unique, shared]) assert.doesNotMatch(words, /good until/i);
});

test("UC4: E1 for an offer with a code — Your code … · held until", () => {
  const offer = { id: "uc4-coded", valid_to: "2026-11-30", code_mode: "unique" };
  const m = e1({ to: "dummy-uc4@example.com", code: "SAMPLE23", offer, event: { name: "the sample event" }, siteUrl: "https://uc4.example.test", token: null });
  assert.ok(m.text.split("\n").includes("Your code: SAMP-LE23 · held until November 30, 2026"), "the text part");
  assert.doesNotMatch(m.text + m.html, /good until/i, "nowhere in either part");
});

test("UC4: no \"good until\" left in the Worker's sources or in consent/DRAFT.md; DRAFT § 3's code line reads held until", async () => {
  const dir = join(ROOT, "src", "worker");
  for (const file of (await readdir(dir)).filter((f) => f.endsWith(".js"))) {
    assert.doesNotMatch(await readFile(join(dir, file), "utf8"), /good until/i, `src/worker/${file}`);
  }
  const md = await readFile(join(ROOT, "consent", "DRAFT.md"), "utf8");
  assert.doesNotMatch(md, /good until/i, "consent/DRAFT.md");
  assert.ok(md.includes("> *(an offer with a code)* **Your code: XXXX-XXXX** · held until **[date]**"), "DRAFT § 3's line for an offer with a code");
});
