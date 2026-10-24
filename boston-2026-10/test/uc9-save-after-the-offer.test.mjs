// UC9 (SPEC-ui-and-copy-pass.md § 1 item 9, as § 1.2 item 3 rules it, the Advisor 2026-10-23: "your ideas are good so
// please implement them"): after the last offer's valid_to the step still renders, beside the card's checkout button,
// with no offer: "Not ready today? Save your plan, and we'll email you when our next offer opens." and "Save my plan"
// (the Advisor's draft words; the fine print and the done line proposed, drafts, in consent/DRAFT.md § 1), and it saves
// the email, the ZIP code and the tick WITH NO OFFER, sending nothing: no E1 is due for it (send_at and message_state
// NULL: a message state of its own, no message, as a reissued code's row has). It is kept 30 days from the save, then
// its contact deleted unless its tick was confirmed (the lapse's rule for a save with no offer). A save made while the
// offer is live is as before. The Worker through worker-harness.mjs on fixed clocks; the page as a browser runs it.
// ⭐ Mutant (a copy of the Worker's tree, its entry's one line naming a save's send_at made the next morning whatever the
// offer): an E1 scheduled for a save with no offer -> UC9 fails, by its own assertion; the unchanged copy passes.
import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import saveConfig from "../data/save.json" with { type: "json" };
import { ROOT } from "../build.mjs";
import { d1Adapter } from "../src/worker/d1-adapter.js";
import { lapse } from "../src/worker/lapse.js";
import { lapseInputs } from "../src/worker/scheduled.js";
import { zonedTimeToInstant } from "../src/worker/zoned-time.js";
import { readingOrder } from "./save-end-fixture.mjs";
import { CHECKOUT, IN_ZIP, openStep, saveWith, shown, weekPage } from "./uc-harness.mjs";
import { CODE_RE, FixedRedemptions, postSave, RecordingSender, rows, runSendDue, startWorker, validSave } from "./worker-harness.mjs";

const ZONE = saveConfig.send_time_zone;
const at = (ymd, hour) => zonedTimeToInstant(ymd, hour, ZONE);
const DAY_MS = 86_400_000;
/** The day after the Boston offer's last (2026-10-29), noon in New York: no offer is live. */
const AFTER = at("2026-10-30", 12);
/** The step's words after the offer's end: the Advisor's (§ 1.2 item 3). */
const LEAD = "Not ready today? Save your plan, and we'll email you when our next offer opens.";
const BUTTON = "Save my plan";
/** The line DRAFT § 1 gives a paragraph of the after-the-end block, as a reader reads it. */
const squash = (s) => s.replace(/\*+/g, "").replace(/\s+/g, " ").trim();

/** A save's rows, both tables, by its email. */
async function savedAs(db, email) {
  const [row] = await rows(
    db,
    "SELECT s.kind, s.offer_id, s.offer_code, s.send_at, s.message_state, s.state, c.email, c.zip, c.consent_marketing " +
      "FROM saves s JOIN save_contacts c ON c.save_id = s.save_id WHERE c.email = ?",
    email,
  );
  return row;
}

/** UC9's rule for the Worker at `mf`/`db` (its clock after the offer): the save stored with no offer and nothing due. */
async function assertSavedWithNothingDue({ mf, db }, where) {
  const email = "dummy-uc9@example.com";
  const res = await postSave(mf, validSave({ email, consent_marketing: true }));
  assert.deepEqual([res.status, res.json], [200, { ok: true }], `${where}: the save is taken`);
  const row = await savedAs(db, email);
  assert.deepEqual(
    { kind: row.kind, offer_id: row.offer_id, send_at: row.send_at, message_state: row.message_state, state: row.state, email: row.email, zip: row.zip, tick: row.consent_marketing },
    { kind: "offer", offer_id: null, send_at: null, message_state: null, state: "saved", email, zip: IN_ZIP, tick: 1 },
    `${where}: stored with no offer, the email, the ZIP code and the tick, and no message due`,
  );
  assert.match(row.offer_code, CODE_RE, `${where}: its link's token, as every offer save's (never shown)`);
  const sender = new RecordingSender();
  for (const day of ["2026-10-31", "2026-11-15"]) await runSendDue(db, { nowMs: at(day, 9), sender, redemptions: new FixedRedemptions() });
  assert.equal(sender.messages.length, 0, `${where}: nothing is sent, the next morning or later`);
}

test("UC9: after the offer's end, an offer save is stored with no offer, the email, the ZIP code and the tick, and nothing is sent", async () => {
  const worker = await startWorker({ now: AFTER });
  try {
    await assertSavedWithNothingDue(worker, "after the offer");
  } finally {
    await worker.mf.dispose();
  }
});

test("UC9 (control): a save while the offer is live still has its E1 due the next morning", async () => {
  const { mf, db } = await startWorker({ now: at("2026-10-24", 12) });
  try {
    await postSave(mf, validSave({ email: "dummy-uc9-live@example.com" }));
    const [row] = await rows(db, "SELECT offer_id, message_state, send_at FROM saves");
    assert.deepEqual([row.offer_id !== null, row.message_state], [true, "scheduled"]);
    assert.equal(row.send_at, new Date(at("2026-10-25", saveConfig.send_hour)).toISOString());
  } finally {
    await mf.dispose();
  }
});

