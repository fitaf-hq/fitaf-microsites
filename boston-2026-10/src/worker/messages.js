// The two messages of consent/DRAFT.md § 3: E1 (the next morning, to a saved offer) and E-X (at once, to an
// out-of-area request), each as plain text AND as HTML, both rendered from ONE list of lines, so the two
// parts cannot say different things. Placeholders are filled from offers.json and events.json.
//
// A line is a list of segments: a string, `{ strong }` (the draft's bold), `{ label, href }` (a button),
// `{ label, href, plain: true }` (a text link) or, since SPEC-ui-and-copy-pass § 8, `{ accent, text }` (a word of the
// flyer's in its accent colour). Text renders both kinds of link as "label: href" and an accent as its words; HTML draws a
// button as the page's button and a text link underlined in its sentence. A message's last line is its footer.
// The HTML is in the page's look (SPEC-rung5 § 9, styles in email-style.js); its words are the text's.
// ⭐ Since SPEC-ui-and-copy-pass § 8 (2026-10-26) E1 is in the printed flyers' language (e1Html below): the band (the flyer
// front's headline and lede, read from data/flyer-front.json by email-band.js), the slideshow when the photo manifest has
// one (email-photos.json, `npm run email:photos`), the whole orange panel one link, the line under it, Already ordered?, and
// a dark footer. Its text part is the same lines from the same list. E-X is renderHtml's, byte for byte as before.
import { bandLines } from "./email-band.js";
import photos from "./email-photos.json" with { type: "json" };
import { BUTTON_BGCOLOR, E1_BGCOLOR, E1_IMAGES, E1_STYLE, FOOT_LOGO_CELL_PX, LAYOUT_WIDTH_PX, LOGO, STYLE } from "./email-style.js";
import { longDate } from "./offers.js";

export const POSTAL_ADDRESS = "Fit AF Nutrition, 10 Enterprise, Carbondale, PA 18407.";
export const E1_SUBJECT = "Your Fit AF offer, as promised";
export const EX_SUBJECT = "Confirm: we'll tell you when Fit AF delivers near you";

/** "ABCD2345" -> "ABCD-2345": the code as the email shows it. */
export const displayCode = (code) => `${code.slice(0, 4)}-${code.slice(4)}`;

const strong = (text) => ({ strong: text });
const button = (label, href) => ({ label, href });
/** A quiet link, in its sentence (the marketing consent's kind, SPEC-rung5 § 9; since SPEC-ui-and-copy-pass § 8 item 7 E1's
 *  one is its footer's eatfitaf.com). */
const textLink = (label, href) => ({ label, href, plain: true });

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESCAPES[c]);

function segmentText(s) {
  if (typeof s === "string") return s;
  if ("accent" in s) return s.text;
  return "href" in s ? `${s.label}: ${s.href}` : s.strong;
}

const isButton = (s) => typeof s === "object" && "href" in s && !s.plain;

/** `linkStyle`: a text link's style (E1's footer is the only message with one). */
function segmentHtml(s, linkStyle) {
  if (typeof s === "string") return esc(s);
  if ("accent" in s) return `<span style="${E1_STYLE.accent(s.accent)}">${esc(s.text)}</span>`;
  if ("href" in s) return `<a href="${esc(s.href)}" style="${linkStyle}">${esc(s.label)}</a>`;
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
  const paragraph = (words, beforeButton) => `<p style="${textStyle(beforeButton)}">${words.map((w) => segmentHtml(w)).join("")}</p>`;
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
  return documentHtml(subject, rows);
}

/** The document around a message's rows: one centred layout table at most 600 px, light only. */
const documentHtml = (subject, rows) =>
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n` +
  `<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
  `<meta name="color-scheme" content="light">\n<meta name="supported-color-schemes" content="light">\n` +
  `<title>${esc(subject)}</title>\n</head>\n<body style="${STYLE.body}">\n` +
  `<table role="presentation" align="center" width="${LAYOUT_WIDTH_PX}" cellpadding="0" cellspacing="0" border="0" ` +
  `style="${STYLE.layout}">\n${rows.join("\n")}\n</table>\n</body>\n</html>\n`;

// ---- E1 (SPEC-ui-and-copy-pass § 8) ----

