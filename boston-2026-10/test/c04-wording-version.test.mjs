import test, { after } from "node:test";
import assert from "node:assert/strict";
import { count, postClaim, startWorker, validBody } from "./worker-harness.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

test("C4: an unknown wording version -> 400 wording_version_unknown; nothing written", async () => {
  for (const v of ["v1", "v0.1-draft", "V0.2-DRAFT", "", null, undefined, 2]) {
    const body = validBody({ wording_version: v });
    if (v === undefined) delete body.wording_version;
    const res = await postClaim(mf, body);
    assert.equal(res.status, 400, `wording_version=${JSON.stringify(v)}`);
    assert.deepEqual(res.json, { ok: false, error: "wording_version_unknown" });
  }
  assert.equal(await count(db, "claims"), 0);
  assert.equal((await postClaim(mf, validBody({ wording_version: "v0.2-draft" }))).status, 200, "control");
});
