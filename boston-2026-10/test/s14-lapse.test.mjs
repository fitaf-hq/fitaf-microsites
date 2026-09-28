import test, { after } from "node:test";
import assert from "node:assert/strict";
import { lapseInputs } from "../src/worker/scheduled.js";
import { d1Adapter, dumpAllTables, startWorker } from "./worker-harness.mjs";
import { assertLapseIsCorrect, lapseFixture, lapseModulePath, NOW_MS } from "./lifecycle-fixture.mjs";
import { insertRows } from "../scripts/dummy-saves.mjs";

const run = await startWorker();
const dry = await startWorker();
after(() => Promise.all([run.mf.dispose(), dry.mf.dispose()]));

test("S14: lapse -> each of the three rules deletes the contact and sets `lapsed`; nothing else touched", async () => {
  await assertLapseIsCorrect(await import(lapseModulePath()), run.db);
});

test("S14: lapse inputs — offer end + 30 days, 7 days unconfirmed, 365 days confirmed", () => {
  const inputs = lapseInputs(NOW_MS);
  assert.deepEqual(inputs.lapsedOfferIds, ["event-past-placeholder"], "2026-06-30 + 30 days < 2026-09-27; nothing else ended");
  assert.equal(inputs.expansionCreatedBefore, "2026-09-20T16:00:00.000Z");
  assert.equal(inputs.expansionConfirmedBefore, "2025-09-27T16:00:00.000Z");
  assert.deepEqual(lapseInputs(Date.parse("2026-07-30T16:00:00Z")).lapsedOfferIds, [], "on day 30 exactly, not yet");
  assert.deepEqual(lapseInputs(Date.parse("2026-07-31T16:00:00Z")).lapsedOfferIds, ["event-past-placeholder"], "day 31");
});

test("S14: a dry run (the default) counts and changes nothing", async () => {
  const lapseModule = await import(lapseModulePath());
  await insertRows(dry.db, lapseFixture().fixture);
  const before = (await dumpAllTables(dry.db)).text;
  const result = await lapseModule.lapse(d1Adapter(dry.db), lapseInputs(NOW_MS));
  assert.deepEqual(result, { dry_run: true, offer: 3, expansion_unconfirmed: 1, expansion_retention: 1 });
  assert.equal((await dumpAllTables(dry.db)).text, before);
});
