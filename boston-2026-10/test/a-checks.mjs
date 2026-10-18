// The checks of A2, A3, A4 and A6 (SPEC-analytics.md § 7) as functions over a PACKAGE (`root`: this one, or a mirror of
// it), each returning one line per thing the package gets wrong ([] when it is right). The cases run them on this
// package; the mutants (a-mutants.test.mjs) run THE SAME checks on a mirror carrying one mutation each. Not a test file
// itself. Every expectation is the contract's, written here, never read back from the code under test.
import { ROOT } from "../build.mjs";
import { BEACON, builtPage, S1, startBeacon, TEST_IP, TEST_UA, TEST_UA_TOKEN, VALID, wholeVisit } from "./a-harness.mjs";

/** § 4: "at most 2 KB". */
export const MAX_BODY_BYTES = 2048;
/** § 2: the salt's expiry, "at most 48 hours". */
export const MAX_SALT_TTL_S = 172_800;

/** A2: a whole visit on the built page, in a window whose storage APIs throw if touched, touches none of them; the visit
 *  happened (its beacons were sent: open, four answers, at least one result, the click, the leave). */
export async function storageProblems(root = ROOT) {
  const problems = [];
  const visit = wholeVisit(await builtPage({ root }));
  for (const name of visit.touched) problems.push(`touched ${name}`);
  for (const error of visit.errors) problems.push(`a script threw: ${error.message}`);
  const events = visit.beacons.map((b) => b.body.event);
  for (const [event, at_least] of [["open", 1], ["answer", 4], ["result", 1], ["click", 1], ["leave", 1]]) {
    const n = events.filter((e) => e === event).length;
    if (n < at_least) problems.push(`the visit sent ${n} ${event} (control: at least ${at_least})`);
  }
  return problems;
}

/** A3's bodies that must be refused (§ 3's closed list, § 4's size), each with what is wrong with it. */
export function refusedBodies() {
  const pad = (event, total) => {
    const text = JSON.stringify(event);
    return text.slice(0, -1) + " ".repeat(total - Buffer.byteLength(text)) + "}";
  };
  const without = (event, key) => Object.fromEntries(Object.entries(event).filter(([k]) => k !== key));
  return [
    ["an event outside § 3", { event: "scroll", s: S1 }],
    ["an extra field", { ...VALID.open, ip: TEST_IP }],
    ["a field missing", without(VALID.open, "load_ms")],
    ["s not 16 hex digits", { ...VALID.error, s: "0123456789abcdeg" }],
    ["s too short", { ...VALID.error, s: "0123456789abcde" }],
    ["s a number", { ...VALID.error, s: 1234567890123456 }],
    ["no s", { event: "error" }],
    ["a question outside the page's", { ...VALID.answer, question: "email", answer: "yes" }],
    ["another question's answer", { ...VALID.answer, question: "goal", answer: "yes" }],
    ["a goal the page does not offer", { ...VALID.answer, answer: "keto" }],
    ["a question named __proto__", { ...VALID.answer, question: "__proto__", answer: "or" }],
    ["an answer set outside selection.mjs's", { ...VALID.result, key: "or-6d" }],
    ["a result's mpid not an individual plan's", { ...VALID.result, mpid: 35 }],
    ["an mpid as text", { ...VALID.result, mpid: "21" }],
    ["a link outside § 3", { ...VALID.click, link: "instagram" }],
    ["an order link without its mpid", { event: "click", s: S1, link: "order" }],
    ["all-plans with an mpid", { ...VALID.click, link: "all-plans" }],
    ["an mpid the plans do not have", { ...VALID.click, mpid: 99 }],
    ["a negative length", { ...VALID.leave, length_ms: -1 }],
    ["a fractional length", { ...VALID.leave, length_ms: 1.5 }],
    ["a length as text", { ...VALID.leave, length_ms: "64000" }],
    ["a step outside the funnel", { ...VALID.leave, step: "leave" }],
    ["a viewport band outside § 1.4", { ...VALID.open, viewport: "390" }],
    ["a QR event data/events.json does not name", { ...VALID.open, qr: "somewhere-else" }],
    ["a load time as text", { ...VALID.open, load_ms: "812" }],
    ["an error carrying a message", { ...VALID.error, message: "TypeError: x is undefined" }],
    ["an error carrying a stack", { ...VALID.error, stack: "at app.js:1:1" }],
    ["not JSON", "event=open"],
    ["JSON null", "null"],
    ["a JSON list of a valid event", JSON.stringify([VALID.open])],
    ["a JSON string", JSON.stringify("open")],
    ["an empty body", ""],
    [`over ${MAX_BODY_BYTES} bytes (a valid event padded to ${MAX_BODY_BYTES + 1})`, pad(VALID.open, MAX_BODY_BYTES + 1)],
  ];
}

