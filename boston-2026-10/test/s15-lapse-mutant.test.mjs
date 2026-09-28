import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { startWorker, writeMutant } from "./worker-harness.mjs";
import { assertLapseIsCorrect, LAPSE_PATH } from "./lifecycle-fixture.mjs";

const control = await startWorker();
const mutated = await startWorker();
after(() => Promise.all([control.mf.dispose(), mutated.mf.dispose()]));

test("S15: mutant — the lapse deletes from `saves` instead of `save_contacts` -> S14 fails", async () => {
  const before = await readFile(LAPSE_PATH, "utf8");
  await assertLapseIsCorrect(await import(LAPSE_PATH), control.db); // control: the real lapse passes S14

  const path = await writeMutant("lapse.js", '"DELETE FROM save_contacts WHERE', '"DELETE FROM saves WHERE');
  const mutant = await import(path); // a COPY; lapse.js itself is never written
  assert.notEqual(mutant.lapseSql({ lapsedOfferIds: [], now: "x" }).at(-1), (await import(LAPSE_PATH)).lapseSql({ lapsedOfferIds: [], now: "x" }).at(-1), "the copy is mutated");
  await assert.rejects(
    () => assertLapseIsCorrect(mutant, mutated.db),
    (err) => err instanceof assert.AssertionError && /every save row remains/.test(err.message),
    "S14 must fail on the mutant, by its own assertion",
  );
  assert.equal(await readFile(LAPSE_PATH, "utf8"), before, "committed lapse.js untouched");
});
