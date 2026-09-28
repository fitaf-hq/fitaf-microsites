import test, { after } from "node:test";
import assert from "node:assert/strict";
import { count, FAR_ZIP, NEAR_ZIP, postSave, rows, startWorker, validSave } from "./worker-harness.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

const contactOf = async () => (await rows(db, "SELECT * FROM save_contacts WHERE lower(email) = 'dummy-s2@example.com'"))[0];
const codes = async () => (await rows(db, "SELECT offer_code FROM saves WHERE kind = 'offer'")).map((r) => r.offer_code);

test("S2: the same email saves twice -> one row each table; one code; a new tick is pending; an unticked re-save leaves an earlier tick", async () => {
  assert.equal((await postSave(mf, validSave({ email: "dummy-s2@example.com", consent_marketing: false }))).status, 200);
  const [code] = await codes();
  const first = await contactOf();
  assert.equal(first.consent_marketing, 0);

  // Again, differently cased, ticked, another in-area ZIP: the same save, updated.
  await new Promise((r) => setTimeout(r, 5));
  assert.equal((await postSave(mf, validSave({ email: "Dummy-S2@Example.com", consent_marketing: true, zip: "02139" }))).status, 200);
  assert.equal(await count(db, "saves"), 1);
  assert.equal(await count(db, "save_contacts"), 1);
  assert.deepEqual(await codes(), [code], "never a second code");
  const ticked = await contactOf();
  assert.equal(ticked.consent_marketing, 1, "the new tick is recorded");
  assert.equal(ticked.confirmed_at, null, "and is pending: not confirmed");
  assert.equal(ticked.zip, "02139", "the ZIP follows the latest save");
  assert.ok(ticked.consent_at > first.consent_at, "the new consent carries its own time");
  assert.equal(ticked.email, "dummy-s2@example.com", "the first address, as typed, is kept");

  // Unticked again: the earlier tick is not withdrawn.
  assert.equal((await postSave(mf, validSave({ email: "dummy-s2@example.com", consent_marketing: false }))).status, 200);
  const after2 = await contactOf();
  assert.equal(after2.consent_marketing, 1, "an unticked re-save does not withdraw");
  assert.equal(after2.consent_at, ticked.consent_at, "nor re-date the consent");
  assert.equal(after2.withdrawn_at, null);
  assert.deepEqual(await codes(), [code]);
  assert.equal(await count(db, "saves"), 1);
});

test("S2b: idempotence is per (event, kind, email): an expansion save of the same address is its own row, itself idempotent", async () => {
  const before = await count(db, "saves");
  const body = validSave({ kind: "expansion", email: "dummy-s2@example.com", zip: NEAR_ZIP });
  assert.equal((await postSave(mf, body)).status, 200);
  assert.equal((await postSave(mf, { ...body, zip: FAR_ZIP })).status, 200);
  assert.equal(await count(db, "saves"), before + 1);
  const [x] = await rows(db, "SELECT s.ring, c.zip FROM saves s JOIN save_contacts c USING (save_id) WHERE s.kind = 'expansion'");
  assert.deepEqual(x, { ring: "far", zip: FAR_ZIP }, "the ZIP and its ring follow the latest save");
});
