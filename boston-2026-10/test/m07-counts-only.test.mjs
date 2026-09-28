import test, { after } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker/index.js";
import { chooseSender } from "../src/worker/choose-sender.js";
import { runSchedule } from "../src/worker/scheduled.js";
import { NullRedemptions } from "../src/worker/senders.js";
import { NEAR_ZIP, postSave, rows, startWorker, validSave } from "./worker-harness.mjs";
import { DUMMY_KEY, MAIL_FROM, MINUTE_MS, saveOffers } from "./rung5-fixture.mjs";

const { mf, db, vars } = await startWorker();
after(() => mf.dispose());

const CONSOLE = ["log", "info", "warn", "error", "debug", "trace"];

/** Every leaf is a count: no address, code, id, token or key. */
function assertCountsOnly(value, path = "result") {
  if (typeof value === "number") return assert.ok(Number.isInteger(value) && value >= 0, path);
  if (typeof value === "boolean") return;
  assert.ok(value && typeof value === "object", `${path} is a count, not ${typeof value}`);
  for (const [k, v] of Object.entries(value)) assertCountsOnly(v, `${path}.${k}`);
}

test("M7: logs and the handler's return -> counts only: no address, token, code or key in any line", async () => {
  // One of each outcome: sent (ticked E1, so a token), sent (E-X, a token), failed (422), retrying (500),
  // held (not on the list, an @example.com address).
  const people = {
    sent: "delivered+m7-sent@resend.dev",
    failed: "bounced+m7-failed@resend.dev",
    retrying: "delivered+m7-retry@resend.dev",
    held: "dummy-m7-held@example.com",
  };
  const nowMs = await saveOffers(mf, db, Object.values(people), { consent_marketing: true });
  await postSave(mf, validSave({ kind: "expansion", email: "delivered+m7-ex@resend.dev", zip: NEAR_ZIP }));

  const requests = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    requests.push({ url, body, headers: init.headers });
    const to = body.to[0];
    if (to.includes("m7-failed")) return Response.json({ name: "validation_error", message: `bad ${to}` }, { status: 422 });
    if (to.includes("m7-retry")) throw new TypeError(`network down while sending to ${to}`);
    return Response.json({ id: "m7-accepted-id" });
  };
  const lines = [];
  const saved = Object.fromEntries(CONSOLE.map((m) => [m, console[m]]));
  for (const m of CONSOLE) console[m] = (...args) => lines.push(args.map(String).join(" "));
  const env = { DB: db, SITE_URL: vars.SITE_URL, RESEND_API_KEY: DUMMY_KEY, SEND_ALLOWLIST: "@resend.dev", MAIL_FROM };
  let returned;
  try {
    // The real handler (index.js), in Node, with the key set: what it logs is what Cloudflare would keep.
    await worker.scheduled({ scheduledTime: nowMs + MINUTE_MS }, env, {});
    returned = await runSchedule(env, {
      nowMs: nowMs + 10 * MINUTE_MS,
      sender: chooseSender(env),
      redemptions: new NullRedemptions(),
    });
  } finally {
    globalThis.fetch = realFetch;
    for (const m of CONSOLE) console[m] = saved[m];
  }

  assert.equal(requests.length, 5, "control: sent, E-X, failed, retrying — then the retry again");
  assert.equal(lines.length, 1, "one line per run");
  const logged = JSON.parse(lines[0]);
  assertCountsOnly(logged);
  assert.deepEqual(
    { sent: logged.send.sent, held: logged.send.held, suppressed: logged.send.suppressed, failed: logged.send.failed, retrying: logged.send.retrying },
    { sent: 2, held: 1, suppressed: 0, failed: 1, retrying: 1 },
    "the five counts of § 1",
  );
  assertCountsOnly(returned);

  const tokens = requests.flatMap((r) => [...r.body.text.matchAll(/\/confirm\/([A-Za-z0-9_-]+)/g)].map((m) => m[1]));
  assert.equal(tokens.length, requests.length, "control: every request carried a minted token");
  const codes = (await rows(db, "SELECT offer_code FROM saves WHERE offer_code IS NOT NULL")).map((r) => r.offer_code);
  const addresses = (await rows(db, "SELECT email FROM save_contacts")).map((r) => r.email);
  const secrets = [DUMMY_KEY, ...tokens, ...codes, ...codes.map((c) => `${c.slice(0, 4)}-${c.slice(4)}`), ...addresses];
  assert.ok(codes.length === 4 && addresses.length === 5, "control: the forbidden values were collected");
  const said = [...lines, JSON.stringify(returned)].join("\n");
  for (const secret of secrets) assert.ok(!said.includes(secret), "a forbidden value appears in a log line or the return");
  assert.ok(!/@/.test(said), "no address-shaped text at all");
});
