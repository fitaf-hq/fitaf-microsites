import test, { after } from "node:test";
import assert from "node:assert/strict";
import saveConfig from "../data/save.json" with { type: "json" };
import { offerForSave } from "../src/worker/offers.js";
import { nextDayAt, zonedDate, zonedParts } from "../src/worker/zoned-time.js";
import { CODE_RE, count, EVENT_ID, IN_ZIP, ISO_RE, postSave, startWorker, validSave } from "./worker-harness.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());
const ZONE = saveConfig.send_time_zone;

test("S1: a valid offer save -> 200 {ok:true}; one saves + one save_contacts row; unique code; send_at = next 09:00 Eastern", async () => {
  const res = await postSave(mf, validSave());
  assert.equal(res.status, 200);
  assert.deepEqual(res.json, { ok: true });
  assert.equal(await count(db, "saves"), 1);
  assert.equal(await count(db, "save_contacts"), 1);

  const save = await db.prepare("SELECT * FROM saves").first();
  const contact = await db.prepare("SELECT * FROM save_contacts").first();
  assert.equal(contact.save_id, save.save_id, "the contact is keyed by the save");
  assert.match(save.offer_code, CODE_RE);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM saves WHERE offer_code = ?").bind(save.offer_code).first()).n, 1);
  assert.match(save.created_at, ISO_RE, "created_at is UTC");
  assert.deepEqual(
    { ...save, save_id: "·", offer_code: "·", created_at: "·", send_at: "·", state_at: "·" },
    {
      save_id: "·", event_id: EVENT_ID, kind: "offer", offer_code: "·",
      offer_id: offerForSave(zonedDate(Date.parse(save.created_at), ZONE)).id,
      ring: "in", reissued_from: null, created_at: "·", send_at: "·",
      message_state: "scheduled", state: "saved", state_at: "·",
      // rung 5 (0004_sending.sql): nothing requested yet, no provider id, no claim
      send_attempts: 0, provider_message_id: null, send_lease_until: null,
    },
  );
  assert.equal(save.state_at, save.created_at);
  assert.deepEqual(
    { ...contact, save_id: "·", consent_at: "·" },
    {
      save_id: "·", email: "dummy-s@example.com", zip: IN_ZIP, consent_marketing: 0, consent_expansion: 0,
      wording_version: saveConfig.wording_version, consent_at: "·", confirm_token_hash: null,
      confirmed_at: null, withdrawn_at: null,
    },
  );

  // send_at: computed by the Worker (workerd's Intl) and re-derived here (Node's Intl) from created_at.
  const created = Date.parse(save.created_at);
  const sendAt = Date.parse(save.send_at);
  assert.equal(sendAt, nextDayAt(created, { zone: ZONE, hour: saveConfig.send_hour }), "workerd and Node agree");
  const local = zonedParts(sendAt, ZONE);
  assert.deepEqual([local.hour, local.minute, local.second], [9, 0, 0], "09:00:00 Eastern");
  const dayAfter = new Date(Date.parse(`${zonedDate(created, ZONE)}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
  assert.equal(zonedDate(sendAt, ZONE), dayAfter, "on the next calendar day in New York");
});
