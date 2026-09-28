// Shared by the rung-5 cases (m*.test.mjs). Not a test file itself.
// ⛔ No request leaves the machine: Resend is a stubbed `fetch` here, or the harness's `resend` handler.
// Recipients are dummy `@example.com` addresses and Resend's PUBLISHED test addresses
// (https://resend.com/docs/dashboard/emails/send-test-emails): delivered@resend.dev, bounced@resend.dev.
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { ResendSender } from "../src/worker/resend-sender.js";
import { tokenMinter } from "../src/worker/confirm-token.js";
import { postSave, rows, runSendDue, validSave, FixedRedemptions, TEST_CONFIRM_TOKEN_KEY } from "./worker-harness.mjs";

export const DUMMY_KEY = "re_DUMMY_KEY_FOR_TESTS_ONLY"; // not a key: nothing it is sent to exists
export const MAIL_FROM = "Fit AF <offers@eatfitaf.com>"; // the committed placeholder
export const DELIVERED = "delivered@resend.dev";
export const BOUNCED = "bounced@resend.dev";
export const MINUTE_MS = 60_000;

/** A fetch stub. `respond(call, n)` returns a Response (or throws, or a promise). Records every call. */
export function stubFetch(respond) {
  const calls = [];
  const fetch = async (url, init) => {
    const call = { url, method: init.method, headers: { ...init.headers }, raw: init.body, body: JSON.parse(init.body) };
    calls.push(call);
    return respond(call, calls.length);
  };
  return { fetch, calls };
}

export const accepted = (id = "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794") => () => Response.json({ id });
export const status = (code, name) => () =>
  Response.json({ statusCode: code, name: name ?? `status_${code}`, message: "stub" }, { status: code });

export const resendSender = (fetch) => new ResendSender({ apiKey: DUMMY_KEY, from: MAIL_FROM, fetch });

/** Saves `emails` as offer saves; returns the moment after which every message is due. */
export async function saveOffers(mf, db, emails, overrides = {}) {
  for (const email of emails) await postSave(mf, validSave({ email, ...overrides }));
  return Math.max(...(await rows(db, "SELECT send_at FROM saves")).map((r) => Date.parse(r.send_at))) + 1000;
}

export async function saveRow(db, email) {
  const [row] = await rows(
    db,
    "SELECT s.*, c.confirm_token_hash FROM saves s JOIN save_contacts c USING (save_id) WHERE c.email = ?",
    email,
  );
  return row;
}

export const send = (db, nowMs, sender) => runSendDue(db, { nowMs, sender, redemptions: new FixedRedemptions() });

/** DRAFT § 3's message as lines of plain text: emphasis, the "(only if…)" note and button brackets removed. */
export async function draftMessage(heading) {
  const md = await readFile(join(ROOT, "consent", "DRAFT.md"), "utf8");
  const part = md.split("## 3. The emails")[1].split("## 4.")[0].split(heading)[1].split(/\n\*\*E|\n## /)[0];
  const subject = /Subject: \*([^*]+)\*/.exec(part)[1];
  const lines = part
    .split("\n")
    .filter((l) => l.startsWith("> "))
    .map((l) =>
      l
        .slice(2)
        .replace(/\*\(only if the box was ticked\)\*\s*/, "")
        .replace(/\[ ([^\]]+) \]/g, "$1")
        .replace(/\*+/g, "")
        .trim(),
    );
  return { subject, lines };
}

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

/** An HTML part as its paragraphs' visible text, and its links. */
export function readHtml(html) {
  const body = /<body>([\s\S]*)<\/body>/.exec(html)[1];
  const hrefs = [...body.matchAll(/<a href="([^"]*)">/g)].map((m) => m[1].replace(/&[a-z#0-9]+;/g, (e) => ENTITIES[e]));
  const paragraphs = [...body.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) =>
    m[1].replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/g, (e) => ENTITIES[e] ?? e),
  );
  return { paragraphs, hrefs };
}

