import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as confirmToken from "../src/worker/confirm-token.js";
import { startWorker, WORKER_DIR, writeMutant } from "./worker-harness.mjs";
import { assertIdenticalAttempts } from "./rung5-fixture.mjs";

const CONFIRM_TOKEN_PATH = join(WORKER_DIR, "confirm-token.js");
const control = await startWorker();
const mutated = await startWorker();
after(() => Promise.all([control.mf.dispose(), mutated.mf.dispose()]));

test("M12: mutant — a random token per attempt -> M10 fails", async () => {
  const before = await readFile(CONFIRM_TOKEN_PATH, "utf8");
  await assertIdenticalAttempts(confirmToken, control); // control: the derived token passes M10

  const path = await writeMutant(
    "confirm-token.js",
    'const mac = await crypto.subtle.sign("HMAC", hmacKey, utf8.encode(`${saveId}:confirm`));',
    "const mac = crypto.getRandomValues(new Uint8Array(32));",
  );
  const mutant = await import(path); // a COPY; confirm-token.js itself is never written
  assert.notEqual(await mutant.confirmToken("k".repeat(32), "s"), await mutant.confirmToken("k".repeat(32), "s"), "the copy is mutated");
  await assert.rejects(
    () => assertIdenticalAttempts(mutant, mutated),
    (err) => err instanceof assert.AssertionError && /byte-identical/.test(err.message),
    "M10 must fail on the mutant, by its own assertion",
  );
  assert.equal(await readFile(CONFIRM_TOKEN_PATH, "utf8"), before, "committed confirm-token.js untouched");
});
