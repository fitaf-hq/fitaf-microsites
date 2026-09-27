import test, { after } from "node:test";
import { assertPurgeIsCorrect, purgeModulePath, startWorker } from "./worker-harness.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

test("C8: purge -> exported claims lose their contacts row; claims rows remain 'purged'; non-exported untouched", async () => {
  await assertPurgeIsCorrect(await import(purgeModulePath()), db);
});