/** Where a row holds several lines, each but its last ends with this newline in the source, after the <br> or the block
 *  that breaks it: the HTML collapses it, and a reader of the source (test/email-html.mjs lineTexts) counts a line. */
const LINE_BREAK = "<br>\n";
const LINE_GAP = "\n";

/** The slideshow's address and size from a photo manifest (`base` + file, as every photo sheet's: a relative base on
 *  SITE_URL, an absolute one as written), or null: no entry, or a null base (every photograph removed). */
function slideshowOf(manifest, siteUrl) {
  const entry = manifest?.base == null ? null : manifest.email_slideshow;
  if (!entry) return null;
  const src = /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(manifest.base) ? `${manifest.base}${entry.file}` : `${siteUrl}/${manifest.base}${entry.file}`;
  return { src, width: entry.width, height: entry.height };
}

const img = (src, { alt, widthPx, heightPx }, style) =>
  `<img src="${esc(src)}" alt="${esc(alt)}" width="${widthPx}" height="${heightPx}" style="${style}">`;

const linesHtml = (lines, linkStyle) => lines.map((line) => line.map((s) => segmentHtml(s, linkStyle)).join("")).join(LINE_BREAK);

/**
 * E1's HTML part: the band (--ink with the halftone tile as its cell's background image; the logo's column at the right
 * of the headline's, the lede under them), the slideshow, the panel (its cell the colour and the halftone, its one link
 * the padding), the line under it, Already ordered?, and the footer (--ink with the halftone; its words, the logo at the
 * right). Inline styles only, every coloured cell's colour also its bgcolor.
 */
function e1Html(subject, { band, slideshow, cta, saved, after, footer, siteUrl }) {
  const at = (path) => esc(`${siteUrl}${path}`);
  const halftone = (path, colour) => `bgcolor="${colour}" background="${at(path)}"`;
  const rows = [
    `<tr><td ${halftone(E1_IMAGES.halftoneInk, E1_BGCOLOR.ground)} style="${E1_STYLE.band}">` +
      `<div dir="rtl" style="${E1_STYLE.bandTop}">` +
      `<div dir="ltr" style="${E1_STYLE.logoColumn}">${img(`${siteUrl}${E1_IMAGES.bandLogo.path}`, E1_IMAGES.bandLogo, E1_STYLE.bandLogo)}</div>` +
      `<div dir="ltr" style="${E1_STYLE.headlineColumn}"><h1 style="${E1_STYLE.headline}">${linesHtml(band.headline)}</h1></div>` +
      `</div>${LINE_GAP}<p style="${E1_STYLE.lede}">${linesHtml(band.lede)}</p></td></tr>`,
    ...(slideshow
      ? [
          `<tr><td style="${E1_STYLE.photoCell}">` +
            `${img(slideshow.src, { alt: "", widthPx: slideshow.width, heightPx: slideshow.height }, E1_STYLE.photo)}</td></tr>`,
        ]
      : []),
    `<tr><td style="${E1_STYLE.panelRow}">` +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${E1_STYLE.panelTable}"><tr>` +
      `<td align="center" ${halftone(E1_IMAGES.halftoneCta, E1_BGCOLOR.panel)} style="${E1_STYLE.panelCell}">` +
      `<a href="${esc(cta.href)}" style="${E1_STYLE.panelLink}">${esc(cta.label)}</a></td></tr></table></td></tr>`,
    `<tr><td style="${E1_STYLE.savedRow}"><p style="${E1_STYLE.centred}">${linesHtml([saved])}</p></td></tr>`,
    ...after.map((line) => `<tr><td style="${E1_STYLE.alreadyRow}"><p style="${E1_STYLE.centred}">${linesHtml([line])}</p></td></tr>`),
    `<tr><td ${halftone(E1_IMAGES.halftoneInk, E1_BGCOLOR.ground)} style="${E1_STYLE.foot}">` +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${E1_STYLE.footTable}"><tr>` +
      `<td style="${E1_STYLE.footWords}"><p style="${E1_STYLE.footText}">${linesHtml(footer, E1_STYLE.footLink)}</p></td>` +
      `<td align="right" width="${FOOT_LOGO_CELL_PX}" style="${E1_STYLE.footLogoCell}">` +
      `${img(`${siteUrl}${E1_IMAGES.footLogo.path}`, E1_IMAGES.footLogo, E1_STYLE.footLogo)}</td></tr></table></td></tr>`,
  ];
  return documentHtml(subject, rows);
}

