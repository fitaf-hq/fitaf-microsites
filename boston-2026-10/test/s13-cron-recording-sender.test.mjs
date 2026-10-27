import test, { after } from "node:test";
import assert from "node:assert/strict";
import events from "../data/events.json" with { type: "json" };
import { longDate, offerById } from "../src/worker/offers.js";
import { displayCode } from "../src/worker/messages.js";
import { tokenHash, TOKEN_RE } from "../src/worker/token.js";
import { FixedRedemptions, linkIn, NEAR_ZIP, postSave, RecordingSender, rows, runSendDue, startWorker, validSave } from "./worker-harness.mjs";
import { draftMessage } from "./rung5-fixture.mjs";

const { mf, db, vars } = await startWorker();
after(() => mf.dispose());

// DRAFT § 3's messages are read by rung5-fixture.mjs's draftMessage (since SPEC-ui-and-copy-pass § 8 it also puts E1's band,
// which the draft names and does not copy, in its marked line's place): this case kept a copy of it until then.

test("S13: the cron with RecordingSender and one redeemed code -> that one suppressed; the rest captured, content per DRAFT § 3", async () => {
  const people = {
    ticked: "dummy-r1@example.com",
    unticked: "dummy-r2@example.com",
    redeemed: "dummy-r3@example.com",
  };
  await postSave(mf, validSave({ email: people.ticked, consent_marketing: true }));
  await postSave(mf, validSave({ email: people.unticked }));
  await postSave(mf, validSave({ email: people.redeemed, consent_marketing: true }));
  await postSave(mf, validSave({ kind: "expansion", email: "dummy-r4@example.com", zip: NEAR_ZIP }));
  const byEmail = async (email) =>
    (await rows(db, "SELECT s.*, c.confirm_token_hash FROM saves s JOIN save_contacts c USING (save_id) WHERE c.email = ?", email))[0];
  const redeemedCode = (await byEmail(people.redeemed)).offer_code;
  const latest = Math.max(...(await rows(db, "SELECT send_at FROM saves")).map((r) => Date.parse(r.send_at)));

  const sender = new RecordingSender();
  const redemptions = new FixedRedemptions([redeemedCode]);
  const counts = await runSendDue(db, { nowMs: latest + 1000, sender, redemptions });
  assert.deepEqual(counts, { due: 4, suppressed: 1, sent: 3, failed: 0, deferred: 0, held: 0, retrying: 0, inflight: 0 });
  assert.equal(redemptions.asked.length, 1, "one question to the order source");
  assert.equal(redemptions.asked[0].length, 3, "by code: the three offer codes, nothing else");
  assert.ok(redemptions.asked[0].every((c) => /^[A-Z0-9]{8}$/.test(c)), "codes only — no address crosses");

  const suppressed = await byEmail(people.redeemed);
  assert.equal(suppressed.message_state, "suppressed");
  assert.equal(suppressed.state, "messaged");
  assert.equal(suppressed.confirm_token_hash, null, "no token for a message never sent");
  assert.ok(!sender.messages.some((m) => m.to === people.redeemed), "the redeemed one is not sent");
  assert.deepEqual(sender.messages.map((m) => m.to).sort(), ["dummy-r1@example.com", "dummy-r2@example.com", "dummy-r4@example.com"]);

  const EX = await draftMessage("**E-X — at once, to an out-of-area request.**");
  let E1;
  for (const who of ["ticked", "unticked"]) {
    const row = await byEmail(people[who]);
    const m = sender.messages.find((x) => x.to === people[who]);
    const offer = offerById(row.offer_id);
    E1 = await draftMessage("**E1 — the next morning, to a saved offer.**", { codeMode: offer.code_mode });
    assert.equal(m.template, "E1");
    assert.equal(m.subject, E1.subject);
    const expected = E1.lines
      .map((l) => l.replace("[event]", events[0].name).replace("XXXX-XXXX", displayCode(row.offer_code)).replace("[date]", longDate(offer.valid_to)))
      .filter((l) => who === "ticked" || !l.startsWith("You asked to hear about"));
    for (const line of expected) assert.ok(m.text.includes(line), `${who} E1 lacks: ${line}\n---\n${m.text}`);
    assert.equal(linkIn(m.text, "/o/"), row.offer_code, "Claim my offer -> /o/<code>");
    assert.ok(m.text.includes(`${vars.SITE_URL}/o/${row.offer_code}`));
    const token = linkIn(m.text, "/confirm/");
    if (who === "ticked") {
      assert.match(token, TOKEN_RE);
      assert.equal(row.confirm_token_hash, await tokenHash(token), "only the token's hash is stored");
    } else {
      assert.equal(token, null, "no confirmation link without the box");
      assert.ok(!m.text.includes("You asked to hear about"));
      assert.equal(row.confirm_token_hash, null);
    }
    assert.equal(row.message_state, "sent");
    assert.equal(row.state, "messaged");
  }
  const x = sender.messages.find((m) => m.to === "dummy-r4@example.com");
  assert.equal(x.template, "EX");
  assert.equal(x.subject, EX.subject);
  for (const line of EX.lines.map((l) => l.replace("[ZIP]", NEAR_ZIP))) assert.ok(x.text.includes(line), `E-X lacks: ${line}`);
  assert.match(linkIn(x.text, "/confirm/"), TOKEN_RE);
  assert.ok(E1.lines.length >= 8 && EX.lines.length >= 3, "control: the draft's messages were read");

  const again = await runSendDue(db, { nowMs: latest + 2000, sender, redemptions });
  assert.equal(again.due, 0, "a message goes once");
});
