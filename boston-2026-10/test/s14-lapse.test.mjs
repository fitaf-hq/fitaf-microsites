import test, { after } from "node:test";
import assert from "node:assert/strict";
import { lapseInputs } from "../src/worker/scheduled.js";
import { d1Adapter, dumpAllTables, startWorker } from "./worker-harness.mjs";
import { assertLapseIsCorrect, LAPSE_OFFERS, lapseFixture, lapseModulePath, NOW_MS } from "./lifecycle-fixture.mjs";
import { insertRows } from "../scripts/dummy-saves.mjs";

const run = await startWorker();
const dry = await startWorker();
after(() => Promise.all([run.mf.dispose(), dry.mf.dispose()]));

test("S14: lapse -> each of the three rules deletes the contact and sets `lapsed`; nothing else touched", async () => {
  await assertLapseIsCorrect(await import(lapseModulePath()), run.db);
});

// SPEC-save-offer-production § 10.7: NOW_MS is the harness's clock (2026-10-24), the ended offer the harness's past
// fixture (ended 2026-06-30), given to the lapse beside the committed one (LAPSE_OFFERS).
test("S14: lapse inputs — offer end + 30 days, 7 days unconfirmed, 365 days confirmed", () => {
  const inputs = lapseInputs(NOW_MS, LAPSE_OFFERS);
  assert.deepEqual(inputs.lapsedOfferIds, ["event-past-fixture"], "2026-06-30 + 30 days < 2026-10-24; the Boston offer is live");
  assert.equal(inputs.expansionCreatedBefore, "2026-10-17T16:00:00.000Z");
  assert.equal(inputs.expansionConfirmedBefore, "2025-10-24T16:00:00.000Z");
  // SPEC-ui-and-copy-pass § 1.2 item 3: a save with no offer is kept 30 days from the save (data/save.json no_offer_save_days).
  assert.equal(inputs.noOfferCreatedBefore, "2026-09-24T16:00:00.000Z");
  assert.deepEqual(lapseInputs(Date.parse("2026-07-30T16:00:00Z"), LAPSE_OFFERS).lapsedOfferIds, [], "on day 30 exactly, not yet");
  assert.deepEqual(lapseInputs(Date.parse("2026-07-31T16:00:00Z"), LAPSE_OFFERS).lapsedOfferIds, ["event-past-fixture"], "day 31");
  assert.deepEqual(lapseInputs(Date.parse("2026-11-28T17:00:00Z")).lapsedOfferIds, [], "the Boston offer: 2026-10-29 + 30 days, not yet");
  assert.deepEqual(lapseInputs(Date.parse("2026-11-29T17:00:00Z")).lapsedOfferIds, ["event-boston-2026-10-placeholder"], "day 31");
});

test("S14: a dry run (the default) counts and changes nothing", async () => {
  const lapseModule = await import(lapseModulePath());
  await insertRows(dry.db, lapseFixture().fixture);
  const before = (await dumpAllTables(dry.db)).text;
  const result = await lapseModule.lapse(d1Adapter(dry.db), lapseInputs(NOW_MS, LAPSE_OFFERS));
  assert.deepEqual(result, { dry_run: true, offer: 3, expansion_unconfirmed: 1, expansion_retention: 1, no_offer: 0 });
  assert.equal((await dumpAllTables(dry.db)).text, before);
});
