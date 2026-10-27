// SP10 (SPEC-save-offer-production.md § 9 items 2 and 3): the event a save names. The page sends as `event_id` the `?e=`
// code it was opened with when that code names an entry of data/events.json, read by the same function the analytics
// beacon reads it with (one reading, never two), and the page's own event otherwise: the first event on `/` and on the
// one production page (a development /<event-id>/ page keeps its own, SPEC § 9.1). In both builds. And E1 (a recording
// sender) read "at Fit AF's Boston event" and "at eatfitaf.com": data/events.json's new names. ⚠ Since
// SPEC-ui-and-copy-pass § 8 item 7 (2026-10-26) E1 has no such line ("You saved this offer at [event] yesterday" is
// removed), so the case holds the event each save stores, and E1 naming neither. The page assertion is
// sp-fixture.mjs's, so sp-mutants.test.mjs runs it on a page that sends the first event whatever the code.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import events from "../data/events.json" with { type: "json" };
import { devPage } from "./dev-page.mjs";
import { assertEventFromCode, ONE_READING } from "./sp-fixture.mjs";
import { approvedPage } from "./sp-production.mjs";
import { simulatePage } from "./page-sim.mjs";
import { IN_ZIP, postSave, RecordingSender, rows, runSendDue, startWorker, validSave, FixedRedemptions } from "./worker-harness.mjs";

test("SP10: data/events.json's names — demo \"eatfitaf.com\", boston \"Fit AF's Boston event\"; ids and URLs as they were", () => {
  assert.deepEqual(
    events.map((e) => [e.id, e.name, e.url]),
    [
      ["demo", "eatfitaf.com", "https://eatfitaf.com/"],
      ["boston", "Fit AF's Boston event", "https://eatfitaf.com/?e=boston"],
      ["seminar", "the seminar of 23 October 2026", "https://eatfitaf.com/?e=seminar"],
    ],
  );
});

test("SP10: the development page at / — ?e=boston sends boston; no code, or a code naming no event, sends the first", async () => {
  await assertEventFromCode(await devPage(), { fallback: events[0].id });
});

test("SP10: a development /<event-id>/ page keeps its own event when no code names one", async () => {
  const html = await devPage({ eventId: "boston" });
  const sent = async (search) => {
    const page = simulatePage(html, { search });
    page.type("save-email", "dummy-sp10@example.com");
    page.type("save-zip", IN_ZIP);
    page.el("save-form").dispatch("submit");
    await page.settle();
    return JSON.parse(page.record.fetches[0].init.body).event_id;
  };
  assert.equal(await sent(""), "boston");
  assert.equal(await sent("?e=demo"), "demo");
});

test("SP10: the production page (production true) — the same reading", async () => {
  await assertEventFromCode((await approvedPage()).html, { fallback: events[0].id });
});

test("SP10: one reading — the page reads ?e= in one function, which the beacon and the save step both call", async () => {
  for (const html of [await devPage(), (await approvedPage()).html]) {
    assert.equal(html.split(ONE_READING).length - 1, 1, "the ?e= pattern appears once");
    assert.equal([...html.matchAll(/\bfunction qrEvent\(/g)].length, 1, "one declaration");
    assert.equal([...html.matchAll(/\bqrEvent\(/g)].length, 3, "the declaration and two calls (the beacon's open, the save step)");
  }
});

const { mf, db } = await startWorker();
after(() => mf.dispose());

test("SP10: each save stores its event (boston, demo); E1 (a recording sender) names neither (SPEC-ui-and-copy-pass § 8 item 7)", async () => {
  for (const [email, event_id] of [["dummy-sp10-boston@example.com", "boston"], ["dummy-sp10-demo@example.com", "demo"]]) {
    assert.deepEqual((await postSave(mf, validSave({ email, event_id }))).json, { ok: true });
  }
  const latest = Math.max(...(await rows(db, "SELECT send_at FROM saves")).map((r) => Date.parse(r.send_at)));
  const sender = new RecordingSender();
  await runSendDue(db, { nowMs: latest + 60_000, sender, redemptions: new FixedRedemptions() });
  const stored = Object.fromEntries(
    (await rows(db, "SELECT c.email, s.event_id FROM saves s JOIN save_contacts c USING (save_id)")).map((r) => [r.email, r.event_id]),
  );
  assert.deepEqual(stored, { "dummy-sp10-boston@example.com": "boston", "dummy-sp10-demo@example.com": "demo" }, "each save's event");
  assert.equal(sender.messages.length, 2, "control: both E1s went");
  for (const m of sender.messages) {
    for (const part of [m.text, m.html]) {
      assert.doesNotMatch(part, /You saved this offer|Fit AF's Boston event|yesterday/, `${m.to}: no event named`);
    }
  }
});
