// The emails' look (SPEC-rung5 § 9): the page's tokens as INLINE styles, for email clients that honour no
// <style> block and load no web font. Every colour and font stack is a token of src/template.html's :root,
// read from email-tokens.json (derived by `npm run email:tokens`, checked by M17), so nothing that exists as
// a token is written here. Sizes and spacing echo the page's own rules, named after them.
// Since SPEC-ui-and-copy-pass § 8 (2026-10-26) E1 has a look of its own, in the printed flyers' language (its band, its
// slideshow, its button the whole orange panel, its dark footer: E1_STYLE below); E-X's look above it is unchanged.
import { FLYER_FRONT, HEADLINE_ACCENT, ledeAccentOf } from "./email-band.js";
import file from "./email-tokens.json" with { type: "json" };

function token(name) {
  const value = file.tokens[name];
  if (value === undefined) throw new Error(`email-tokens.json has no ${name}: run npm run email:tokens`);
  return value;
}

/** Declarations -> a style attribute's value. Nothing in it may close the attribute or open a tag. */
function css(decls) {
  const out = Object.entries(decls)
    .map(([property, value]) => `${property}:${value}`)
    .join(";");
  if (/["<>&]/.test(out)) throw new Error(`a style would break its attribute: ${out}`);
  return `${out};`;
}

/** A font stack inside style="…": the token's double quotes become single quotes. */
const stack = (name) => token(name).replaceAll('"', "'");
const px = (n) => (n === 0 ? "0" : `${n}px`);

export const LAYOUT_WIDTH_PX = 600;
const LAYOUT_BG = "--white"; // body { background } on the page
const GUTTER_PX = 24;
const TOP_BAR_PX = 8; // the page's navy top bar, without its text: the email's words are the draft's alone
const LOGO_PAD_PX = 8; // the page's 72px header around the 56px logo
const LINE_GAP_PX = 16;
const FIRST_LINE_TOP_PX = 28;
const FOOT_GAP_PX = 36; // .foot { margin-top } on the page
const FOOT_PAD = { top: 20, bottom: 40 }; // .foot .wrap on the page
const TEXT_BEFORE_BUTTON_PX = 12;
const BUTTON_RADIUS_PX = 4; // .cta on the page
const BUTTON_PAD = "14px 20px"; // .cta on the page

/** The logo as the page shows it (.logo, 88x56 of the 330x210 file), served from the Worker's assets. */
export const LOGO = { path: "/assets/fitaf-logo.png", alt: "Fit AF", widthPx: 88, heightPx: 56 };

/** Each kind of text: its colour on its background (tokens), its APCA role, its font as on the page. */
const TEXT = {
  line: { fg: "--ink", bg: LAYOUT_BG, role: "body", font: "--body", sizePx: 16, weight: 400, lineHeight: 1.55 },
  strong: { fg: "--navy", bg: LAYOUT_BG, role: "body", weight: 600 },
  // E1's marketing consent was a quiet link here (--navy, the Advisor 2026-09-29) until SPEC-ui-and-copy-pass § 8 item 7
  // removed it; no email draws it now, so its pair is gone too. E1's one text link is its footer's (E1_TEXT.band).
  footer: { fg: "--muted", bg: LAYOUT_BG, role: "body", font: "--body", sizePx: 13, weight: 400, lineHeight: 1.55 },
  button: { fg: "--on-cta", bg: "--cta", role: "large-text", font: "--head", sizePx: 19, weight: 700, lineHeight: 1.2 },
};
/** What else the email draws against its background. */
const SHAPES = {
  topBar: { fg: "--navy", bg: LAYOUT_BG, role: "non-text" },
  button: { fg: "--cta", bg: LAYOUT_BG, role: "ui-or-heading" },
};

/**
 * SPEC-ui-and-copy-pass § 8: what E1 draws on its band and its footer (--ink) and its button (--cta). The band's words are
 * the flyer front's (email-band.js), its accents in the flyer's colours; the headline, at 34px/700, is a large heading.
 */
const E1_TEXT = {
  band: { fg: "--white", bg: "--ink", role: "body" }, // the headline and the lede; the footer's links
  headlineAccent: { fg: HEADLINE_ACCENT, bg: "--ink", role: "ui-or-heading" },
  ledeAccent: { fg: ledeAccentOf(FLYER_FRONT), bg: "--ink", role: "body" },
  footer: { fg: "--line", bg: "--ink", role: "body" },
  panel: { fg: "--on-cta", bg: "--cta", role: "large-text" },
};

/**
 * Every colour pair the email draws. Each is declared in src/contrast-pairs.json with "build": "email" and
 * measured by `npm run contrast` (M20). The hairlines (--line) are decorative, as on the page; the halftone's dots are a
 * texture under the words, declared as not measured (contrast-pairs.json), the words measured on the ground it is on.
 */
export const DRAWN_PAIRS = [
  ...[...Object.values(TEXT), ...Object.values(E1_TEXT)].map(({ fg, bg, role }) => ({ fg, bg, role, text: true })),
  ...Object.values(SHAPES).map(({ fg, bg, role }) => ({ fg, bg, role, text: false })),
];

const font = (t) => ({
  "font-family": stack(t.font),
  "font-size": px(t.sizePx),
  "font-weight": String(t.weight),
  "line-height": px(Math.round(t.sizePx * t.lineHeight)),
  color: token(t.fg),
});
const hairline = `1px solid ${token("--line")}`;

/** The button's colour, also given as a bgcolor attribute (Outlook draws the cell's, not the link's). */
export const BUTTON_BGCOLOR = token(TEXT.button.bg);

export const STYLE = {
  body: css({ margin: "0", padding: "0", "background-color": token(LAYOUT_BG) }),
  layout: css({
    width: "100%",
    "max-width": px(LAYOUT_WIDTH_PX),
    margin: "0 auto",
    "border-collapse": "collapse",
    "background-color": token(LAYOUT_BG),
  }),
  header: css({
    padding: `${px(LOGO_PAD_PX)} ${px(GUTTER_PX)}`,
    "border-top": `${px(TOP_BAR_PX)} solid ${token(SHAPES.topBar.fg)}`,
    "border-bottom": hairline,
  }),
  logo: css({ display: "block", width: px(LOGO.widthPx), height: px(LOGO.heightPx), border: "0" }),
  /** A line's cell: the first sits clear of the header, the last clear of the footer. */
  lineCell: (first, last) =>
    css({ padding: `${px(first ? FIRST_LINE_TOP_PX : 0)} ${px(GUTTER_PX)} ${px(last ? FOOT_GAP_PX : LINE_GAP_PX)}` }),
  footerCell: (first, last) =>
    css({
      padding: `${px(first ? FOOT_PAD.top : 0)} ${px(GUTTER_PX)} ${px(last ? FOOT_PAD.bottom : LINE_GAP_PX)}`,
      ...(first && { "border-top": hairline }),
    }),
  text: (beforeButton) => css({ margin: `0 0 ${px(beforeButton ? TEXT_BEFORE_BUTTON_PX : 0)}`, ...font(TEXT.line) }),
  footerText: (beforeButton) => css({ margin: `0 0 ${px(beforeButton ? TEXT_BEFORE_BUTTON_PX : 0)}`, ...font(TEXT.footer) }),
  strong: css({ "font-weight": String(TEXT.strong.weight), color: token(TEXT.strong.fg) }),
  /** border-collapse is inherited, and the layout's `collapse` would drop the cell's rounded corners. */
  buttonTable: css({ "border-collapse": "separate" }),
  buttonCell: css({ "border-radius": px(BUTTON_RADIUS_PX), "background-color": BUTTON_BGCOLOR, "mso-padding-alt": BUTTON_PAD }),
  buttonLink: css({
    display: "inline-block",
    padding: BUTTON_PAD,
    "border-radius": px(BUTTON_RADIUS_PX),
    "background-color": BUTTON_BGCOLOR,
    ...font(TEXT.button),
    "letter-spacing": "0.03em",
    "text-transform": "uppercase",
    "text-decoration": "none",
  }),
};

// ---- SPEC-ui-and-copy-pass § 8 (2026-10-26): E1 in the flyers' language. ----

/** E1's images (`npm run email:images`), served from the Worker's assets as the page's logo is; the reversed logo at the
 *  band's top right, and smaller at the footer's right (one file, twice the band's width). */
export const E1_IMAGES = {
  halftoneInk: "/assets/email/halftone-ink.png",
  halftoneCta: "/assets/email/halftone-cta.png",
  bandLogo: { path: "/assets/email/fitaf-logo-reversed.png", alt: "Fit AF", widthPx: 120, heightPx: 52 },
  footLogo: { path: "/assets/email/fitaf-logo-reversed.png", alt: "", widthPx: 90, heightPx: 39 },
};
const BAND_PAD = { top: 28, bottom: 26 };
/** The headline at the approved mock's 34px (a large heading: its accent's pair is measured as one), the flyer's tracking. */
const HEADLINE = { sizePx: 34, lineHeightPx: 37, tracking: "-0.01em" };
const LEDE = { sizePx: 16, lineHeightPx: 22, weight: 600, gapPx: 14 };
/** The band's top: the logo's column at the right, the headline's beside it, filling the 600 px layout between the
 *  gutters exactly; narrower, the headline's column drops under the logo (each an inline block in a right-to-left row). */
export const HEADLINE_COLUMN_PX = LAYOUT_WIDTH_PX - 2 * GUTTER_PX - E1_IMAGES.bandLogo.widthPx;
const PANEL = { topPx: 28, pad: "34px 24px", sizePx: 34, lineHeightPx: 38, tracking: "0.01em" };
const SAVED_TOP_PX = 14;
const ALREADY_PAD = { top: 20, bottom: 32 };
const E1_FOOT = { top: 20, bottom: 22, sizePx: 13, lineHeightPx: 20, logoGapPx: 16, consentGapPx: 8 };

/** The colours E1 puts on a cell as bgcolor too (Outlook draws the cell's, not a background image). */
export const E1_BGCOLOR = { ground: token("--ink"), panel: token("--cta") };
/** The footer logo's cell: the logo and the gap before it. */
export const FOOT_LOGO_CELL_PX = E1_IMAGES.footLogo.widthPx + E1_FOOT.logoGapPx;

const e1Font = (t, sizePx, lineHeightPx, weight) => ({
  "font-family": stack(t),
  "font-size": px(sizePx),
  "font-weight": String(weight),
  "line-height": px(lineHeightPx),
});

export const E1_STYLE = {
  band: css({ padding: `${px(BAND_PAD.top)} ${px(GUTTER_PX)} ${px(BAND_PAD.bottom)}`, "background-color": E1_BGCOLOR.ground }),
  bandTop: css({ "text-align": "right" }),
  logoColumn: css({ display: "inline-block", width: px(E1_IMAGES.bandLogo.widthPx), "vertical-align": "top", "text-align": "right" }),
  bandLogo: css({ display: "block", width: px(E1_IMAGES.bandLogo.widthPx), height: px(E1_IMAGES.bandLogo.heightPx), border: "0" }),
  headlineColumn: css({ display: "inline-block", width: "100%", "max-width": px(HEADLINE_COLUMN_PX), "vertical-align": "top", "text-align": "left" }),
  headline: css({
    margin: "0",
    ...e1Font(TEXT.button.font, HEADLINE.sizePx, HEADLINE.lineHeightPx, 700),
    "letter-spacing": HEADLINE.tracking,
    "text-transform": "uppercase",
    color: token(E1_TEXT.band.fg),
  }),
  lede: css({
    margin: `${px(LEDE.gapPx)} 0 0`,
    ...e1Font(TEXT.line.font, LEDE.sizePx, LEDE.lineHeightPx, LEDE.weight),
    color: token(E1_TEXT.band.fg),
  }),
  /** An accent word: its token's colour, the line's own type. */
  accent: (name) => css({ color: token(name) }),
  photoCell: css({ padding: "0" }),
  photo: css({ display: "block", width: "100%", "max-width": px(LAYOUT_WIDTH_PX), height: "auto", border: "0" }),
  panelRow: css({ padding: `${px(PANEL.topPx)} ${px(GUTTER_PX)} 0` }),
  panelTable: css({ "border-collapse": "separate" }),
  panelCell: css({ "border-radius": token("--radius"), "background-color": E1_BGCOLOR.panel, "mso-padding-alt": PANEL.pad }),
  /** The whole panel is the link: a block with the padding, no colour of its own (the cell's halftone shows through). */
  panelLink: css({
    display: "block",
    padding: PANEL.pad,
    ...e1Font(TEXT.button.font, PANEL.sizePx, PANEL.lineHeightPx, 700),
    color: token(E1_TEXT.panel.fg),
    "letter-spacing": PANEL.tracking,
    "text-transform": "uppercase",
    "text-align": "center",
    "text-decoration": "none",
  }),
  savedRow: css({ padding: `${px(SAVED_TOP_PX)} ${px(GUTTER_PX)} 0` }),
  alreadyRow: css({ padding: `${px(ALREADY_PAD.top)} ${px(GUTTER_PX)} ${px(ALREADY_PAD.bottom)}` }),
  centred: css({ margin: "0", ...font(TEXT.line), "text-align": "center" }),
  foot: css({ padding: `${px(E1_FOOT.top)} ${px(GUTTER_PX)} ${px(E1_FOOT.bottom)}`, "background-color": E1_BGCOLOR.ground }),
  footTable: css({ "border-collapse": "collapse" }),
  footWords: css({ padding: "0", "vertical-align": "middle" }),
  footText: css({ margin: "0", ...e1Font(TEXT.line.font, E1_FOOT.sizePx, E1_FOOT.lineHeightPx, 400), color: token(E1_TEXT.footer.fg) }),
  /** § 8.2 item 1: the consent's line, one small line of the footer's own type above its words, a little apart. */
  footConsent: css({
    margin: `0 0 ${px(E1_FOOT.consentGapPx)}`,
    ...e1Font(TEXT.line.font, E1_FOOT.sizePx, E1_FOOT.lineHeightPx, 400),
    color: token(E1_TEXT.footer.fg),
  }),
  /** The footer's links (the consent's Yes, keep me posted; eatfitaf.com): quiet, in their sentences, white, underlined. */
  footLink: css({ color: token(E1_TEXT.band.fg), "text-decoration": "underline" }),
  footLogoCell: css({ "padding-left": px(E1_FOOT.logoGapPx), "vertical-align": "middle" }),
  footLogo: css({ display: "block", width: px(E1_IMAGES.footLogo.widthPx), height: px(E1_IMAGES.footLogo.heightPx), border: "0" }),
};
