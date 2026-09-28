// The purge (scheduled step 3). Carries rung 3's C7 (dry run), C8 (purge) and C9 (its mutant) onto rung 4's tables.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { d1Adapter, dumpAllTables, startWorker, writeMutant } from "./worker-harness.mjs";
import { assertPurgeIsCorrect, PURGE_PATH, purgeModulePath, seedPurgeFixture } from "./lifecycle-fixture.mjs";

const a = await startWorker();
const b = await startWorker();
const c = await startWorker();
after(() => Promise.all([a.mf.dispose(), b.mf.dispose(), c.mf.dispose()]));

test("S14b (C7): purge dry run -> counts only, nothing deleted; dry run is the default", async () => {
  const { purge } = await import(purgeModulePath());
  await seedPurgeFixture(a.db);
  const before = (await dumpAllTables(a.db)).text;
  const result = await purge(d1Adapter(a.db), { dryRun: true });
  assert.deepEqual(result, { dry_run: true, exported_saves: 3, contacts_to_delete: 3 });
  assert.equal((await dumpAllTables(a.db)).text, before, "every table byte-identical");
  assert.deepEqual(await purge(d1Adapter(a.db)), result, "dry run is the DEFAULT");
});

test("S14b (C8): purge -> exported saves lose their contact; save rows remain 'purged'; others untouched", async () => {
  await assertPurgeIsCorrect(await import(purgeModulePath()), b.db);
});

test("S14b (C9): mutant — the purge deletes from `saves` instead of `save_contacts` -> C8 fails", async () => {
  const before = await readFile(PURGE_PATH, "utf8");
  const mutant = await import(await writeMutant("purge.js", '"DELETE FROM save_contacts WHERE', '"DELETE FROM saves WHERE'));
  await assert.rejects(
    () => assertPurgeIsCorrect(mutant, c.db),
    (err) => err instanceof assert.AssertionError && /every save row remains/.test(err.message),
  );
  assert.equal(await readFile(PURGE_PATH, "utf8"), before, "committed purge.js untouched");
});
