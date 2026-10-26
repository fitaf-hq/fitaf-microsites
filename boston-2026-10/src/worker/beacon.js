// POST /a, the page's analytics (SPEC-analytics.md §§ 1–4): the third thing production's Worker does (site.js routes
// it; the development Worker reaches it through site.js's serveSite). One beacon is one event of § 3's closed list,
// checked against the page's own vocabulary and the size (at most 2 KB); anything else is dropped. A checked event is
// one Analytics Engine data point (ANALYTICS): `blobs` the event and its fields, `doubles` its numbers, `indexes` the
// visitor `v`. The answer is a 204 in every case, written or not, bound or not.
//
// ⛔ No IP and no user agent in any field (§ 1.2, § 4). They are read for two things only and then dropped with the
//    request: `v` = the first 16 hex digits of SHA-256(salt_d ‖ IP ‖ user agent ‖ host), and the device class.
// ⛔ The salt (§ 2): random, one per day of America/New_York (ruled 2026-10-13: a UTC day ends at 20:00 in Boston),
//    held only in SALTS (KV) under salt:<YYYY-MM-DD>, the New York date, written with an expiry a minute after that day
//    ends (never more than 48 h), on the day's first event. The day is the platform's time-zone arithmetic
//    (zoned-time.js, Intl), never a fixed offset: 23 or 25 hours across a DST change. Once a salt expires nobody can
//    link that day's visitors to another day's, or recompute a `v` from an IP.
// The vocabulary is the page's and data's, never invented here: data/plans.json's goals and mpids, selection.mjs's
// answer sets, data/events.json's QR ids, and the four meal questions' answers as build.mjs's QUESTIONS names them
// (copied below because a Worker cannot import the build; A3 holds the two equal and equal to the built page's buttons).
// Since § 13 (2026-10-25: Family counted, and the first question) also the first question, `who`, its answers build.mjs's
// WHO (copied too), and Family's own question, `family`, its answers data/plans.json's family.selection; and a result's
// mpids Family's as well as the individual plans'. F1 holds every question of the page equal to this one's.
// Since § 14 (2026-10-26: a saved offer counted) one more event, `save`, sent when the save step's Worker answered an offer
// save as stored: `s` alone (nothing the visitor typed), the data point's layout unchanged, and not a step of STEPS.
import plans from "../../data/plans.json" with { type: "json" };
import events from "../../data/events.json" with { type: "json" };
import { ANSWER_SETS, answerKey } from "../../scripts/selection.mjs";
import { nextDayAt, zonedDate } from "./zoned-time.js";

export const BEACON_PATH = "/a";
/** § 4: a body over this many bytes is dropped unread. */
export const MAX_BEACON_BYTES = 2048;
/** A load time or a visit's length above a day is not a number this page makes. */
export const MAX_MS = 86_400_000;
/** § 2: the salt's expiry, at most 48 hours; KV's own minimum is 60 s. */
export const SALT_MAX_TTL_S = 172_800;
const SALT_MIN_TTL_S = 60;
/** The salt outlives its day by this much, for an event sent in the day's last second. */
const SALT_GRACE_S = 60;
const SALT_PREFIX = "salt:";
const SALT_BYTES = 32;
/** § 2's day (and the report's, § 5): the business's and its events' own, Eastern time. */
export const ANALYTICS_ZONE = "America/New_York";
const V_HEX_DIGITS = 16;
const VISIT_ID = /^[0-9a-f]{16}$/;
const COUNTRY = /^[A-Z][A-Z0-9]$/;

/** § 3's vocabulary. */
export const EVENTS = ["open", "answer", "result", "click", "leave", "error", "save"];
export const VIEWPORTS = ["<400", "400-767", "768-1199", ">=1200"];
/** Each question by the page's own id for it, and its answers, in the page's order since SPEC-ui-and-copy-pass § 2 (who
 *  it is for first, the goal last, then Family's own question, shown for Family alone): the report's funnel reads this
 *  order (§ 13 item 3). `who` is the button's data-who (build.mjs's WHO), `family` its data-family. */
export const QUESTIONS = {
  who: ["individual", "family"],
  lunch_dinner: ["or", "and"],
  weekends: ["yes", "no"],
  breakfast: ["yes", "no"],
  snacks: ["yes", "no"],
  goal: plans.individual.map((p) => p.id),
  family: plans.family.selection.map((row) => row.lunch_dinner),
};
export const ANSWER_KEYS = ANSWER_SETS.map(answerKey);
const INDIVIDUAL_MPIDS = plans.individual.flatMap((p) => p.counts.map((c) => c.mpid));
/** Family's: one product at either size (data/plans.json's family.counts), once. */
const FAMILY_MPIDS = [...new Set(plans.family.counts.map((c) => c.mpid))];
/** A result's mpid: since § 13 Family's too, its result card's; its key is the answer set whose cart Family takes
 *  (`or-5d`, `and-5d`: scripts/family.mjs checkFamily's), already one of ANSWER_KEYS. Checked apart, not as a pair. */
export const RESULT_MPIDS = [...INDIVIDUAL_MPIDS, ...FAMILY_MPIDS];
export const ORDER_MPIDS = [...INDIVIDUAL_MPIDS, ...FAMILY_MPIDS];
export const LINKS = ["order", "chefs-choice", "all-plans"];
export const STEPS = ["open", "answer", "result", "click"];
export const QR_IDS = events.map((e) => e.id);
export const DEVICES = ["phone", "tablet", "desktop"];