// ---- M4 / M5: the allowlist case, run against the real allowlist.js or a mutated copy ----

/**
 * M4's assertions, given an allowlist module: a recipient not on the list, and an unset or empty list,
 * are HELD — no request, the message stays `scheduled`, no attempt counted. Throws AssertionError if not.
 */
export async function assertHeld(allowlistModule, { mf, db }) {
  const offList = "dummy-m4-off@example.com";
  const nowMs = await saveOffers(mf, db, [offList]);
  for (const allowlist of ["@resend.dev, someone-else@example.com", undefined, "", " , "]) {
    const stub = stubFetch(accepted());
    const sender = new allowlistModule.AllowlistSender(resendSender(stub.fetch), allowlist);
    const counts = await send(db, nowMs, sender);
    assert.equal(stub.calls.length, 0, `no request (allowlist ${JSON.stringify(allowlist)})`);
    assert.equal(counts.held, 1, "counted as held");
    assert.equal(counts.sent + counts.failed + counts.retrying, 0);
    const row = await saveRow(db, offList);
    assert.equal(row.message_state, "scheduled", "held: neither sent nor failed");
    assert.equal(row.send_attempts, 0, "held is not an attempt");
    assert.equal(row.send_lease_until, null, "the claim is released");
    assert.equal(row.state, "saved");
  }
}

// ---- Mutants of modules that import siblings: a COPY of src/worker and data, mutated in the copy ----

/** Copies src/worker/ and data/ to a temporary tree, mutates `file` there (exactly once); returns its path. */
export async function writeTreeMutant(file, from, to) {
  const dir = await mkdtemp(join(tmpdir(), "fitaf-mutant-tree-"));
  await cp(join(ROOT, "src", "worker"), join(dir, "src", "worker"), { recursive: true });
  await cp(join(ROOT, "data"), join(dir, "data"), { recursive: true });
  const path = join(dir, "src", "worker", file);
  const source = await readFile(path, "utf8");
  assert.equal(source.split(from).length - 1, 1, `the mutation site occurs exactly once in ${file}`);
  await writeFile(path, source.replace(from, to));
  return path;
}

// ---- M9: a run while a previous run's send is in flight ----

/** Calls a `sendDue` (the real one, or a mutant's) as the cron would, at `nowMs`. */
export async function callSendDue(sendDue, db, nowMs, sender, mintToken = tokenMinter(TEST_CONFIRM_TOKEN_KEY)) {
  const { devConfig } = await import("../build.mjs");
  const { OFFERS } = await import("../src/worker/offers.js");
  const events = (await import("../data/events.json", { with: { type: "json" } })).default;
  const saveConfig = (await import("../data/save.json", { with: { type: "json" } })).default;
  const { vars } = await devConfig();
  return sendDue(db, {
    now: new Date(nowMs).toISOString(),
    sender,
    redemptions: new FixedRedemptions(),
    context: {
      offers: OFFERS,
      events,
      siteUrl: vars.SITE_URL,
      unconfirmedDays: saveConfig.unconfirmed_expansion_days,
      mintToken,
    },
  });
}

/**
 * M9's assertions, given a `sendDue`: run A's request is held open; run B starts five minutes later; then A's
 * request is answered. Exactly ONE request is made, and the message ends `sent` with A's id.
 */
