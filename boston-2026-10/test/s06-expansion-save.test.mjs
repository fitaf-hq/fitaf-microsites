import test, { after } from "node:test";
import assert from "node:assert/strict";
import { FAR_ZIP, NEAR_ZIP, postSave, rows, startWorker, validSave } from "./worker-harness.mjs";

// The Worker's clock is the harness's (SPEC-save-offer-production § 10.7): its "now" is `now`.
const { mf, db, now } = await startWorker();
after(() => mf.dispose());

test("S6: an expansion save -> no code; ring near or far; send_at = now", async () => {
  const cases = [
    ["dummy-s6a@example.com", NEAR_ZIP, "near"],
    ["dummy-s6b@example.com", FAR_ZIP, "far"],
  ];
  for (const [email, zip] of cases) {
    const res = await postSave(mf, validSave({ kind: "expansion", email, zip }));
    assert.equal(res.status, 200);
    assert.deepEqual(res.json, { ok: true });
    const [row] = await rows(
      db,
      "SELECT s.*, c.zip, c.consent_expansion, c.consent_marketing FROM saves s JOIN save_contacts c USING (save_id) WHERE c.email = ?",
      email,
    );
    assert.equal(row.kind, "expansion");
    assert.equal(row.offer_code, null, "no offer code");
    assert.equal(row.offer_id, null, "no offer");
    assert.equal(row.ring, cases.find((c) => c[0] === email)[2]);
    assert.equal(row.send_at, row.created_at, "E-X goes at once");
    assert.equal(row.send_at, new Date(now).toISOString(), "now, by the Worker's clock");
    assert.equal(row.message_state, "scheduled");
    assert.equal(row.consent_expansion, 1, "CP-E recorded");
    assert.equal(row.consent_marketing, 0);
    assert.equal(row.zip, zip);
  }
});
