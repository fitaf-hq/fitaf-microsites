// The two messages of consent/DRAFT.md § 3: E1 (the next morning, to a saved offer) and E-X (at once, to an
// out-of-area request), each as plain text AND as HTML, both rendered from ONE list of lines, so the two
// parts cannot say different things. Placeholders are filled from offers.json and events.json.
//
// A line is a list of segments: a string, `{ strong }` (the draft's bold) or `{ label, href }` (a button).
// Text renders a button as "label: href"; HTML as a link.
import { longDate } from "./offers.js";

export const POSTAL_ADDRESS = "Fit AF Nutrition, 10 Enterprise, Carbondale, PA 18407.";
export const E1_SUBJECT = "Your Fit AF offer, as promised";
export const EX_SUBJECT = "Confirm: we'll tell you when Fit AF delivers near you";

/** "ABCD2345" -> "ABCD-2345": the code as the email shows it. */
export const displayCode = (code) => `${code.slice(0, 4)}-${code.slice(4)}`;

const strong = (text) => ({ strong: text });
const button = (label, href) => ({ label, href });

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESCAPES[c]);

function segmentText(s) {
  if (typeof s === "string") return s;
  return "href" in s ? `${s.label}: ${s.href}` : s.strong;
}

function segmentHtml(s) {
  if (typeof s === "string") return esc(s);
  return "href" in s ? `<a href="${esc(s.href)}">${esc(s.label)}</a>` : `<strong>${esc(s.strong)}</strong>`;
}

export const renderText = (lines) => lines.map((line) => line.map(segmentText).join("")).join("\n") + "\n";

export function renderHtml(subject, lines) {
  const body = lines.map((line) => `<p>${line.map(segmentHtml).join("")}</p>`).join("\n");
  return (
    `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>${esc(subject)}</title></head>\n` +
    `<body>\n${body}\n</body>\n</html>\n`
  );
}

const message = (template, to, subject, lines) => ({
  template,
  to,
  subject,
  text: renderText(lines),
  html: renderHtml(subject, lines),
});

/** E1. `token` is present only when the marketing box was ticked. */
export function e1({ to, code, offer, event, siteUrl, token }) {
  const lines = [
    ["You saved this offer at ", strong(event.name), " yesterday — here it is."],
    [strong(`Your code: ${displayCode(code)}`), " · good until ", strong(longDate(offer.valid_to))],
    [button("See my offer", `${siteUrl}/o/${code}`)],
  ];
  if (token) {
    lines.push(["You asked to hear about Fit AF menus and offers. ", button("Yes, keep me posted", `${siteUrl}/confirm/${token}`)]);
  }
  lines.push(["Already ordered? Enjoy your meals!"], [`You're getting this one email because you saved an offer. ${POSTAL_ADDRESS}`]);
  return message("E1", to, E1_SUBJECT, lines);
}

/** E-X: one confirmation, at once. */
export function ex({ to, zip, siteUrl, token, unconfirmedDays }) {
  const lines = [
    ["You asked us to tell you when Fit AF delivers near ", strong(zip), ". ", button("Yes, tell me", `${siteUrl}/confirm/${token}`)],
    [`If this wasn't you, ignore this email — we'll delete your details within ${unconfirmedDays} days.`],
    [POSTAL_ADDRESS],
  ];
  return message("EX", to, EX_SUBJECT, lines);
}
