// /o/<code> (flows/05 § 3): never a dead end. ORIGINAL (code known, its offer live) · WELCOME_BACK (code
// known, offer ended: the current offer, with a reissued unique code — at most one per original per
// offer) · CURRENT (unknown or malformed: the general offer, the same page for every such code).
// SPEC-save-offer-production § 10: an offer with `code_mode: "none"` is a price promise, so its page says the date its
// pricing is held until and shows no code (the path's token is the link's identifier, never printed), and a current offer
// without a code is shown with its date and nothing reissued.
// SPEC-analytics.md § 16 item 1 (2026-10-27): each of the four pages counts its own opening (pages.js page()'s `offer`),
// its kind the page drawn (saved: the save's offer live; welcome: ended, the current offer shown; current: an unknown
// code; ended: no offer current, for a known code or an unknown one) and `qr` the save's event id, as its link names it
// ("" for an unknown code). ⛔ Never the code, the path or anything else of the save's row.
import saveConfig from "../../data/save.json" with { type: "json" };
import { currentGeneral, heldUntilOfSave, longDate, offerById } from "./offers.js";
import { OFFER_CODE_ALPHABET, newOfferCode } from "./offer-code.js";
import { displayCode } from "./messages.js";
import { esc, htmlResponse, page } from "./pages.js";

const CODE_RE = new RegExp(`^[${OFFER_CODE_ALPHABET}]{4}-?[${OFFER_CODE_ALPHABET}]{4}$`);
const MAX_CODE_ATTEMPTS = 5;

const FIND_SQL = "SELECT save_id, event_id, offer_id, ring, send_at FROM saves WHERE offer_code = ?";
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
/** § 10.7: no offer follows the last one's end, so an ended offer's page, and an unknown code's, is the lapse: the offer
 *  has ended, and the link to the plans (the quieter style). */
const ENDED = "This offer has ended";
const endedPage = (href, qr) => page(ENDED, `<h1>${ENDED}</h1>\n${planLink(href)}`, { offer: { kind: "ended", qr } });
/** The saved offer's one action (SPEC-save-offer-production § 10.3 item 2): the same link, drawn as the store button
 *  (page.css .action); the ended and unknown offers' link back stays the quieter style. */
const actionLink = (href) => `<p class="action"><a href="${esc(href)}">Build my plan →</a></p>`;
/** SPEC-ui-and-copy-pass § 1 item 4 (the Advisor, 2026-10-23: "Let's harmonize on "held until""): a code's line, and a
 *  current offer's date, read "held until", as the saved offer's line and E1 do. */
const codeLine = (code, offer) =>
  `<p>Your code: <strong>${esc(displayCode(code))}</strong> · held until ${esc(longDate(offer.valid_to))}</p>`;
/** A saved offer's line: the date its pricing is held until (no code; § 10.9, the save's held date), or its code. */
const savedLine = (code, offer, held) =>
  offer.code_mode === "none"
    ? `<p>Your pricing is held until <strong>${esc(longDate(held))}</strong></p>`
    : codeLine(code, offer);
/** The current offer's line on WELCOME_BACK: its code (reissued, or shared), or, without one, its date. */
function currentLine(current, newCode) {
  if (newCode) return codeLine(newCode, current);
  if (current.code_mode === "none") return `<p>Held until ${esc(longDate(current.valid_to))}</p>`;
  return `<p>Your code: <strong>${esc(current.shared_code)}</strong> · held until ${esc(longDate(current.valid_to))}</p>`;
}

/** An unknown code's page: no save, so no event (`qr` ""). */
function currentPage(today) {
  const offer = currentGeneral(today);
  if (!offer) return endedPage("/", "");
  return page(
    "Our current offer",
    `<h1>Our current offer</h1>\n<p><strong>${esc(offer.label)}</strong></p>\n` +
      `<p>Held until ${esc(longDate(offer.valid_to))}</p>\n${planLink("/")}`,
    { offer: { kind: "current", qr: "" } },
  );
}

export async function handleOffer(env, rawCode, { now, today }) {
  const code = CODE_RE.test(rawCode) ? rawCode.replace("-", "") : null;
  const row = code && (await env.DB.prepare(FIND_SQL).bind(code).first());
  if (!row) return htmlResponse(200, currentPage(today));

  // SPEC-save-offer-production § 9.2: the page at / (production serves no other), the save's event in ?e= (read by the page's
  // qrEvent), Flow 1 collapsed (#from-email). The event id is one of data/events.json's (validate-save.js), [a-z0-9-].
  const backTo = `/?e=${row.event_id}#from-email`;
  const back = planLink(backTo);
  const offer = offerById(row.offer_id);
  // § 10.9: a save is held from its offer's first day through its held date (its offer's last day, or its E1's day).
  const held = offer && heldUntilOfSave(offer, row.send_at, saveConfig.send_time_zone);
  if (offer && offer.valid_from <= today && today <= held) {
    return htmlResponse(
      200,
      page("Your offer", `<h1>Your offer</h1>\n<p><strong>${esc(offer.label)}</strong></p>\n${savedLine(code, offer, held)}\n${actionLink(backTo)}`, {
        offer: { kind: "saved", qr: row.event_id },
      }),
    );
  }
  const current = currentGeneral(today);
  if (!current) return htmlResponse(200, endedPage(`/?e=${row.event_id}`, row.event_id));
  const newCode = current.code_mode === "unique" ? await reissue(env.DB, row, current, now) : null;
  const line = currentLine(current, newCode);
  return htmlResponse(
    200,
    page(
      "Welcome back",
      "<h1>Welcome back — that offer ended, but here's what we have now</h1>\n" +
        `<p><strong>${esc(current.label)}</strong></p>\n${line}\n${back}`,
      { offer: { kind: "welcome", qr: row.event_id } },
    ),
  );
}
