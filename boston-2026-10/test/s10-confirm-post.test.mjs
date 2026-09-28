import test, { after } from "node:test";
import assert from "node:assert/strict";
import { validateSave } from "../src/worker/validate-save.js";
import { purge } from "../src/worker/purge.js";
import { newToken, tokenHash } from "../src/worker/token.js";
import { insertRows, saveRows } from "../scripts/dummy-saves.mjs";
import { d1Adapter, fetchPage, PAST_OFFER_ID, rows, startWorker, validSave } from "./worker-harness.mjs";
import { savedAndSent } from "./confirm-fixture.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

const HEADERS = { "referrer-policy": "no-referrer", "cache-control": "no-store", "x-robots-tag": "noindex" };
const assertHeaders = (res) => {
  for (const [k, v] of Object.entries(HEADERS)) assert.equal(res.headers[k], v, k);
};
const t = await savedAndSent(mf, db);
const contact = async (id) => (await rows(db, "SELECT * FROM save_contacts WHERE save_id = ?", id))[0];
const state = async (id) => (await rows(db, "SELECT state FROM saves WHERE save_id = ?", id))[0].state;

test("S10: POST yes -> confirmed_at set, the save 'confirmed'; POST no -> withdrawn_at set", async () => {
  assert.equal(await state(t.yes.id), "messaged", "fixture: E1 was sent");
  const yes = await fetchPage(mf, `/confirm/${t.yes.token}`, { form: { action: "yes" } });
  assert.equal(yes.status, 200);
  assert.match(yes.text, /<h1>You're on the list\.<\/h1>/);
  assert.match(yes.text, /<a href="\/o\/[23456789A-HJ-NP-Z]{8}">See my offer<\/a>/);
  assertHeaders(yes);
  assert.match((await contact(t.yes.id)).confirmed_at, /Z$/);
  assert.equal(await state(t.yes.id), "confirmed");

  const no = await fetchPage(mf, `/confirm/${t.no.token}`, { form: { action: "no" } });
  assert.match(no.text, /<h1>No problem — you won't hear from us again\.<\/h1>/);
  assertHeaders(no);
  const declined = await contact(t.no.id);
  assert.match(declined.withdrawn_at, /Z$/);
  assert.equal(declined.confirmed_at, null);
  assert.equal(await state(t.no.id), "messaged", "No thanks leaves the state (flows/06 6.8)");

  const x = await fetchPage(mf, `/confirm/${t.expansion.token}`, { form: { action: "yes" } });
  assert.match(x.text, /<h1>You're on the list\.<\/h1>/);
  assert.doesNotMatch(x.text, /See my offer/, "an expansion confirmation has no offer");
  assert.equal(await state(t.expansion.id), "confirmed");
});

test("S10: unknown, expired and purged tokens give a byte-identical GONE (and so does a malformed one)", async () => {
  // Expired: a save whose offer has ended; its token was minted when it was live.
  const expiredToken = newToken();
  await insertRows(db, [
    saveRows(validateSave(validSave({ email: "dummy-c-exp@example.com", consent_marketing: true })), {
      state: "messaged",
      saveOverrides: { offer_id: PAST_OFFER_ID, message_state: "sent" },
      contactOverrides: { confirm_token_hash: await tokenHash(expiredToken) },
    }),
  ]);
  // Purged: exported, then the purge deleted the contact (and the hash with it).
  const purgedToken = newToken();
  await insertRows(db, [
    saveRows(validateSave(validSave({ email: "dummy-c-pur@example.com", consent_marketing: true })), {
      state: "exported",
      contactOverrides: { confirm_token_hash: await tokenHash(purgedToken) },
    }),
  ]);
  assert.equal((await fetchPage(mf, `/confirm/${purgedToken}`)).status, 200, "control: live until the purge");
  await purge(d1Adapter(db), { dryRun: false });

  const pages = {
    unknown: await fetchPage(mf, `/confirm/${newToken()}`),
    expired: await fetchPage(mf, `/confirm/${expiredToken}`),
    purged: await fetchPage(mf, `/confirm/${purgedToken}`),
    malformed: await fetchPage(mf, "/confirm/not-a-token"),
    "expired POST": await fetchPage(mf, `/confirm/${expiredToken}`, { form: { action: "yes" } }),
  };
  for (const [name, res] of Object.entries(pages)) {
    assert.equal(res.status, 404, name);
    assert.equal(res.text, pages.unknown.text, `${name} is byte-identical to unknown`);
    assertHeaders(res);
  }
  assert.match(pages.unknown.text, /<h1>This link is no longer active\.<\/h1>/);
  const [exp] = await rows(db, "SELECT c.confirmed_at FROM save_contacts c WHERE c.email = 'dummy-c-exp@example.com'");
  assert.equal(exp.confirmed_at, null, "an expired token confirms nothing");
});

test("S10: lookups are rate-limited per IP", async () => {
  const ip = "203.0.113.90";
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await fetchPage(mf, `/confirm/${newToken()}`, { ip })).status);
  assert.deepEqual(statuses, [404, 404, 404, 404, 404, 429]);
});
