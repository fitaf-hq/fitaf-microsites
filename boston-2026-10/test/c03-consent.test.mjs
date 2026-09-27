import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { claimSlots, renderPage, ROOT } from "../build.mjs";
import { loadPlans } from "./helpers.mjs";
import { count, postClaim, startWorker, validBody } from "./worker-harness.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

test("C3 (server): a missing or non-boolean consent value -> 400 consent_not_boolean; nothing written", async () => {
  const bad = [undefined, null, "true", "false", "on", 1, 0, "", [], {}];
  for (const key of ["consent_email", "consent_sms"]) {
    for (const value of bad) {
      const body = validBody({ mobile: "617-555-0100" });
      if (value === undefined) delete body[key];
      else body[key] = value;
      const res = await postClaim(mf, body);
      assert.equal(res.status, 400, `${key}=${JSON.stringify(value)}`);
      assert.deepEqual(res.json, { ok: false, error: "consent_not_boolean" });
    }
  }
  assert.equal(await count(db, "claims"), 0);
});

test("C3 (server): a ticked box needs its channel", async () => {
  const sms = await postClaim(mf, validBody({ mobile: "", consent_sms: true }));
  assert.deepEqual(sms.json, { ok: false, error: "consent_sms_without_mobile" });
  const email = await postClaim(mf, validBody({ email: "", mobile: "617-555-0101", consent_email: true }));
  assert.deepEqual(email.json, { ok: false, error: "consent_email_without_email" });
  assert.equal(await count(db, "claims"), 0);
});

test("C3 (page): neither box is pre-ticked, and neither is required", async () => {
  const claim = JSON.parse(await readFile(join(ROOT, "data", "claim.json"), "utf8"));
  const html = await renderPage(await loadPlans(), await claimSlots(claim, "1x00000000000000000000BB"));
  const boxes = [...html.matchAll(/<input\b[^>]*type="checkbox"[^>]*>/g)].map((m) => m[0]);
  assert.deepEqual(
    boxes.map((b) => /name="([^"]+)"/.exec(b)[1]),
    ["consent_email", "consent_sms"],
  );
  for (const b of boxes) {
    assert.doesNotMatch(b, /\bchecked\b/, "unticked");
    assert.doesNotMatch(b, /\brequired\b/, "not required");
  }
});
