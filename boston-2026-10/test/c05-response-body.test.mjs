import test, { after } from "node:test";
import assert from "node:assert/strict";
import { postClaim, startWorker, validBody } from "./worker-harness.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

test("C5: the response body never contains the code, the email or the claim id", async () => {
  const email = "dummy-c5@example.com";
  const res = await postClaim(mf, validBody({ email, mobile: "617-555-0155", first_name: "Dummy Five" }));
  assert.equal(res.status, 200);
  assert.equal(res.text, '{"ok":true}', "the body is exactly {ok:true}");
  const claim = await db.prepare("SELECT * FROM claims").first();
  const contact = await db.prepare("SELECT * FROM contacts").first();
  for (const secret of [claim.offer_code, claim.claim_id, email, contact.mobile_e164, "5550155", "Dummy Five"]) {
    assert.ok(!res.text.includes(secret), `response must not contain ${secret}`);
  }
});

test("C5b: a refusal names the error and echoes no value either", async () => {
  const email = "dummy-c5b@example";
  const res = await postClaim(mf, validBody({ email, zip: "02118" }));
  assert.equal(res.status, 400);
  assert.deepEqual(res.json, { ok: false, error: "email_invalid" });
  assert.ok(!res.text.includes(email));
});
