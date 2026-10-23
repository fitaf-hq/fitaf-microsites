// The offers of data/offers.json: which one a save gets, whether a code's offer is live, and which general offer is
// current. Dates are calendar dates in the send time zone, inclusive. SPEC-save-offer-production § 10.7: the file holds one
// offer, every visitor's, and after its valid_to no offer is offered (offerForSave and currentGeneral answer null).
import offersFile from "../../data/offers.json" with { type: "json" };
import { zonedDate } from "./zoned-time.js";

export const OFFERS = offersFile.offers;

export const isLive = (offer, today) => offer.valid_from <= today && today <= offer.valid_to;
export const offerById = (id, offers = OFFERS) => offers.find((o) => o.id === id) ?? null;

/** The general offer current on `today`, or null when none is (§ 10.7). The file guarantees at most one (test S11b). */
export function currentGeneral(today, offers = OFFERS) {
  const live = offers.filter((o) => o.applies_to === "general" && isLive(o, today));
  if (live.length > 1) throw new Error(`expected at most one current general offer on ${today}, found ${live.length}`);
  return live[0] ?? null;
}

/** A new save gets the live event offer, or failing that the current general offer; null when neither is (§ 10.7). */
export function offerForSave(today, offers = OFFERS) {
  return offers.find((o) => o.applies_to === "event" && isLive(o, today)) ?? currentGeneral(today, offers);
}

/** SPEC-save-offer-production § 10.9: the day a save's pricing is held until, the later of its offer's valid_to and the
 *  day its E1 is due ("YYYY-MM-DD" each; a save made on the offer's last day is held through the next). */
export function heldUntil(offer, dueDay) {
  return dueDay && dueDay > offer.valid_to ? dueDay : offer.valid_to;
}

/** The same for a saved row: its E1's due day is its `send_at`'s date in `zone` (no send_at: the offer's valid_to). */
export const heldUntilOfSave = (offer, sendAt, zone) => heldUntil(offer, sendAt ? zonedDate(Date.parse(sendAt), zone) : null);

/** "2026-11-30" -> "November 30, 2026" (a date, so formatted in UTC: no zone can shift it). */
export function longDate(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}