test("UC9: kept 30 days from the save, then its contact deleted unless its tick was confirmed", async () => {
  const { mf, db } = await startWorker({ now: AFTER });
  try {
    await postSave(mf, validSave({ email: "dummy-uc9-a@example.com", consent_marketing: true }));
    await postSave(mf, validSave({ email: "dummy-uc9-b@example.com", consent_marketing: true }));
    await db.prepare("UPDATE save_contacts SET confirmed_at = ? WHERE email = ?").bind(new Date(AFTER).toISOString(), "dummy-uc9-b@example.com").run();
    const contacts = async () => (await rows(db, "SELECT email FROM save_contacts ORDER BY email")).map((r) => r.email);
    const run = (nowMs) => lapse(d1Adapter(db), lapseInputs(nowMs), { dryRun: false });
    const day29 = await run(AFTER + 29 * DAY_MS);
    assert.equal(day29.no_offer, 0, "day 29: kept");
    assert.deepEqual(await contacts(), ["dummy-uc9-a@example.com", "dummy-uc9-b@example.com"]);
    const day31 = await run(AFTER + 31 * DAY_MS);
    assert.equal(day31.no_offer, 1, "day 31: the unconfirmed one lapses");
    assert.deepEqual(await contacts(), ["dummy-uc9-b@example.com"], "its contact deleted; the confirmed one kept");
    const states = await rows(db, "SELECT s.state, c.email FROM saves s LEFT JOIN save_contacts c ON c.save_id = s.save_id ORDER BY s.state");
    assert.deepEqual(states.map((r) => r.state), ["lapsed", "saved"], "the save row stays, lapsed (it is how we count, not who)");
  } finally {
    await mf.dispose();
  }
});

test("UC9: the page after the offer's end — the step beside checkout, its own words, no offer; it saves, and says so", async () => {
  const html = await weekPage();
  const page = openStep(html, { hash: CHECKOUT, now: AFTER });
  assert.equal(shown(page, "offer-box"), false, "no offer box (no offer to show)");
  assert.equal(shown(page, "save"), true, "the step, beside the card's checkout button");
  const read = readingOrder(page.el("save")).map((n) => n.textContent.replace(/\s+/g, " ").trim());
  assert.ok(read.includes(LEAD), `its lead: ${LEAD}`);
  assert.ok(read.includes(BUTTON), `its button: ${BUTTON}`);
  for (const id of ["save-step-offer", "save-lead", "save-submit", "save-notice"]) assert.equal(shown(page, id), false, `the offer's #${id} not shown`);
  assert.equal(shown(page, "save-notice-later"), true, "its own fine print");
  await saveWith(page);
  assert.equal(page.fetches.length, 1, "the save is sent");
  assert.equal(JSON.parse(page.fetches[0].init.body).kind, "offer", "as an offer save (the Worker finds no offer for it)");
  assert.equal(shown(page, "save-done-later"), true, "its own done line");
  assert.equal(shown(page, "save-done"), false, "not the offer's (no email tomorrow)");
});

test("UC9: the step's words after the end are DRAFT § 1's (a draft); on the page as written", async () => {
  const md = await readFile(join(ROOT, "consent", "DRAFT.md"), "utf8");
  const block = md.split("## 1. What the visitor sees")[1].split("## 2.")[0].split("### After the offer ends")[1];
  assert.ok(block, "DRAFT § 1 carries the step after the offer ends");
  const paragraphs = block.split(/\n>\s*\n/).map((p) => squash(p.split("\n").filter((l) => l.startsWith(">")).map((l) => l.slice(1)).join(" "))).filter(Boolean);
  assert.deepEqual(paragraphs.slice(0, 2), [LEAD, `[ ${BUTTON} ]`], "the Advisor's lead and button");
  const html = await weekPage();
  const text = squash(html.replace(/<[^>]+>/g, " ").replace(/&#39;/g, "'"));
  // As S18 reads § 1: a button's brackets and the notice's link are the page's own; "(their email)" the done line's slot.
  const onPage = (p) => squash(p.replace(/^\[ (.+) \]$/, "$1").replace("[Privacy notice]", "Privacy notice").replace("(their email) ", ""));
  assert.equal(paragraphs.length, 4, "the lead, the button, the fine print and the done line");
  for (const p of paragraphs) assert.ok(text.includes(onPage(p)), `on the page: ${p}`);
});

test("UC9: mutant — an E1 scheduled for a save with no offer (its send_at the next morning whatever the offer) -> UC9 fails", async () => {
  const SITE = "const sendAt = save.kind === \"expansion\" ? now : offer ? nextMorning : null;";
  const tree = async (mutate) => {
    const dir = await mkdtemp(join(tmpdir(), "boston-uc9-tree-"));
    for (const name of ["src", "data", "scripts"]) await cp(join(ROOT, name), join(dir, name), { recursive: true });
    const entry = join(dir, "src", "worker", "index.js");
    const source = await readFile(entry, "utf8");
    assert.equal(source.split(SITE).length - 1, 1, "the mutation site occurs exactly once in the copy's index.js");
    if (mutate) await writeFile(entry, source.replace(SITE, "const sendAt = save.kind === \"expansion\" ? now : nextMorning;"));
    return { dir, entry };
  };
  for (const mutate of [false, true]) {
    const { dir, entry } = await tree(mutate);
    const worker = await startWorker({ now: AFTER, main: entry });
    try {
      if (!mutate) await assertSavedWithNothingDue(worker, "the unchanged copy");
      else {
        await assert.rejects(
          assertSavedWithNothingDue(worker, "the mutant"),
          (err) => err instanceof assert.AssertionError && /the mutant: stored with no offer, the email, the ZIP code and the tick, and no message due/.test(err.message),
          "UC9 must fail on the mutant, by its own assertion",
        );
      }
    } finally {
      await worker.mf.dispose();
      await rm(dir, { recursive: true, force: true });
    }
  }
});
