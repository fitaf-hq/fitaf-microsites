// The emails' look (SPEC-rung5 § 9): the page's tokens as INLINE styles, for email clients that honour no
// <style> block and load no web font. Every colour and font stack is a token of src/template.html's :root,
// read from email-tokens.json (derived by `npm run email:tokens`, checked by M17), so nothing that exists as
// a token is written here. Sizes and spacing echo the page's own rules, named after them.
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
  footer: { fg: "--muted", bg: LAYOUT_BG, role: "body", font: "--body", sizePx: 13, weight: 400, lineHeight: 1.55 },
  button: { fg: "--on-cta", bg: "--cta", role: "large-text", font: "--head", sizePx: 19, weight: 700, lineHeight: 1.2 },
};
/** What else the email draws against its background. */
const SHAPES = {
  topBar: { fg: "--navy", bg: LAYOUT_BG, role: "non-text" },
  button: { fg: "--cta", bg: LAYOUT_BG, role: "ui-or-heading" },
};

/**
 * Every colour pair the email draws. Each is declared in src/contrast-pairs.json with "build": "email" and
 * measured by `npm run contrast` (M20). The hairlines (--line) are decorative, as on the page.
 */
export const DRAWN_PAIRS = [
  ...Object.values(TEXT).map(({ fg, bg, role }) => ({ fg, bg, role, text: true })),
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
