import test, { after } from "node:test";
import assert from "node:assert/strict";
import { count, postClaim, startWorker, TOKEN_THAT_FAILS, validBody } from "./worker-harness.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

test("R3-turnstile: a failed or missing Turnstile token -> 403 turnstile_failed; nothing written", async () => {
  for (const token of [TOKEN_THAT_FAILS, "", undefined]) {
    const body = validBody({ turnstile_token: token });
    if (token === undefined) delete body.turnstile_token;
    const res = await postClaim(mf, body);
    assert.equal(res.status, 403);
    assert.deepEqual(res.json, { ok: false, error: "turnstile_failed" });
  }
  assert.equal(await count(db, "claims"), 0);
});

test("R3-routes: only POST /api/claim does anything", async () => {
  const get = await mf.dispatchFetch("http://localhost/api/claim");
  assert.equal(get.status, 405);
  const other = await mf.dispatchFetch("http://localhost/api/export", { method: "POST" });
  assert.equal(other.status, 404);
  const notJson = await postClaim(mf, null, { raw: "email=a@example.com" });
  assert.deepEqual(notJson.json, { ok: false, error: "body_invalid" });
});
