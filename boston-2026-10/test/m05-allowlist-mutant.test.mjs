import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as allowlist from "../src/worker/allowlist.js";
import { startWorker, WORKER_DIR, writeMutant } from "./worker-harness.mjs";
import { assertHeld } from "./rung5-fixture.mjs";

const ALLOWLIST_PATH = join(WORKER_DIR, "allowlist.js");
const control = await startWorker();
const mutated = await startWorker();
after(() => Promise.all([control.mf.dispose(), mutated.mf.dispose()]));

test("M5: mutant — the allowlist check skipped -> M4 fails", async () => {
  const before = await readFile(ALLOWLIST_PATH, "utf8");
  await assertHeld(allowlist, control); // control: the real allowlist passes M4

  const path = await writeMutant("allowlist.js", '    if (!allowlistAllows(this.entries, message.to)) return "held";\n', "");
  const mutant = await import(path); // a COPY; allowlist.js itself is never written
  assert.notEqual(await readFile(path, "utf8"), before, "the copy is mutated");
  await assert.rejects(
    () => assertHeld(mutant, mutated),
    (err) => err instanceof assert.AssertionError && /no request/.test(err.message),
    "M4 must fail on the mutant, by its own assertion",
  );
  assert.equal(await readFile(ALLOWLIST_PATH, "utf8"), before, "committed allowlist.js untouched");
});
