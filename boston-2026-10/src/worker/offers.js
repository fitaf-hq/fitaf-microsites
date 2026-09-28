// The offers of data/offers.json (placeholders): which one a save gets, whether a code's offer is live,
// and which general offer is current. Dates are calendar dates in the send time zone, inclusive.
import offersFile from "../../data/offers.json" with { type: "json" };

export const OFFERS = offersFile.offers;

export const isLive = (offer, today) => offer.valid_from <= today && today <= offer.valid_to;
export const offerById = (id, offers = OFFERS) => offers.find((o) => o.id === id) ?? null;

/** The general offer current on `today`. The file guarantees exactly one (test S11b). */
export function currentGeneral(today, offers = OFFERS) {
  const live = offers.filter((o) => o.applies_to === "general" && isLive(o, today));
  if (live.length !== 1) throw new Error(`expected one current general offer on ${today}, found ${live.length}`);
  return live[0];
}

/** A new save gets the live event offer, or failing that the current general offer. */
export function offerForSave(today, offers = OFFERS) {
  return offers.find((o) => o.applies_to === "event" && isLive(o, today)) ?? currentGeneral(today, offers);
}

/** "2026-11-30" -> "November 30, 2026" (a date, so formatted in UTC: no zone can shift it). */
export function longDate(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}
