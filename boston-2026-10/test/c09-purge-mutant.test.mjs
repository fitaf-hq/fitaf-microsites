import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertPurgeIsCorrect, PURGE_PATH, startWorker, writePurgeMutant } from "./worker-harness.mjs";

const control = await startWorker();
const mutated = await startWorker();
after(() => Promise.all([control.mf.dispose(), mutated.mf.dispose()]));

test("C9: mutant — purge deletes from claims instead of contacts -> C8 fails", async () => {
  const before = await readFile(PURGE_PATH, "utf8");
  await assertPurgeIsCorrect(await import(PURGE_PATH), control.db); // control: the real purge passes C8

  const mutant = await import(await writePurgeMutant()); // a COPY; purge.js itself is never written
  assert.notEqual(mutant.PURGE_SQL[0], (await import(PURGE_PATH)).PURGE_SQL[0], "the copy is mutated");
  await assert.rejects(
    () => assertPurgeIsCorrect(mutant, mutated.db),
    (err) => err instanceof assert.AssertionError && /every claims row remains/.test(err.message),
    "C8 must fail on the mutant, by its own assertion",
  );
  assert.equal(await readFile(PURGE_PATH, "utf8"), before, "committed purge.js untouched");
});
