import test, { after } from "node:test";
import assert from "node:assert/strict";
import { purge, d1Adapter } from "../src/worker/purge.js";
import { dumpAllTables, seedPurgeFixture, startWorker } from "./worker-harness.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

test("C7: purge (dry run) -> counts only, nothing deleted", async () => {
  await seedPurgeFixture(db);
  const before = (await dumpAllTables(db)).text;
  const result = await purge(d1Adapter(db), { dryRun: true });
  assert.deepEqual(result, { dry_run: true, exported_claims: 3, contacts_to_delete: 3 });
  assert.equal((await dumpAllTables(db)).text, before, "every table byte-identical");
  assert.deepEqual(await purge(d1Adapter(db)), result, "dry run is the DEFAULT");
});
