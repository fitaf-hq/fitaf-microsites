import test, { after } from "node:test";
import assert from "node:assert/strict";
import { RESEND_URL, USER_AGENT } from "../src/worker/resend-sender.js";
import { tokenHash } from "../src/worker/token.js";
import { linkIn, startWorker, TEST_CONFIRM_TOKEN_KEY } from "./worker-harness.mjs";
import { DELIVERED, DUMMY_KEY, MAIL_FROM, MINUTE_MS, saveOffers, saveRow } from "./rung5-fixture.mjs";

const RESEND_ID = "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794"; // the id in Resend's documented example response
const resendRequests = [];
const { mf, db, outbound } = await startWorker({
  bindings: { RESEND_API_KEY: DUMMY_KEY, SEND_ALLOWLIST: "@resend.dev", CONFIRM_TOKEN_KEY: TEST_CONFIRM_TOKEN_KEY },
  resend: async (request) => {
    resendRequests.push({ method: request.method, headers: Object.fromEntries(request.headers), body: await request.json() });
    return Response.json({ id: RESEND_ID });
  },
});
after(() => mf.dispose());

test("M1: accepted -> `sent`, provider_message_id stored; the request carries from, to, subject, html, text, the Bearer key and the idempotency key", async () => {
  // Resend's published "delivered" test address, with a + label (the docs allow labels on it).
  const to = DELIVERED.replace("@", "+m1@");
  const nowMs = await saveOffers(mf, db, [to], { consent_marketing: true });
  const before = await saveRow(db, to);

  // The real scheduled() handler, as the cron calls it: RESEND_API_KEY set -> Resend behind the allowlist.
  const worker = await mf.getWorker();
  const outcome = await worker.scheduled({ cron: "*/5 * * * *", scheduledTime: new Date(nowMs + MINUTE_MS) });
  assert.equal(outcome.outcome, "ok");

  assert.equal(resendRequests.length, 1, "one request to Resend");
  assert.equal(outbound.filter((r) => r.url === RESEND_URL).length, 1, "and it went to the documented endpoint");
  const [{ method, headers, body }] = resendRequests;
  assert.equal(method, "POST");
  assert.equal(headers.authorization, `Bearer ${DUMMY_KEY}`);
  assert.equal(headers["idempotency-key"], `${before.save_id}:E1`, "<save_id>:<message kind>");
  assert.match(headers["content-type"], /^application\/json/);
  assert.equal(headers["user-agent"], USER_AGENT, "Resend requires a User-Agent");
  assert.deepEqual(Object.keys(body).sort(), ["from", "html", "subject", "text", "to"]);
  assert.equal(body.from, MAIL_FROM);
  assert.deepEqual(body.to, [to]);
  assert.equal(body.subject, "Your Fit AF offer, as promised");
  assert.match(body.text, /Your code: /);
  assert.match(body.html, /^<!doctype html>/);

  const row = await saveRow(db, to);
  assert.equal(row.message_state, "sent");
  assert.equal(row.provider_message_id, RESEND_ID);
  assert.equal(row.send_attempts, 1);
  assert.equal(row.send_lease_until, null);
  assert.equal(row.state, "messaged");
  const token = linkIn(body.text, "/confirm/");
  assert.equal(row.confirm_token_hash, await tokenHash(token), "the token's hash is stored once accepted");
  assert.equal(linkIn(body.html, "/confirm/").replace(/".*$/, ""), token, "the HTML part carries the same token");

  await worker.scheduled({ cron: "*/5 * * * *", scheduledTime: new Date(nowMs + 10 * MINUTE_MS) });
  assert.equal(resendRequests.length, 1, "a sent message is not requested again");
});