/** `lines` then `footer`: the text part is all of them in order, exactly as before the HTML was styled. */
const message = (template, to, subject, siteUrl, lines, footer) => ({
  template,
  to,
  subject,
  text: renderText([...lines, ...footer]),
  html: renderHtml(subject, { lines, footer, siteUrl }),
});

/**
 * E1's second line, what the save holds (DRAFT § 3, its two marked forms). SPEC-save-offer-production § 10: an offer with
 * `code_mode: "none"` is a price promise, so it says the date its pricing is held until (the offer's valid_to) and no
 * code; an offer that carries a code says the code. Either way `code` is the save's /o token, in See my offer's path only.
 * SPEC-ui-and-copy-pass § 1 item 4 (2026-10-23): the code's line reads "held until", as every other line does.
 */
const savedLine = (offer, code, held) =>
  offer.code_mode === "none"
    ? ["Your pricing is held until ", strong(longDate(held))]
    : [strong(`Your code: ${displayCode(code)}`), " · held until ", strong(longDate(offer.valid_to))];
/** § 10.7: an E1 that goes after its offer's last day (a save on that day) says the offer has ended (DRAFT § 3's form). */
const ENDED_LINE = ["This offer has ended"];

/** SPEC-ui-and-copy-pass § 8 item 3: the panel's words (the Advisor's); item 4, once the offer has ended, the draft's
 *  See my offer, since Claim would be false (⬜ the orchestrator's default, put to the Advisor). */
const CLAIM = "Claim my offer";
const SEE = "See my offer";
/** Item 6: the footer's first line, its link the literal eatfitaf.com to SITE_URL/; the address on a line of its own. */
const FOOTER_WORDS = "You're getting this email because you saved an offer at ";
const FOOTER_LINK_LABEL = "eatfitaf.com";

/**
 * E1 (SPEC-ui-and-copy-pass § 8), top to bottom: the band (the flyer front's headline, a line each, and its lede), the
 * slideshow when `photos` (the photo manifest's copy) has one, the panel's one link, the save's line under it, Already
 * ordered?, and the footer's two lines. `held` is the save's held date (SPEC-save-offer-production § 10.9; its offer's
 * valid_to unless later); `ended` when it goes after that date. `front` is the flyer front's words. ⚠ Item 7 removed
 * "You saved this offer at [event] yesterday" and the marketing consent's line, so `event` and `token` are no longer
 * drawn (the send path still passes them: a ticked save's token is still derived and its hash stored).
 */
export function e1({ to, code, offer, siteUrl, held = offer.valid_to, ended = false, front, photos: manifest = photos }) {
  const band = bandLines(front);
  const cta = button(ended ? SEE : CLAIM, `${siteUrl}/o/${code}`);
  const saved = ended ? ENDED_LINE : savedLine(offer, code, held);
  const after = [["Already ordered? Enjoy your meals!"]];
  const footer = [[FOOTER_WORDS, textLink(FOOTER_LINK_LABEL, `${siteUrl}/`)], [POSTAL_ADDRESS]];
  const lines = [...band.headline, ...band.lede, [cta], saved, ...after, ...footer];
  const slideshow = slideshowOf(manifest, siteUrl);
  return { template: "E1", to, subject: E1_SUBJECT, text: renderText(lines), html: e1Html(E1_SUBJECT, { band, slideshow, cta, saved, after, footer, siteUrl }) };
}

/** E-X: one confirmation, at once. */
export function ex({ to, zip, siteUrl, token, unconfirmedDays }) {
  const lines = [
    ["You asked us to tell you when Fit AF delivers near ", strong(zip), ". ", button("Yes, tell me", `${siteUrl}/confirm/${token}`)],
    [`If this wasn't you, ignore this email — we'll delete your details within ${unconfirmedDays} days.`],
  ];
  return message("EX", to, EX_SUBJECT, siteUrl, lines, [[POSTAL_ADDRESS]]);
}
