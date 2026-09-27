import test, { after } from "node:test";
import assert from "node:assert/strict";
import { count, postClaim, startWorker, validBody } from "./worker-harness.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

test("C1: a valid claim (email only) -> 200 {ok:true}; one claims row, one contacts row; offer_code unique", async () => {
  const res = await postClaim(mf, validBody({ mobile: "" }));
  assert.equal(res.status, 200);
  assert.deepEqual(res.json, { ok: true });
  assert.equal(await count(db, "claims"), 1);
  assert.equal(await count(db, "contacts"), 1);
  const claim = await db.prepare("SELECT * FROM claims").first();
  const contact = await db.prepare("SELECT * FROM contacts").first();
  assert.equal(contact.claim_id, claim.claim_id, "the contact is keyed by the claim");
  assert.match(claim.offer_code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS n FROM claims WHERE offer_code = ?").bind(claim.offer_code).first()).n,
    1,
  );
  assert.deepEqual(
    { ...claim, claim_id: "·", offer_code: "·", created_at: "·" },
    { claim_id: "·", event_id: "boston-2026-10", plan: "signature", meals_per_week: 14, offer_code: "·", created_at: "·", export_state: "pending" },
  );
  assert.match(claim.created_at, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/, "created_at is UTC");
  assert.equal(contact.email, "dummy-c@example.com");
  assert.equal(contact.mobile_e164, null);
  assert.equal(contact.consent_email, 0);
  assert.equal(contact.consent_sms, 0);
  assert.equal(contact.consent_wording_version, "v0.2-draft");
});

test("C1b: the plan table bounds plan and count; a mobile is normalised to E.164", async () => {
  assert.equal((await postClaim(mf, validBody({ plan: "signature", meals_per_week: 21 }))).json.error, "plan_invalid");
  assert.equal((await postClaim(mf, validBody({ plan: "keto", meals_per_week: 7 }))).json.error, "plan_invalid");
  assert.equal((await postClaim(mf, validBody({ zip: "0211" }))).json.error, "zip_invalid");
  assert.equal((await postClaim(mf, validBody({ email: "not-an-email" }))).json.error, "email_invalid");
  assert.equal((await postClaim(mf, validBody({ mobile: "555-0123" }))).json.error, "mobile_invalid");
  const ok = await postClaim(mf, validBody({ email: "", mobile: "(617) 555-0142", plan: "family", meals_per_week: 1 }));
  assert.equal(ok.status, 200);
  const row = await db.prepare("SELECT mobile_e164 FROM contacts WHERE email IS NULL").first();
  assert.equal(row.mobile_e164, "+16175550142");
});
