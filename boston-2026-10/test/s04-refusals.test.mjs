import test, { after } from "node:test";
import assert from "node:assert/strict";
import { count, FAR_ZIP, IN_ZIP, NEAR_ZIP, postSave, startWorker, TOKEN_THAT_FAILS, validSave } from "./worker-harness.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

const without = (key) => {
  const b = validSave();
  delete b[key];
  return b;
};

// Every named refusal of SPEC-rung4 § 3, each from an otherwise valid body.
const REFUSALS = [
  ["email_invalid", [validSave({ email: "" }), validSave({ email: "   " }), validSave({ email: "not-an-email" }), without("email"), validSave({ email: 42 })]],
  ["zip_invalid", [validSave({ zip: "0211" }), validSave({ zip: "021180" }), validSave({ zip: "abcde" }), without("zip")]],
  ["event_unknown", [validSave({ event_id: "boston-2026-10" }), validSave({ event_id: "" }), without("event_id")]],
  ["wording_version_unknown", [validSave({ wording_version: "v0.2-draft" }), validSave({ wording_version: "v1" }), validSave({ wording_version: "V0.3-DRAFT" }), without("wording_version")]],
  ["consent_not_boolean", [undefined, null, "true", "false", "on", 1, 0, "", [], {}].map((v) => (v === undefined ? without("consent_marketing") : validSave({ consent_marketing: v })))],
  ["kind_invalid", [validSave({ kind: "claim" }), validSave({ kind: "reissue" }), without("kind")]],
  ["zip_out_of_area", [validSave({ zip: NEAR_ZIP }), validSave({ zip: FAR_ZIP })]],
  ["zip_in_area", [validSave({ kind: "expansion", zip: IN_ZIP })]],
  ["consent_marketing_on_expansion", [validSave({ kind: "expansion", zip: NEAR_ZIP, consent_marketing: true })]],
  ["body_invalid", [null, [], "x"]],
];

test("S4: each named refusal -> its 400 and name; nothing written", async () => {
  for (const [error, bodies] of REFUSALS) {
    for (const body of bodies) {
      const res = await postSave(mf, body);
      assert.equal(res.status, 400, `${error}: ${JSON.stringify(body)}`);
      assert.deepEqual(res.json, { ok: false, error }, JSON.stringify(body));
    }
  }
  const notJson = await postSave(mf, null, { raw: "email=a@example.com" });
  assert.deepEqual(notJson.json, { ok: false, error: "body_invalid" });
  assert.equal(await count(db, "saves"), 0);
  assert.equal(await count(db, "save_contacts"), 0);
});

test("S4: a failed or missing Turnstile token -> 403 turnstile_failed; nothing written", async () => {
  for (const token of [TOKEN_THAT_FAILS, "", undefined]) {
    const body = validSave({ turnstile_token: token });
    if (token === undefined) delete body.turnstile_token;
    const res = await postSave(mf, body);
    assert.equal(res.status, 403);
    assert.deepEqual(res.json, { ok: false, error: "turnstile_failed" });
  }
  assert.equal(await count(db, "saves"), 0);
});

test("S4: the sixth request in a minute from one IP -> 429 rate_limited; nothing written", async () => {
  const ip = "203.0.113.40";
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await postSave(mf, validSave({ zip: "x" }), { ip })).status);
  assert.deepEqual(statuses, [400, 400, 400, 400, 400, 429]);
  assert.deepEqual((await postSave(mf, validSave(), { ip })).json, { ok: false, error: "rate_limited" });
  assert.equal(await count(db, "saves"), 0);
});

test("S4: routes — only POST /api/save saves; control: a valid save is accepted", async () => {
  assert.equal((await mf.dispatchFetch("http://localhost/api/save")).status, 405);
  assert.equal((await mf.dispatchFetch("http://localhost/api/claim", { method: "POST" })).status, 404, "rung 3's endpoint is retired");
  assert.equal((await mf.dispatchFetch("http://localhost/api/export", { method: "POST" })).status, 404);
  assert.equal((await postSave(mf, validSave())).status, 200, "control");
  assert.equal(await count(db, "saves"), 1);
});
