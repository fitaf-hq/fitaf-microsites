import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sendDue } from "../src/worker/send-due.js";
import { startWorker, WORKER_DIR } from "./worker-harness.mjs";
import { assertOneRequestWhileInFlight, writeTreeMutant } from "./rung5-fixture.mjs";

const SEND_DUE_PATH = join(WORKER_DIR, "send-due.js");
const real = await startWorker();
const mutated = await startWorker();
after(() => Promise.all([real.mf.dispose(), mutated.mf.dispose()]));

test("M9: a cron run while a previous run's send is in flight (the same message twice) -> one request", async () => {
  await assertOneRequestWhileInFlight(sendDue, real);
});

test("M9b: mutant — the claim ignores an unexpired lease -> M9 fails", async () => {
  const before = await readFile(SEND_DUE_PATH, "utf8");
  const path = await writeTreeMutant(
    "send-due.js",
    '"AND (send_lease_until IS NULL OR send_lease_until <= ?3)"',
    '"AND (?3 IS NOT NULL)"',
  );
  const mutant = await import(path); // a COPY of src/worker/ and data/; send-due.js itself is never written
  await assert.rejects(
    () => assertOneRequestWhileInFlight(mutant.sendDue, mutated),
    (err) => err instanceof assert.AssertionError && /one request: run B/.test(err.message),
    "M9 must fail on the mutant, by its own assertion",
  );
  assert.equal(await readFile(SEND_DUE_PATH, "utf8"), before, "committed send-due.js untouched");
});