export async function assertOneRequestWhileInFlight(sendDue, { mf, db }) {
  const to = DELIVERED.replace("@", "+m9@");
  const nowMs = await saveOffers(mf, db, [to], { consent_marketing: true });
  let answerFirst;
  const firstAnswered = new Promise((resolve) => (answerFirst = resolve));
  const stub = stubFetch((call, n) => (n === 1 ? firstAnswered : Response.json({ id: "m9-second-request" })));
  const sender = resendSender(stub.fetch);

  const runA = callSendDue(sendDue, db, nowMs, sender);
  try {
    for (let i = 0; i < 1000 && stub.calls.length === 0; i++) await new Promise((r) => setTimeout(r, 2));
    assert.equal(stub.calls.length, 1, "control: run A's request is in flight");
    const runB = await callSendDue(sendDue, db, nowMs + 5 * MINUTE_MS, sender);
    assert.equal(stub.calls.length, 1, "one request: run B does not request the message in flight");
    assert.equal(runB.inflight, 1, "run B counts it in flight");
    assert.equal(runB.sent + runB.failed + runB.retrying, 0);
  } catch (err) {
    answerFirst(Response.json({ id: "m9-first-request" }));
    await runA.catch(() => {}); // let run A finish before the database goes away; the assertion is the result
    throw err;
  }
  answerFirst(Response.json({ id: "m9-first-request" }));
  const a = await runA;
  assert.equal(a.sent, 1, "run A's request is accepted and recorded");
  const row = await saveRow(db, to);
  assert.equal(row.message_state, "sent");
  assert.equal(row.provider_message_id, "m9-first-request");
  assert.equal(row.send_attempts, 1);
  assert.equal(row.send_lease_until, null);
  assert.equal(stub.calls.length, 1, "one request in all");
}

// ---- M10 / M12: two attempts for one message, given a confirm-token module (the real one or a mutant) ----

/**
 * M10's assertions: a message's first attempt meets a 500 and its second is accepted; the two requests carry
 * byte-identical bodies and the same Idempotency-Key — for a ticked E1 and an E-X, both of which carry a
 * /confirm token. Throws AssertionError if not.
 */
export async function assertIdenticalAttempts(confirmTokenModule, { mf, db }) {
  const { sendDue } = await import("../src/worker/send-due.js");
  const { NEAR_ZIP } = await import("./worker-harness.mjs");
  const e1To = DELIVERED.replace("@", "+m10-e1@");
  const exTo = DELIVERED.replace("@", "+m10-ex@");
  const nowMs = await saveOffers(mf, db, [e1To], { consent_marketing: true });
  await postSave(mf, validSave({ kind: "expansion", email: exTo, zip: NEAR_ZIP }));
  const firstFails = new Map();
  const stub = stubFetch((call) => {
    const to = call.body.to[0];
    if (!firstFails.has(to)) {
      firstFails.set(to, true);
      return status(500, "application_error")();
    }
    return Response.json({ id: `m10-${to}` });
  });
  const sender = resendSender(stub.fetch);
  const mintToken = confirmTokenModule.tokenMinter(TEST_CONFIRM_TOKEN_KEY);
  assert.equal((await callSendDue(sendDue, db, nowMs, sender, mintToken)).retrying, 2, "control: both first attempts retry");
  assert.equal((await callSendDue(sendDue, db, nowMs + 5 * MINUTE_MS, sender, mintToken)).sent, 2, "control: both second attempts are accepted");
  for (const to of [e1To, exTo]) {
    const attempts = stub.calls.filter((c) => c.body.to[0] === to);
    assert.equal(attempts.length, 2, "control: two attempts");
    assert.ok(/\/confirm\//.test(attempts[0].body.text), "control: the message carries a /confirm token");
    assert.equal(attempts[1].headers["Idempotency-Key"], attempts[0].headers["Idempotency-Key"], "the same key");
    assert.equal(attempts[1].raw, attempts[0].raw, "two attempts, byte-identical request bodies");
  }
}

/** A stub of Resend's documented idempotency: same key + same body replays; a changed body is a 409. */
export function idempotentResend() {
  const seen = new Map();
  let delivered = 0;
  const stub = stubFetch((call) => {
    const key = call.headers["Idempotency-Key"];
    const earlier = seen.get(key);
    if (earlier && earlier.raw !== call.raw) return status(409, "invalid_idempotent_request")();
    if (earlier) return Response.json({ id: earlier.id }); // "the same response, without … sending the email again"
    const id = `m11-${seen.size + 1}`;
    seen.set(key, { raw: call.raw, id });
    delivered++;
    return Response.json({ id });
  });
  return { ...stub, delivered: () => delivered };
}
