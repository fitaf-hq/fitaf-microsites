// The two messages of consent/DRAFT.md § 3: E1 (the next morning, to a saved offer) and E-X (at once, to an
// out-of-area request), each as plain text AND as HTML, both rendered from ONE list of lines, so the two
// parts cannot say different things. Placeholders are filled from offers.json and events.json.
//
// A line is a list of segments: a string, `{ strong }` (the draft's bold), `{ label, href }` (a button) or
// `{ label, href, plain: true }` (a text link). Text renders both kinds of link as "label: href"; HTML draws a
// button as the page's button and a text link underlined in its sentence. A message's last line is its footer.
// The HTML is in the page's look (SPEC-rung5 § 9, styles in email-style.js); its words are the text's.
import { BUTTON_BGCOLOR, LAYOUT_WIDTH_PX, LOGO, STYLE } from "./email-style.js";
import { longDate } from "./offers.js";

export const POSTAL_ADDRESS = "Fit AF Nutrition, 10 Enterprise, Carbondale, PA 18407.";
export const E1_SUBJECT = "Your Fit AF offer, as promised";
export const EX_SUBJECT = "Confirm: we'll tell you when Fit AF delivers near you";

/** "ABCD2345" -> "ABCD-2345": the code as the email shows it. */
export const displayCode = (code) => `${code.slice(0, 4)}-${code.slice(4)}`;

const strong = (text) => ({ strong: text });
const button = (label, href) => ({ label, href });
/** The marketing consent: a quiet link, as easy to withhold as to give (SPEC-rung5 § 9; the Advisor, 2026-09-29). */
const textLink = (label, href) => ({ label, href, plain: true });

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESCAPES[c]);

function segmentText(s) {
  if (typeof s === "string") return s;
  return "href" in s ? `${s.label}: ${s.href}` : s.strong;
}

const isButton = (s) => typeof s === "object" && "href" in s && !s.plain;

function segmentHtml(s) {
  if (typeof s === "string") return esc(s);
  if ("href" in s) return `<a href="${esc(s.href)}" style="${STYLE.textLink}">${esc(s.label)}</a>`;
  return `<strong style="${STYLE.strong}">${esc(s.strong)}</strong>`;
}

/** A bulletproof button: the colour on the table cell (Outlook draws that), the padding on the link. */
const buttonHtml = ({ label, href }) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="${STYLE.buttonTable}"><tr>` +
  `<td align="center" bgcolor="${BUTTON_BGCOLOR}" style="${STYLE.buttonCell}">` +
  `<a href="${esc(href)}" style="${STYLE.buttonLink}">${esc(label)}</a></td></tr></table>`;

/** One line: its words as paragraphs, each button under the words before it. No whitespace is added. */
function lineHtml(line, textStyle) {
  const blocks = [];
  for (const s of line) {
    if (isButton(s)) blocks.push({ button: s });
    else if (blocks.at(-1)?.words) blocks.at(-1).words.push(s);
    else blocks.push({ words: [s] });
  }
  const paragraph = (words, beforeButton) => `<p style="${textStyle(beforeButton)}">${words.map(segmentHtml).join("")}</p>`;
  return blocks.map((b, i) => (b.button ? buttonHtml(b.button) : paragraph(b.words, Boolean(blocks[i + 1])))).join("");
}

const row = (cellStyle, inner) => `<tr><td style="${cellStyle}">${inner}</td></tr>`;

export const renderText = (lines) => lines.map((line) => line.map(segmentText).join("")).join("\n") + "\n";

/**
 * One centred table: the logo (from SITE_URL, i.e. the Worker's assets), a row per line, the footer's rows.
 * Inline styles only. No preheader: the draft supplies none.
 */
export function renderHtml(subject, { lines, footer, siteUrl }) {
  const logo =
    `<img src="${esc(`${siteUrl}${LOGO.path}`)}" alt="${esc(LOGO.alt)}" width="${LOGO.widthPx}" ` +
    `height="${LOGO.heightPx}" style="${STYLE.logo}">`;
  const rows = [
    row(STYLE.header, logo),
    ...lines.map((line, i) => row(STYLE.lineCell(i === 0, i === lines.length - 1), lineHtml(line, STYLE.text))),
    ...footer.map((line, i) => row(STYLE.footerCell(i === 0, i === footer.length - 1), lineHtml(line, STYLE.footerText))),
  ];
  return (
    `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
    `<meta name="color-scheme" content="light">\n<meta name="supported-color-schemes" content="light">\n` +
    `<title>${esc(subject)}</title>\n</head>\n<body style="${STYLE.body}">\n` +
    `<table role="presentation" align="center" width="${LAYOUT_WIDTH_PX}" cellpadding="0" cellspacing="0" border="0" ` +
    `style="${STYLE.layout}">\n${rows.join("\n")}\n</table>\n</body>\n</html>\n`
  );
}

/** `lines` then `footer`: the text part is all of them in order, exactly as before the HTML was styled. */
const message = (template, to, subject, siteUrl, lines, footer) => ({
  template,
  to,
  subject,
  text: renderText([...lines, ...footer]),
  html: renderHtml(subject, { lines, footer, siteUrl }),
});

/** E1. `token` is present only when the marketing box was ticked. */
export function e1({ to, code, offer, event, siteUrl, token }) {
  const lines = [
    ["You saved this offer at ", strong(event.name), " yesterday — here it is."],
    [strong(`Your code: ${displayCode(code)}`), " · good until ", strong(longDate(offer.valid_to))],
    [button("See my offer", `${siteUrl}/o/${code}`)],
  ];
  if (token) {
    lines.push(["You asked to hear about Fit AF menus and offers. ", textLink("Yes, keep me posted", `${siteUrl}/confirm/${token}`)]);
  }
  lines.push(["Already ordered? Enjoy your meals!"]);
  const footer = [[`You're getting this one email because you saved an offer. ${POSTAL_ADDRESS}`]];
  return message("E1", to, E1_SUBJECT, siteUrl, lines, footer);
}

/** E-X: one confirmation, at once. */
export function ex({ to, zip, siteUrl, token, unconfirmedDays }) {
  const lines = [
    ["You asked us to tell you when Fit AF delivers near ", strong(zip), ". ", button("Yes, tell me", `${siteUrl}/confirm/${token}`)],
    [`If this wasn't you, ignore this email — we'll delete your details within ${unconfirmedDays} days.`],
  ];
  return message("EX", to, EX_SUBJECT, siteUrl, lines, [[POSTAL_ADDRESS]]);
}
