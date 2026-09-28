// The two messages of consent/DRAFT.md § 3, as plain text: E1 (the next morning, to a saved offer) and
// E-X (at once, to an out-of-area request). Placeholders are filled from offers.json and events.json.
import { longDate } from "./offers.js";

export const POSTAL_ADDRESS = "Fit AF Nutrition, 10 Enterprise, Carbondale, PA 18407.";
export const E1_SUBJECT = "Your Fit AF offer, as promised";
export const EX_SUBJECT = "Confirm: we'll tell you when Fit AF delivers near you";

/** "ABCD2345" -> "ABCD-2345": the code as the email shows it. */
export const displayCode = (code) => `${code.slice(0, 4)}-${code.slice(4)}`;

/** E1. `token` is present only when the marketing box was ticked. */
export function e1({ to, code, offer, event, siteUrl, token }) {
  const lines = [
    `You saved this offer at ${event.name} yesterday — here it is.`,
    `Your code: ${displayCode(code)} · good until ${longDate(offer.valid_to)}`,
    `See my offer: ${siteUrl}/o/${code}`,
  ];
  if (token) {
    lines.push(`You asked to hear about Fit AF menus and offers. Yes, keep me posted: ${siteUrl}/confirm/${token}`);
  }
  lines.push("Already ordered? Enjoy your meals!", `You're getting this one email because you saved an offer. ${POSTAL_ADDRESS}`);
  return { template: "E1", to, subject: E1_SUBJECT, text: lines.join("\n") + "\n" };
}

/** E-X: one confirmation, at once. */
export function ex({ to, zip, siteUrl, token, unconfirmedDays }) {
  const lines = [
    `You asked us to tell you when Fit AF delivers near ${zip}. Yes, tell me: ${siteUrl}/confirm/${token}`,
    `If this wasn't you, ignore this email — we'll delete your details within ${unconfirmedDays} days.`,
    POSTAL_ADDRESS,
  ];
  return { template: "EX", to, subject: EX_SUBJECT, text: lines.join("\n") + "\n" };
}
