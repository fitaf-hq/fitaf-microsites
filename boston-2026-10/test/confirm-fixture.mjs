// Shared by S9 and S10. Not a test file itself. Saves made through the endpoint, sent by the real send
// step with a RecordingSender, so each /confirm token is one the system itself minted.
import { FixedRedemptions, linkIn, NEAR_ZIP, postSave, RecordingSender, rows, runSendDue, validSave } from "./worker-harness.mjs";

export async function savedAndSent(mf, db) {
  await postSave(mf, validSave({ email: "dummy-c-yes@example.com", consent_marketing: true }));
  await postSave(mf, validSave({ email: "dummy-c-no@example.com", consent_marketing: true }));
  await postSave(mf, validSave({ kind: "expansion", email: "dummy-c-x@example.com", zip: NEAR_ZIP }));
  const latest = Math.max(...(await rows(db, "SELECT send_at FROM saves")).map((r) => Date.parse(r.send_at)));
  const sender = new RecordingSender();
  await runSendDue(db, { nowMs: latest + 1000, sender, redemptions: new FixedRedemptions() });
  const tokenFor = (email) => linkIn(sender.messages.find((m) => m.to === email).text, "/confirm/");
  const idFor = async (email) => (await rows(db, "SELECT save_id FROM save_contacts WHERE email = ?", email))[0].save_id;
  return {
    yes: { token: tokenFor("dummy-c-yes@example.com"), id: await idFor("dummy-c-yes@example.com") },
    no: { token: tokenFor("dummy-c-no@example.com"), id: await idFor("dummy-c-no@example.com") },
    expansion: { token: tokenFor("dummy-c-x@example.com"), id: await idFor("dummy-c-x@example.com") },
  };
}
