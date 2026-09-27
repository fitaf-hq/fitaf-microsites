// The rung-3 Worker (SPEC-rung3-lead-capture.md § 2). Static assets are served first; only a request
// no asset matches reaches this script, and of those only /api/claim does anything.
//
// ⛔ Returns { ok: true } only — never a code, a stored value or an id.
// ⛔ The IP (CF-Connecting-IP) is used as the rate-limit key and is not stored or logged.
import claimConfig from "../../data/claim.json" with { type: "json" };
import { insertClaim } from "./claim-store.js";
import { turnstilePasses } from "./turnstile.js";
import { ClaimError, validateClaim } from "./validate.js";

const MAX_BODY_BYTES = 8 * 1024;
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

const reply = (status, body, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extra } });
const refuse = (status, error) => reply(status, { ok: false, error });

async function readJson(request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new ClaimError("body_too_large");
  try {
    return JSON.parse(text);
  } catch {
    throw new ClaimError("body_invalid");
  }
}

async function handleClaim(request, env) {
  if (request.method !== "POST") return refuse(405, "method_not_allowed");
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const { success } = await env.CLAIM_RATE_LIMITER.limit({ key: ip });
  if (!success) return refuse(429, "rate_limited");

  let claim;
  let body;
  try {
    body = await readJson(request);
    claim = validateClaim(body);
  } catch (err) {
    if (err instanceof ClaimError) return refuse(400, err.code);
    throw err;
  }
  if (!(await turnstilePasses(env.TURNSTILE_SECRET_KEY, body.turnstile_token))) {
    return refuse(403, "turnstile_failed");
  }
  try {
    await insertClaim(env.DB, claim, { eventId: claimConfig.event_id });
  } catch {
    return refuse(500, "store_failed"); // the error text may carry values; it is not relayed
  }
  return reply(200, { ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === claimConfig.api_path) return handleClaim(request, env);
    if (url.pathname.startsWith("/api/")) return refuse(404, "not_found");
    return env.ASSETS.fetch(request);
  },
};
