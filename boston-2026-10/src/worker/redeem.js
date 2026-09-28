// /o/<code> (flows/05 § 3): never a dead end. ORIGINAL (code known, its offer live) · WELCOME_BACK (code
// known, offer ended: the current offer, with a reissued unique code — at most one per original per
// offer) · CURRENT (unknown or malformed: the general offer, the same page for every such code).
import { currentGeneral, isLive, longDate, offerById } from "./offers.js";
import { OFFER_CODE_ALPHABET, newOfferCode } from "./offer-code.js";
import { displayCode } from "./messages.js";
import { esc, htmlResponse, page } from "./pages.js";

const CODE_RE = new RegExp(`^[${OFFER_CODE_ALPHABET}]{4}-?[${OFFER_CODE_ALPHABET}]{4}$`);
const MAX_CODE_ATTEMPTS = 5;

const FIND_SQL = "SELECT save_id, event_id, offer_id, ring FROM saves WHERE offer_code = ?";
const REISSUED_SQL = "SELECT offer_code FROM saves WHERE kind = 'reissue' AND reissued_from = ? AND offer_id = ?";
const REISSUE_SQL =
  "INSERT OR IGNORE INTO saves (save_id, event_id, kind, offer_code, offer_id, ring, reissued_from, created_at, " +
  "send_at, message_state, state, state_at) VALUES (?1, ?2, 'reissue', ?3, ?4, ?5, ?6, ?7, NULL, NULL, 'saved', ?7)";

/** The reissued code for (original, offer): the existing one, or a new row. No contact is written. */
async function reissue(db, original, offer, now) {
  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    const existing = await db.prepare(REISSUED_SQL).bind(original.save_id, offer.id).first();
    if (existing) return existing.offer_code;
    await db
      .prepare(REISSUE_SQL)
      .bind(crypto.randomUUID(), original.event_id, newOfferCode(), offer.id, original.ring, original.save_id, now)
      .run(); // ignored if a concurrent visit won, or (1 in 2^40) the code collided: either way, look again
  }
  throw new Error("reissue failed");
}

const planLink = (href) => `<p><a href="${esc(href)}">Build my plan →</a></p>`;
const codeLine = (code, offer) =>
  `<p>Your code: <strong>${esc(displayCode(code))}</strong> · good until ${esc(longDate(offer.valid_to))}</p>`;

function currentPage(today) {
  const offer = currentGeneral(today);
  return page(
    "Our current offer",
    `<h1>Our current offer</h1>\n<p><strong>${esc(offer.label)}</strong></p>\n` +
      `<p>Good until ${esc(longDate(offer.valid_to))}</p>\n${planLink("/")}`,
  );
}

export async function handleOffer(env, rawCode, { now, today }) {
  const code = CODE_RE.test(rawCode) ? rawCode.replace("-", "") : null;
  const row = code && (await env.DB.prepare(FIND_SQL).bind(code).first());
  if (!row) return htmlResponse(200, currentPage(today));

  const back = planLink(`/${row.event_id}/#from-email`);
  const offer = offerById(row.offer_id);
  if (offer && isLive(offer, today)) {
    return htmlResponse(
      200,
      page("Your offer", `<h1>Your offer</h1>\n<p><strong>${esc(offer.label)}</strong></p>\n${codeLine(code, offer)}\n${back}`),
    );
  }
  const current = currentGeneral(today);
  const newCode = current.code_mode === "unique" ? await reissue(env.DB, row, current, now) : null;
  const line = newCode
    ? codeLine(newCode, current)
    : `<p>Your code: <strong>${esc(current.shared_code)}</strong> · good until ${esc(longDate(current.valid_to))}</p>`;
  return htmlResponse(
    200,
    page(
      "Welcome back",
      "<h1>Welcome back — that offer ended, but here's what we have now</h1>\n" +
        `<p><strong>${esc(current.label)}</strong></p>\n${line}\n${back}`,
    ),
  );
}
