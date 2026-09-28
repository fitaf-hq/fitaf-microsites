// /confirm/<token> (flows/03 § 5; wording consent/DRAFT.md § 4). GET renders LANDING or GONE and changes
// nothing; POST action=yes|no gives CONFIRMED or DECLINED. GONE is one fixed page for every cause.
import { isLive, offerById } from "./offers.js";
import { esc, htmlResponse, page } from "./pages.js";
import { TOKEN_RE, tokenHash } from "./token.js";

export const GONE = page("Link no longer active", "<h1>This link is no longer active.</h1>");

const FIND_SQL =
  "SELECT s.save_id, s.kind, s.offer_id, s.offer_code, s.state, c.zip FROM save_contacts c " +
  "JOIN saves s ON s.save_id = c.save_id WHERE c.confirm_token_hash = ?";
// `exported` keeps its contact until the purge (flows/06 § 2), so its link still works until then.
const LIVE_STATES = new Set(["saved", "messaged", "confirmed", "exported"]);

const CONFIRM_SQL =
  "UPDATE save_contacts SET confirmed_at = CASE WHEN confirmed_at IS NULL OR withdrawn_at IS NOT NULL " +
  "THEN ?1 ELSE confirmed_at END, withdrawn_at = NULL WHERE save_id = ?2";
const CONFIRM_STATE_SQL =
  "UPDATE saves SET state = 'confirmed', state_at = ?1 WHERE save_id = ?2 AND state IN ('saved', 'messaged')";
const DECLINE_SQL = "UPDATE save_contacts SET withdrawn_at = ?1 WHERE save_id = ?2";

/** The save a token names, or null (unknown, malformed, purged, lapsed, erased — or its offer ended). */
async function findLive(db, token, today) {
  if (!TOKEN_RE.test(token)) return null;
  const row = await db.prepare(FIND_SQL).bind(await tokenHash(token)).first();
  if (!row || !LIVE_STATES.has(row.state)) return null;
  if (row.kind === "offer") {
    const offer = offerById(row.offer_id);
    if (!offer || !isLive(offer, today)) return null; // the token expires with the offer
  }
  return row;
}

function landing(row) {
  const buttons = (yes) =>
    '<form method="post">' +
    `<button type="submit" name="action" value="yes">${yes}</button>` +
    '<button type="submit" name="action" value="no">No thanks</button></form>';
  if (row.kind === "expansion") {
    return page(
      "Confirm",
      `<p>We'll email you when Fit AF delivers near ${esc(row.zip)} — nothing else.</p>\n${buttons("Yes, tell me")}`,
    );
  }
  return page(
    "Keep hearing from Fit AF?",
    "<h1>Keep hearing from Fit AF?</h1>\n" +
      "<p>Menus and offers by email, about once a week. Unsubscribe from any email, anytime.</p>\n" +
      buttons("Yes, keep me posted"),
  );
}

function confirmed(row) {
  const link = row.kind === "offer" ? `\n<p><a href="/o/${esc(row.offer_code)}">See my offer</a></p>` : "";
  return page("You're on the list", `<h1>You're on the list.</h1>${link}`);
}

const declined = () => page("No problem", "<h1>No problem — you won't hear from us again.</h1>");

export async function handleConfirm(request, env, token, { now, today }) {
  const row = await findLive(env.DB, token, today);
  if (!row) return htmlResponse(404, GONE);
  if (request.method === "GET" || request.method === "HEAD") return htmlResponse(200, landing(row));
  if (request.method !== "POST") return htmlResponse(405, landing(row));

  let action = null;
  try {
    action = (await request.formData()).get("action");
  } catch {
    action = null;
  }
  if (action === "yes") {
    await env.DB.batch([
      env.DB.prepare(CONFIRM_SQL).bind(now, row.save_id),
      env.DB.prepare(CONFIRM_STATE_SQL).bind(now, row.save_id),
    ]);
    return htmlResponse(200, confirmed(row));
  }
  if (action === "no") {
    await env.DB.prepare(DECLINE_SQL).bind(now, row.save_id).run();
    return htmlResponse(200, declined());
  }
  return htmlResponse(400, landing(row));
}