/** A3: POST /a with each refused body is 204 with nothing written (no data point, no salt read or made); and, as the
 *  control, each valid event of § 3 (and one padded to exactly 2 KB) is 204 with one data point. */
export async function refusalProblems(root = ROOT, entry = "site") {
  const problems = [];
  const site = await startBeacon({ root, entry });
  try {
    await site.log();
    for (const [label, body] of refusedBodies()) {
      const res = await site.post(body);
      if (res.status !== 204) problems.push(`${label}: ${res.status}, not 204`);
      const log = await site.log();
      if (log.points.length) problems.push(`${label}: written (${log.points.length} data point(s))`);
      if (log.puts.length || log.gets.length) problems.push(`${label}: the salt store was used`);
    }
    const pad = JSON.stringify(VALID.open).slice(0, -1);
    const exact = pad + " ".repeat(MAX_BODY_BYTES - Buffer.byteLength(pad) - 1) + "}";
    for (const [label, body] of [...Object.entries(VALID), [`open padded to exactly ${MAX_BODY_BYTES} bytes`, exact]]) {
      const res = await site.post(body);
      if (res.status !== 204) problems.push(`control ${label}: ${res.status}, not 204`);
      const { points } = await site.log();
      if (points.length !== 1) problems.push(`control ${label}: ${points.length} data points written, not 1`);
    }
  } finally {
    await site.dispose();
  }
  return problems;
}

/** Every field of a written data point, as text. */
const fieldsOf = (point) => [...(point.blobs ?? []), ...(point.indexes ?? []), ...(point.doubles ?? [])].map((f) => String(f));

/** A4: every event of § 3, sent with a known IP and user agent: no field written (blob, index, double) and no salt
 *  key or value contains either (nor the user agent's own token); the control: the events were written. */
export async function ipUaProblems(root = ROOT) {
  const problems = [];
  const site = await startBeacon({ root });
  try {
    await site.log();
    for (const body of Object.values(VALID)) await site.post(body, { ip: TEST_IP, ua: TEST_UA, country: "DE" });
    const log = await site.log();
    if (log.points.length !== Object.keys(VALID).length) problems.push(`control: ${log.points.length} data points, not ${Object.keys(VALID).length}`);
    const needles = [TEST_IP, TEST_UA, TEST_UA_TOKEN, "203.0.113", "Mozilla/5.0"];
    for (const [i, point] of log.points.entries()) {
      for (const field of fieldsOf(point)) {
        for (const needle of needles) if (field.includes(needle)) problems.push(`data point ${i + 1} carries ${JSON.stringify(needle)}: ${JSON.stringify(field)}`);
      }
    }
    for (const put of log.puts) {
      for (const needle of needles) {
        if (String(put.key).includes(needle) || String(put.value).includes(needle)) problems.push(`the salt store holds ${JSON.stringify(needle)}`);
      }
    }
  } finally {
    await site.dispose();
  }
  return problems;
}

/** A6: the day's salt is written to SALTS with an expiry of at most 172,800 s (the KV write's own option, and the expiry
 *  the namespace then reports); control: an event did write a salt. Measured at the first and the last minute of a New
 *  York day (§ 2's day), each instant written with its own offset. */
export async function saltExpiryProblems(root = ROOT) {
  const problems = [];
  for (const clock of [Date.parse("2026-10-23T00:00:00-04:00"), Date.parse("2026-10-23T23:59:00-04:00")]) {
    const site = await startBeacon({ root });
    try {
      const before = Date.now();
      await site.post(VALID.open, { clock });
      const log = await site.log();
      if (log.puts.length !== 1) problems.push(`${new Date(clock).toISOString()}: ${log.puts.length} salt writes, not 1 (control)`);
      for (const put of log.puts) {
        const ttl = put.options?.expirationTtl;
        const expiration = put.options?.expiration;
        if (ttl === undefined && expiration === undefined) problems.push(`${new Date(clock).toISOString()}: the salt written with no expiry`);
        if (ttl !== undefined && !(ttl > 0 && ttl <= MAX_SALT_TTL_S)) problems.push(`${new Date(clock).toISOString()}: expirationTtl ${ttl}, not within (0, ${MAX_SALT_TTL_S}]`);
        if (expiration !== undefined && !(expiration * 1000 - clock <= MAX_SALT_TTL_S * 1000)) problems.push(`${new Date(clock).toISOString()}: expiration ${expiration} is more than 48 h after the write`);
      }
      for (const key of log.keys) {
        if (key.expiration === undefined) problems.push(`${new Date(clock).toISOString()}: SALTS holds ${key.name} with no expiration`);
        else if (key.expiration * 1000 - before > (MAX_SALT_TTL_S + 5) * 1000) problems.push(`${new Date(clock).toISOString()}: SALTS holds ${key.name} expiring more than 48 h out`);
      }
    } finally {
      await site.dispose();
    }
  }
  return problems;
}

export { BEACON };
