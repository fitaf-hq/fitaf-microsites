// The rung-4 Worker (SPEC-rung4-save-offer.md §§ 3, 5, 6; its sender, SPEC-rung5-sending.md). Static
// assets are served first; only a request no asset matches reaches this script: POST /api/save,
// /confirm/<token>, /o/<code>. And one scheduled handler (the cron): send what is due, the lapse, the purge.
// SPEC-week-content § 4: the same two behaviours as production's Worker, imported from site.js (never copied): the
// week from the WEEK bucket put into the page's #picks-data (the page's routes reach this script first, by
// wrangler.jsonc's assets.run_worker_first), and the photo sheets at /week/<file>.jpg. Its own routes come first.
//
// ⛔ /api/save returns { ok: true } only — never a code, a stored value or an id, new save or repeat.
// ⛔ The IP (CF-Connecting-IP) is used as the rate-limit key and nothing else: not stored, not logged,
//    not sent to Turnstile. The /confirm token is never logged; the cron logs counts only (rung 5 M7).
import saveConfig from "../../data/save.json" with { type: "json" };
import { handleConfirm } from "./confirm.js";
import { offerForSave } from "./offers.js";
import { htmlResponse, TOO_MANY } from "./pages.js";
import { handleOffer } from "./redeem.js";
import { upsertSave } from "./save-store.js";
import { chooseSender } from "./choose-sender.js";
import { runSchedule } from "./scheduled.js";
import { NullRedemptions } from "./senders.js";
import { turnstilePasses } from "./turnstile.js";
import { SaveError, validateSave } from "./validate-save.js";
import { serveSite } from "./site.js";
import { nextDayAt, zonedDate } from "./zoned-time.js";

const MAX_BODY_BYTES = 8 * 1024;
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const ZONE = saveConfig.send_time_zone;

const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
const refuse = (status, error) => reply(status, { ok: false, error });
const clientIp = (request) => request.headers.get("CF-Connecting-IP") ?? "unknown";

async function readJson(request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new SaveError("body_too_large");
  try {
    return JSON.parse(text);
  } catch {
    throw new SaveError("body_invalid");
  }
}

async function handleSave(request, env) {
  if (request.method !== "POST") return refuse(405, "method_not_allowed");
  const { success } = await env.SAVE_RATE_LIMITER.limit({ key: clientIp(request) });
  if (!success) return refuse(429, "rate_limited");

  let body;
  let save;
  try {
    body = await readJson(request);
    save = validateSave(body);
  } catch (err) {
    if (err instanceof SaveError) return refuse(400, err.code);
    throw err;
  }
  if (!(await turnstilePasses(env.TURNSTILE_SECRET_KEY, body.turnstile_token))) {
    return refuse(403, "turnstile_failed");
  }
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  // SPEC-save-offer-production § 10.7: after the last offer's valid_to no offer is offered. SPEC-ui-and-copy-pass § 1.2
  // item 3 (the Advisor, 2026-10-23: "We should still save"): an offer save then is still kept, with no offer, and nothing
  // is due for it (no E1 until the second chance's email exists): its send_at null, so the store writes no message state;
  // it lapses 30 days after the save unless its tick is confirmed (lapse.js). An expansion save goes at once, an offer
  // save with its offer the next morning at the send hour.
  const offer = save.kind === "offer" ? offerForSave(zonedDate(nowMs, ZONE)) : null;
  const nextMorning = new Date(nextDayAt(nowMs, { zone: ZONE, hour: saveConfig.send_hour })).toISOString();
  const sendAt = save.kind === "expansion" ? now : offer ? nextMorning : null;
  try {
    await upsertSave(env.DB, save, { offerId: offer?.id ?? null, now, sendAt });
  } catch {
    return refuse(500, "store_failed"); // the error text may carry values; it is not relayed
  }
  return reply(200, { ok: true });
}

/** /confirm/<token> and /o/<code> share one lookup rate limit per IP. */
async function lookup(request, env, handler) {
  const { success } = await env.LOOKUP_RATE_LIMITER.limit({ key: clientIp(request) });
  if (!success) return htmlResponse(429, TOO_MANY);
  const nowMs = Date.now();
  return handler({ now: new Date(nowMs).toISOString(), today: zonedDate(nowMs, ZONE) });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === saveConfig.api_path) return handleSave(request, env);
    if (pathname.startsWith("/api/")) return refuse(404, "not_found");
    const confirm = /^\/confirm\/([^/]*)$/.exec(pathname);
    if (confirm) return lookup(request, env, (t) => handleConfirm(request, env, confirm[1], t));
    const offer = /^\/o\/([^/]*)$/.exec(pathname);
    if (offer) return lookup(request, env, (t) => handleOffer(env, offer[1], t));
    return serveSite(request, env);
  },

  async scheduled(controller, env, ctx) {
    const counts = await runSchedule(env, {
      nowMs: controller.scheduledTime,
      sender: chooseSender(env), // RESEND_API_KEY set -> Resend behind SEND_ALLOWLIST; else NullSender
      redemptions: new NullRedemptions(),
    });
    console.log(JSON.stringify(counts)); // counts only
  },
};
