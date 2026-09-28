import test, { after } from "node:test";
import * as confirmToken from "../src/worker/confirm-token.js";
import { startWorker } from "./worker-harness.mjs";
import { assertIdenticalAttempts } from "./rung5-fixture.mjs";

const worker = await startWorker();
after(() => worker.mf.dispose());

test("M10: two attempts for one message -> byte-identical request bodies and the same idempotency key", async () => {
  await assertIdenticalAttempts(confirmToken, worker);
});