/** The data point's layout (§ 4): blob N is BLOBS[N - 1], double N is DOUBLES[N - 1], index1 is `v`. A field an event
 *  does not carry is "" (a blob) or 0 (a double). The report (scripts/analytics.mjs) reads its columns from these. */
export const BLOBS = ["event", "s", "country", "device", "viewport", "qr", "question", "answer", "key", "link", "step"];
export const DOUBLES = ["load_ms", "length_ms", "mpid"];

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const oneOf = (list) => (v) => list.includes(v);
const isMs = (v) => Number.isInteger(v) && v >= 0 && v <= MAX_MS;

/** Each event's fields beyond `event` and `s`, each with its check (§ 3). */
const FIELDS = {
  open: () => ({ viewport: oneOf(VIEWPORTS), load_ms: isMs, qr: (v) => v === "" || QR_IDS.includes(v) }),
  answer: (b) => ({ question: oneOf(Object.keys(QUESTIONS)), answer: oneOf(has(QUESTIONS, b.question) ? QUESTIONS[b.question] : []) }),
  result: () => ({ key: oneOf(ANSWER_KEYS), mpid: oneOf(RESULT_MPIDS) }),
  click: (b) => (b.link === "all-plans" ? { link: oneOf(LINKS) } : { link: oneOf(LINKS), mpid: oneOf(ORDER_MPIDS) }),
  leave: () => ({ length_ms: isMs, step: oneOf(STEPS) }),
  error: () => ({}),
  save: () => ({}),
};

/** The body as one event of § 3, exactly its fields and each from its vocabulary, or null. */
export function checkedEvent(body) {
  if (!isObject(body) || typeof body.event !== "string" || !has(FIELDS, body.event)) return null;
  if (typeof body.s !== "string" || !VISIT_ID.test(body.s)) return null;
  const fields = FIELDS[body.event](body);
  const names = ["event", "s", ...Object.keys(fields)];
  const keys = Object.keys(body);
  if (keys.length !== names.length || !names.every((n) => has(body, n))) return null;
  for (const [name, ok] of Object.entries(fields)) if (!ok(body[name])) return null;
  return body;
}

/** § 1.4: the device class from the user agent, which is then dropped. */
export function deviceOf(ua) {
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "tablet";
  if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua)) return "phone";
  return "desktop";
}

/** § 1.4: the country, from the platform's own header and nothing finer; "" when there is none. */
export function countryOf(request) {
  const country = request.cf?.country;
  return typeof country === "string" && COUNTRY.test(country) ? country : "";
}

/** The data point for a checked event (§ 4). */
export function dataPoint(event, { v, country, device }) {
  const all = { ...event, country, device };
  return {
    blobs: BLOBS.map((n) => (has(all, n) ? String(all[n]) : "")),
    doubles: DOUBLES.map((n) => (has(all, n) ? all[n] : 0)),
    indexes: [v],
  };
}

const hex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** § 2's day of the instant `now`: its New York date, "YYYY-MM-DD". */
export const saltDay = (now) => zonedDate(now, ANALYTICS_ZONE);

/** The salt's expiry for a write at `now`: a minute after its New York day ends (the next New York midnight), within
 *  KV's minimum and § 2's 48 hours. */
export function saltTtl(now) {
  const end = nextDayAt(now, { zone: ANALYTICS_ZONE, hour: 0 });
  return Math.min(SALT_MAX_TTL_S, Math.max(SALT_MIN_TTL_S, Math.ceil((end - now) / 1000) + SALT_GRACE_S));
}

/** A salt being made in this isolate, by key: concurrent first events of a day here share one (§ 2's race). */
const making = new Map();

async function makeSalt(salts, key, now) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
  try {
    await salts.put(key, salt, { expirationTtl: saltTtl(now) });
  } catch {
    // KV allows one write a second to a key: another isolate here made the day's salt first. Read it below.
  }
  // A write is seen at once in its own location, so two isolates here that both made one now read the same.
  return (await salts.get(key)) ?? salt;
}

/** The salt of `now`'s New York day, made on the day's first event. */
export async function saltOf(salts, now) {
  const key = SALT_PREFIX + saltDay(now);
  const held = await salts.get(key);
  if (held) return held;
  if (!making.has(key)) making.set(key, makeSalt(salts, key, now).finally(() => making.delete(key)));
  return making.get(key);
}

/** § 2: `v`, the visitor of this request on this day. */
async function visitorOf(request, env, now) {
  const salt = await saltOf(env.SALTS, now);
  const ip = request.headers.get("cf-connecting-ip") ?? "";
  const ua = request.headers.get("user-agent") ?? "";
  const host = new URL(request.url).host;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode([salt, ip, ua, host].join("\n")));
  return hex(digest).slice(0, V_HEX_DIGITS);
}

/** The body as text, or null when it is over § 4's size (read no further than that). */
async function bodyText(request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BEACON_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BEACON_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

/** One beacon: checked, then written; anything refused writes nothing and touches no salt. */
async function record(request, env) {
  const text = await bodyText(request);
  if (!text) return;
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return;
  }
  const event = checkedEvent(body);
  if (!event) return;
  const now = Date.now();
  const v = await visitorOf(request, env, now);
  const point = dataPoint(event, {
    v,
    country: countryOf(request),
    device: deviceOf(request.headers.get("user-agent") ?? ""),
  });
  env.ANALYTICS.writeDataPoint(point);
}

/** POST /a: a 204 in every case. */
export async function serveBeacon(request, env) {
  try {
    await record(request, env);
  } catch {
    // Unbound (before the infrastructure's bindings exist), or KV or the dataset failing: nothing written.
  }
  return new Response(null, { status: 204 });
}
