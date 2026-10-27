import test, { after } from "node:test";
import assert from "node:assert/strict";
import { tokenMinter } from "../src/worker/confirm-token.js";
import { postSave, RecordingSender, FixedRedemptions, runSendDue, startWorker, validSave, TEST_CONFIRM_TOKEN_KEY } from "./worker-harness.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

test("S3: the response body never contains the code, the email, the save id or the token (new or repeated save)", async () => {
  const email = "dummy-s3@example.com";
  const body = validSave({ email, consent_marketing: true });
  const first = await postSave(mf, body);
  assert.equal(first.text, '{"ok":true}', "exactly {ok:true}");

  // Mint a /confirm token the only way one is minted: the send step. Since SPEC-ui-and-copy-pass § 8 item 7 E1 carries no
  // /confirm link, so the token is the one the send step derived (SPEC-rung5 § 8) and whose hash it stored.
  const save = await db.prepare("SELECT * FROM saves").first();
  const sender = new RecordingSender();
  await runSendDue(db, { nowMs: Date.parse(save.send_at) + 1000, sender, redemptions: new FixedRedemptions() });
  const token = await tokenMinter(TEST_CONFIRM_TOKEN_KEY)(save.save_id);
  const { confirm_token_hash } = await db.prepare("SELECT confirm_token_hash FROM save_contacts").first();
  assert.ok(token && confirm_token_hash, "control: a token exists to look for, its hash stored at the send");

  const repeat = await postSave(mf, body);
  assert.equal(repeat.text, '{"ok":true}', "a repeat is indistinguishable from a new save");
  for (const res of [first, repeat]) {
    for (const secret of [save.offer_code, save.save_id, email, "dummy-s3", token]) {
      assert.ok(!res.text.includes(secret), `response must not contain ${secret}`);
    }
  }
});

test("S3b: a refusal names the error and echoes no value either", async () => {
  const email = "dummy-s3b@example";
  const res = await postSave(mf, validSave({ email }));
  assert.equal(res.status, 400);
  assert.deepEqual(res.json, { ok: false, error: "email_invalid" });
  assert.ok(!res.text.includes(email));
});
