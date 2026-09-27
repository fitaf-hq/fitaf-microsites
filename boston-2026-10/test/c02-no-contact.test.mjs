import test, { after } from "node:test";
import assert from "node:assert/strict";
import { count, postClaim, startWorker, validBody } from "./worker-harness.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

test("C2: neither email nor mobile -> 400, named; nothing written", async () => {
  for (const body of [validBody({ email: "", mobile: "" }), validBody({ email: "   ", mobile: undefined })]) {
    const res = await postClaim(mf, body);
    assert.equal(res.status, 400);
    assert.deepEqual(res.json, { ok: false, error: "email_or_mobile_required" });
  }
  assert.equal(await count(db, "claims"), 0);
  assert.equal(await count(db, "contacts"), 0);
});
