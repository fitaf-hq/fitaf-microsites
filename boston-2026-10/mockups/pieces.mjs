// The four mock-ups: a tabletop tent card, a quarter-page flyer, a retractable banner and a slideshow.
// Mock-ups for a screen share: nothing here is print-ready. Each is laid out at a fixed size in CSS pixels
// that keeps the real piece's proportions; the sheet scales it to the window.
import { icon } from "../print/icons.mjs";
import { campaign, esc, makeParts } from "./parts.mjs";

/** The mock-ups' layout unit: CSS pixels per inch of the real piece (the print build zooms it to the CSS inch). */
export const PX_PER_INCH = 120;
/** The banner is scaled down to fit a screen: 33 × 80 in at this many pixels per inch. */
const BANNER_PX_PER_INCH = 12.125;
const px = (inches, per = PX_PER_INCH) => Math.round(inches * per);

export const PIECES = [
  { id: "tent-card", file: "tent-card.html", png: "tent-card.png", title: "Tabletop tent card", size: "the face, 4 × 6 in", w: px(4), h: px(6) },
  { id: "flyer", file: "flyer.html", png: "flyer.png", title: "Quarter-page flyer", size: "4.25 × 5.5 in", w: px(4.25), h: px(5.5) },
  {
    id: "banner",
    file: "banner.html",
    png: "banner.png",
    title: "Retractable banner",
    size: "33 × 80 in, scaled to fit a screen",
    w: px(33, BANNER_PX_PER_INCH),
    h: px(80, BANNER_PX_PER_INCH),
  },
  { id: "slideshow", file: "slideshow.html", png: null, title: "Slideshow", size: "full screen: ← → or click, L for the legend, N for file names, F for full screen" },
];
const piece = (id) => PIECES.find((p) => p.id === id);

function head(title, inputs) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Fit AF mock-up</title>
<style>
${inputs.site.root}
${inputs.site.fonts}
${inputs.css.trim()}
</style>
</head>`;
}

/** A static piece on its sheet: the piece at its proportions, and beside it what it is and where it comes from. */
function sheet(p, inputs, parts, board) {
  return `${head(p.title, inputs)}
<body class="sheet">
<main class="sheet-main">
<div class="board board-${p.id}" data-w="${p.w}" data-h="${p.h}">
${board.trim()}
</div>
<aside class="aside" data-annotation>
<p class="caption"><b>${esc(p.title)}</b> · ${esc(p.size)} · a mock-up for a screen share, not for print</p>
${parts.legend()}
</aside>
</main>
<script>
${inputs.scripts.sheet.trim()}
</script>
</body>
</html>
`;
}

/** The QR code with the scan prompt and the address beside it; `under` (SPEC-print-pieces.md § 8): the address alone, under it. */
function scanBlock(parts, c, cls, { under = false } = {}) {
  if (under) return `<div class="scan scan-under ${cls}">${parts.qr(c)}${parts.text("p", "address", c.address, "web address")}</div>`;
  return `<div class="scan ${cls}">${parts.qr(c)}<div class="scan-text">${parts.text("p", "scan-prompt", c.scan, "scan prompt")}${parts.text("p", "address", c.address, "web address")}</div></div>`;
}

/**
 * The tent card's face: three photos, the logo, the headline, the offer and the QR code. The face's markup alone, shared by
 * the mock-up's sheet and the printed tent card (print/, SPEC-print-pieces.md), so one change reaches both. The printed
 * tent card's options (SPEC-print-pieces.md §§ 8 and 10), which the mock-up never passes: `short` drops the words § 8
 * drops and puts the address under the QR code; `header: false` drops the navy bar and its words; `logo: "corner"` puts
 * the one logo at the bottom right of the face, after the QR code, instead of above the headline (§ 10 withdrew § 8's
 * three logo variants, as § 9 had the flyer's). Without them a face is exactly the mock-up's, its parts made in the
 * mock-up's order, so its legend is unchanged.
 */
export function tentFace(c, parts, { short = false, header = true, logo } = {}) {
  const bar = header ? parts.line("p", "event-bar", c.eventLine, "event line") : "";
  const photos = `${parts.photo("tent-large")}${parts.photo("tent-top")}${parts.photo("tent-bottom")}`;
  const bodyLogo = logo === undefined ? parts.logo("tent-logo") : "";
  const headline = parts.text("h1", "headline", c.headline, "headline");
  const subhead = short ? "" : `
  ${parts.text("p", "subhead", c.subhead, "subhead")}`;
  const offer = parts.text("p", "offer", c.offer, "the offer");
  const scan = scanBlock(parts, c, "tent-scan", { under: short });
  const corner = logo === "corner" ? `
  ${parts.logo("tent-logo logo-corner")}` : "";
  return `
${bar}
<div class="tent-photos">${photos}</div>
<div class="tent-body">
  ${bodyLogo}
  <span class="rule"></span>
  ${headline}${subhead}
  ${offer}
  ${scan}${corner}
</div>`;
}

export function tentCard(inputs) {
  const c = campaign(inputs);
  const parts = makeParts(inputs);
  return sheet(piece("tent-card"), inputs, parts, tentFace(c, parts));
}

/**
 * The flyer: one hero photo, the offer, a short line on the plans, the QR code. Its markup alone, shared by the mock-up's
 * sheet and the printed flyer (print/). The printed flyer's options (SPEC-print-pieces.md §§ 8–9), which the mock-up never
 * passes: `short` keeps the photo, the offer and the QR code with the address; `header: false` drops the navy bar and its
 * words; `logo: "corner"` puts the one logo at the bottom right of the face, after the QR code, instead of on the photo.
 * `side: "back"` (SPEC-print-pieces.md § 12) makes the printed flyer's BACK instead, which the mock-up does not have:
 * `back.positions`' photos across its top, then `back.words` (print/back.mjs, data/flyer-back.md read), and at the bottom
 * the address and the logo; no QR code and no offer.
 */
export function flyerFace(c, parts, { short = false, header = true, logo, side = "front", back, front } = {}) {
  if (side === "back") return flyerBack(c, parts, back);
  if (front) return flyerFrontB(c, parts, front);
  const bar = header ? parts.line("p", "event-bar", c.eventLine, "event line") : "";
  const photo = parts.photo("flyer");
  const plate = logo === undefined ? `<div class="logo-plate">${parts.logo()}</div>` : "";
  const headlineBlock = short
    ? ""
    : `
  <span class="rule"></span>
  ${parts.text("h1", "headline", c.headline, "headline")}
  ${parts.text("p", "tagline", c.tagline, "tagline")}
  <div class="plans-line">${parts.planNames(c.plans, "plan names")}${parts.text("p", "from-price", c.fromPrice, "lowest price per meal")}</div>`;
  const offer = parts.text("p", "offer", c.offer, "the offer");
  const scan = scanBlock(parts, c, "flyer-scan", { under: short });
  const corner = logo === "corner" ? `
  ${parts.logo("flyer-logo logo-corner")}` : "";
  return `
${bar}
<div class="flyer-hero">${photo}${plate}</div>
<div class="flyer-body">${headlineBlock}
  ${offer}
  ${scan}${corner}
</div>`;
}

/**
 * The printed flyer's front B (SPEC-print-pieces.md § 13), print-only: a dark band with the headline (its accent line in
 * the brand's green) and the lede; the photo, a torn edge where the band meets it, and the one callout over its corner;
 * then the offer and the logo beside the QR code with the address under it. Its words are the front words file's
 * (`words`, print/front.mjs), cited by key, which no legend lists: front B is on no mock-up's sheet.
 */
function flyerFrontB(c, parts, words) {
  const cite = (key) => `data-src="${esc(`${words.source}#${key}`)}"`;
  // a line in the accent colour (`accent`), and within any line the words between asterisks
  const spans = (t) => t.split("*").map((part, j) => (j % 2 ? `<span class="fb-accent">${esc(part)}</span>` : esc(part))).join("");
  const lines = words.headline.map((t, i) => `<span class="fb-line${i === words.accent ? " fb-accent" : ""}">${spans(t)}</span>`).join("");
  const size = words.size ? ` style="font-size: ${words.size}px"` : "";
  // the QR code at error correction H (print/build-print.mjs writes it), so the logo can sit in its centre
  const qrH = { ...c, qr: { ...c.qr, path: c.qr.path.replace(/\.svg$/, "-h.svg") } };
  // § 15 item 2: the offer's banner, a level ribbon of the band's ink above the offer
  const banner = words.banner ? `<p class="fb-banner" ${cite("banner")}><span>${esc(words.banner)}</span></p>` : "";
  const offer = parts.text("p", "offer", c.offer, "the offer");
  const callout = words.callout ? `<p class="fb-callout" ${cite("callout")}>${words.callout.map((t) => `<span>${esc(t)}</span>`).join("")}</p>` : "";
  return `
<div class="fb-band">${HALFTONE}
  ${bandLogo(parts, words.logo)}
  <h1 class="fb-head" ${cite("headline")}${size}>${lines}</h1>
  <p class="fb-lede" data-lede-accent="${esc(words.ledeAccent ?? "orange")}" ${cite("lede")}>${words.lede.map((line) => `<span class="fb-lede-line">${line.split("*").map((part, j) => (j % 2 ? `<span class="fb-lede-accent">${esc(part)}</span>` : esc(part))).join("")}</span>`).join("")}</p>
</div>
<div class="fb-hero">${parts.photo("flyer")}${parts.caption("flyer", "fb-name")}<svg class="fb-edge" viewBox="0 0 510 18" preserveAspectRatio="none" aria-hidden="true"><path d="${TORN_EDGE}"/></svg>${callout}</div>
<div class="fb-foot">${FOOT_DOTS}<svg class="fb-foot-edge" viewBox="0 0 510 18" preserveAspectRatio="none" aria-hidden="true"><path d="${TORN_EDGE_UP}"/></svg>
  <div class="fb-cta">${banner}${offer}</div>
  <div class="scan scan-under fb-scan"><div class="fb-qr">${parts.qr(qrH)}${parts.logo("fb-qr-logo")}</div>${parts.text("p", "address", c.address, "web address")}</div>
</div>`;
}

/**
 * The giveaway tout (SPEC-print-pieces.md § 17), print-only: front B's look laid out landscape. Across the top, the dark
 * band (the headline, its accent words in `headlineAccent`'s colour, § 17.4 item 1; the lede) and beside it its photo, the
 * flyer's (§ 17.3 item 2), with its caption, running into the bleed on the top and the right, both 70 % of the tout's
 * height (§ 17.5 item 2); under both, on a straight edge (§ 17.4 item 2), the orange foot: the logo, out of the band (§ 17.5
 * item 5), the banner's ribbon and the fine print one left-aligned column, the ribbon's words centred (§ 17.4 item 3, § 17.5
 * item 4), and the scan unit, `scan`, the QR code and the address, stacked or side by side (§ 17.5 item 3).
 * Its words are the tout's words file's (`words`, print/tout.mjs), cited by key; no legend lists it. A box whose words
 * must not overflow it carries `data-fit` (print/checks.mjs giveawayFindings): the band, each headline line, the foot.
 */
export function toutFace(c, parts, words) {
  const cite = (key) => `data-src="${esc(`${words.source}#${key}`)}"`;
  const accented = (t, cls) => t.split("*").map((part, j) => (j % 2 ? `<span class="${cls}">${esc(part)}</span>` : esc(part))).join("");
  const lines = words.headline.map((t, i) => `<span class="fb-line${i === words.accent ? " fb-accent" : ""}" data-fit="headline line ${i + 1}">${accented(t, "fb-accent")}</span>`).join("");
  const band = words.size ? ` style="--tout-head: ${words.size}px"` : "";
  // § 17.5 item 3: the scan unit stacked, or side by side, and its code's side, as the build settles them
  const foot = words.qrPx ? ` style="--fb-qr: ${words.qrPx}px"` : "";
  // § 17.4 item 3: the fine print's size, as the build settles it (print/build-print.mjs settleTout)
  const fineSize = words.finePx ? ` style="font-size: ${words.finePx}px"` : "";
  const lede = words.lede.map((line) => `<span class="fb-lede-line">${accented(line, "fb-lede-accent")}</span>`).join("");
  // front B's code, at error correction H with the logo at its centre (print/build-print.mjs writes it)
  const qrH = { ...c, qr: { ...c.qr, path: c.qr.path.replace(/\.svg$/, "-h.svg") } };
  return `
<div class="tout-top">
<div class="fb-band tout-band" data-fit="the band"${band}>${HALFTONE}
  <h1 class="fb-head tout-head" data-head-accent="${esc(words.headlineAccent ?? "green")}" ${cite("headline")}>${lines}</h1>
  <p class="fb-lede tout-lede" data-lede-accent="${esc(words.ledeAccent)}" ${cite("lede")}>${lede}</p>
</div>
<div class="tout-hero">${parts.photo("tout")}${parts.caption("tout", "fb-name tout-name")}</div>
</div>
<div class="fb-foot tout-foot" data-fit="the foot"${foot}>
  ${footLogo(parts, words.logo)}
  <div class="fb-cta tout-cta"><p class="fb-banner tout-banner" ${cite("banner")}><span class="tout-ribbon">${esc(words.banner)}</span></p><p class="tout-fine" data-fine ${cite("fine")}${fineSize}>${esc(words.fine)}</p></div>
  <div class="scan tout-scan-unit" data-arrange="${esc(words.arrange ?? "stacked")}"><p class="tout-scan" ${cite("scan")}>${esc(words.scan)}</p><div class="fb-qr">${parts.qr(qrH)}${parts.logo("fb-qr-logo")}</div>${parts.text("p", "address", c.address, "web address")}</div>
</div>`;
}

/**
 * The giveaway's entry card (SPEC-print-pieces.md § 17 item 3, as §§ 17.2–17.3 have it), print-only and plain, for a pen,
 * one side: on white, the template's ink and one accent (its heading), no photo. Its heading, and its subhead under it
 * (§ 17.6 item 1), the logo small beside them at the top right; each field a label over a writing line (a field holding
 * blanks, the email's, its own line, across the card's whole measure and the room the fine print leaves, § 17.6 items
 * 2 and 4: each blank a writing line as long as its run, the first the longest, the words between them printed); then the
 * fine print, the rules, on the card's bottom inset, its **bold** runs bold. Its words are the entry words file's (`words`, print/entry.mjs), each cited by its line; no legend lists it. The
 * box its words must not overflow carries `data-fit` (print/checks.mjs giveawayFindings).
 */
export function entryFace(c, parts, words) {
  const cite = (line) => `data-src="${esc(`${words.source}#L${line}`)}"`;
  const own = words.front;
  const blank = (n) => `<span class="entry-line entry-blank" style="flex-grow: ${n}"></span>`;
  // § 17.6 item 2: across the card's whole measure, the first run the longest (the part before the @ is the longest to write)
  const grows = (fieldParts) => {
    const runs = fieldParts.filter((p) => p.blank).map((p) => p.blank);
    const first = Math.max(runs[0], ...runs.slice(1).map((n) => n + 1));
    let k = 0;
    return fieldParts.map((p) => (p.blank ? { blank: k++ === 0 ? first : p.blank } : p));
  };
  const field = (f) =>
    f.parts
      ? `<div class="entry-field entry-email" ${cite(f.line)}>${grows(f.parts).map((p) => (p.blank ? blank(p.blank) : `<span class="entry-email-word">${esc(p.text)}</span>`)).join("")}</div>`
      : `<div class="entry-field" ${cite(f.line)}><p class="entry-label">${esc(f.label)}</p><span class="entry-line"></span></div>`;
  // § 17.6 item 3: the fine print's size, and its bold runs set regular when ten lines need it, as the build settles them
  const fineStyle = words.finePx ? ` style="font-size: ${words.finePx}px"` : "";
  const weight = words.fineRegular ? ` data-weight="regular"` : "";
  const fine = (p) => `<p class="entry-fine" data-fine ${cite(p.line)}${fineStyle}${weight}>${p.runs.map((r) => (r.bold ? `<b>${esc(r.text)}</b>` : esc(r.text))).join("")}</p>`;
  const sub = own.subhead ? `<p class="entry-sub" ${cite(own.subhead.line)}>${esc(own.subhead.text)}</p>` : "";
  return `
<div class="entry-body" data-fit="the card">
  <div class="entry-top"><div class="entry-titles"><h1 class="entry-head" ${cite(own.heading.line)}>${esc(own.heading.text)}</h1>${sub}</div>${parts.logo("entry-logo")}</div>
  <div class="entry-fields">${own.fields.map(field).join("")}</div>
  <div class="entry-notes">${own.paragraphs.map(fine).join("")}</div>
</div>`;
}

/** § 17.5 item 5: the tout's logo in its foot, by the words file's `logo`, as the band's was (the orange is a dark ground). */
function footLogo(parts, treatment) {
  return treatment === "plate" ? parts.logo("tout-foot-logo") : parts.logoReversed(REVERSED_LOGO_FILES[treatment], "tout-foot-logo");
}

/** § 15 item 1: the band's logo by the words file's `logo`: drawn for the dark ground (its own white field gone, the
 * tagline white; or, `reversed-white`, the second word's letters white too), or pass 2's on its white plate. */
const REVERSED_LOGO_FILES = { reversed: "fitaf-logo-reversed.png", "reversed-white": "fitaf-logo-reversed-white.png" };
function bandLogo(parts, treatment) {
  return treatment === "plate" ? parts.logo("fb-logo-top") : parts.logoReversed(REVERSED_LOGO_FILES[treatment], "fb-logo-top fb-logo-rev");
}

/** § 14 item 2: the band's halftone (the grid's size, its pitch, the largest dot's radius and how far the dots reach). */
const HALFTONE_W = 300;
const HALFTONE_H = 200;
const HALFTONE_PITCH = 9;
const HALFTONE_R_MAX = 2.4;
const HALFTONE_REACH = 320;
const HALFTONE_R_MIN = 0.4;
/**
 * The Owner's own texture: opaque dots on a fixed grid, largest at the band's lower right corner and smaller with the
 * distance from it, so the tone fades by the dots' size and nothing is translucent (Q7); drawn in the colour around them
 * (print.css: the template's muted grey), a fixed drawing so every build is the same.
 */
const HALFTONE = (() => {
  const dots = [];
  for (let y = HALFTONE_H - HALFTONE_PITCH / 2; y > 0; y -= HALFTONE_PITCH) {
    for (let x = HALFTONE_W - HALFTONE_PITCH / 2; x > 0; x -= HALFTONE_PITCH) {
      const r = HALFTONE_R_MAX * Math.max(0, 1 - Math.hypot(HALFTONE_W - x, HALFTONE_H - y) / HALFTONE_REACH) ** 1.3;
      if (r >= HALFTONE_R_MIN) dots.push(`<circle cx="${x}" cy="${y}" r="${r.toFixed(2)}"/>`);
    }
  }
  return `<svg class="fb-dots" viewBox="0 0 ${HALFTONE_W} ${HALFTONE_H}" fill="currentColor" aria-hidden="true">${dots.join("")}</svg>`;
})();

/**
 * § 15 item 2b: the foot's texture, the same kind of halftone on the orange, in patches over its flat areas only: each
 * patch's dots largest at its origin and gone before they reach a word (the offer at the left, the code's white tile,
 * which covers any dot behind it, and the address under it). The grid is the foot's own (layout px, its width the face
 * and both bleeds; anchored at its lower left), a fixed drawing so every build is the same.
 */
const FOOT_DOTS_W = 540;
const FOOT_DOTS_H = 213;
const FOOT_DOTS_PITCH = 10;
const FOOT_DOTS_R_MAX = 3.4;
const FOOT_DOTS_R_MIN = 0.45;
/** Each patch: its origin (x, y from the grid's top left) and how far its dots reach. */
const FOOT_PATCHES = [
  { x: FOOT_DOTS_W, y: 0, reach: 185 }, // the top right, around the code's tile
  { x: 0, y: 0, reach: 56 }, // the top left, under the torn edge and above the banner
  { x: 0, y: FOOT_DOTS_H, reach: 90 }, // the lower left corner, under the offer
  { x: 322, y: FOOT_DOTS_H, reach: 86 }, // the foot of the gap between the offer and the code
];
const FOOT_DOTS = (() => {
  const dots = [];
  for (let y = FOOT_DOTS_PITCH / 2; y < FOOT_DOTS_H; y += FOOT_DOTS_PITCH) {
    for (let x = FOOT_DOTS_PITCH / 2; x < FOOT_DOTS_W; x += FOOT_DOTS_PITCH) {
      const r = Math.max(...FOOT_PATCHES.map((p) => FOOT_DOTS_R_MAX * Math.max(0, 1 - Math.hypot(p.x - x, p.y - y) / p.reach) ** 1.3));
      if (r >= FOOT_DOTS_R_MIN) dots.push(`<circle cx="${x}" cy="${y}" r="${r.toFixed(2)}"/>`);
    }
  }
  return `<svg class="fb-foot-dots" viewBox="0 0 ${FOOT_DOTS_W} ${FOOT_DOTS_H}" fill="currentColor" aria-hidden="true">${dots.join("")}</svg>`;
})();

/** Front B's torn edge (§ 13): the band's lower edge, drawn over the photo's top, a fixed path so every build is the same. */
const TORN_EDGE =
  "M0 0H510V7L497 11L486 6L471 12L458 8L441 13L430 7L414 12L399 9L386 14L370 8L357 12L341 7L327 13L311 9L296 14L283 8" +
  "L268 12L252 6L238 13L223 9L207 14L194 8L179 12L163 7L150 13L134 9L119 14L106 8L91 12L75 7L62 13L46 9L31 14L18 8L0 12Z";
/** The same edge mirrored top to bottom (the foot's upper edge), by its numbers: print.css may turn nothing (Q2). */
const TORN_EDGE_UP = TORN_EDGE.replace("M0 0H510V7", "M0 18H510V11").replace(/L(\d+) (\d+)/g, (_, x, y) => `L${x} ${18 - Number(y)}`);

/**
 * The printed flyer's back (SPEC-print-pieces.md § 12 item 3), print-only: three square photos across the top; the
 * words, the heading at the headline's size, the first paragraph (the lede) at the tagline's, then each paragraph, its
 * lead-in apart; and the bottom row, the address at the left and the logo at the right. Each word is cited by its line in
 * the words file (`words.source`), which no legend lists: the back is on no mock-up's sheet.
 */
function flyerBack(c, parts, { positions, words }) {
  const cite = (line) => `data-src="${esc(`${words.source}#L${line}`)}"`;
  const paragraph = (p, cls) => `<p class="${cls}" ${cite(p.line)}>${p.lead === null ? "" : `<b class="flyer-back-lead">${esc(p.lead)}</b> `}${esc(p.text)}</p>`;
  // § 14 item 3: a bar (each icon over its label) and steps (columns in order: the icon, the title, the detail)
  const bar = (p) =>
    `<div class="fbk-bar" ${cite(p.line)}><b class="flyer-back-lead">${esc(p.lead)}</b><ul>${p.items.map((it) => `<li ${cite(it.line)}>${icon(it.icon, "fbk-icon")}<span>${esc(it.label)}</span></li>`).join("")}</ul></div>`;
  const steps = (p) =>
    `<div class="fbk-steps" ${cite(p.line)}><b class="flyer-back-lead">${esc(p.lead)}</b><ol>${p.items.map((it) => `<li ${cite(it.line)}><span class="fbk-mark">${icon(it.icon, "fbk-icon")}</span><b class="fbk-title">${esc(it.title)}</b><span class="fbk-detail">${esc(it.detail)}</span></li>`).join("")}</ol></div>`;
  // § 15 items 3–4: plans (cards in a row, each its plan's colour as a top bar, its name, its line), and a statement (a
  // lead-in standing alone, centred as a block's)
  const plans = (p) =>
    `<div class="fbk-plans" ${cite(p.line)}><b class="flyer-back-lead">${esc(p.lead)}</b><ul>${p.items.map((it) => `<li data-accent="${esc(it.plan)}" ${cite(it.line)}><b class="fbk-plan-name">${esc(it.name)}</b><span class="fbk-plan-line">${esc(it.text)}</span></li>`).join("")}</ul></div>`;
  // § 15 item 8: a statement set as the front's banner, a level ink ribbon
  const statement = (p) => `<p class="fbk-statement" ${cite(p.line)}><span>${esc(p.lead)}</span></p>`;
  const BLOCKS = { bar, steps, plans, statement };
  const block = (p) => (BLOCKS[p.kind] ?? ((q) => paragraph(q, "flyer-back-para")))(p);
  // § 15 item 8: the lede only when the first paragraph is words
  const [first, ...others] = words.paragraphs;
  const lede = first.kind === "text" ? paragraph(first, "tagline flyer-back-lede") : null;
  const rest = lede === null ? words.paragraphs : others;
  return `
<div class="flyer-back-photos">${positions.map((position) => parts.photo(position)).join("")}${positions.map((position, i) => parts.caption(position, `flyer-back-name flyer-back-name-${i + 1}`)).join("")}</div>
<div class="flyer-back-body">
  <div class="flyer-back-words">
  <h1 class="headline" ${cite(words.heading.line)}>${esc(words.heading.text)}</h1>
  ${[...(lede === null ? [] : [lede]), ...rest.map(block)].join("\n  ")}
  </div>
  <div class="flyer-back-foot">${parts.text("p", "address", c.address, "web address")}${parts.logo("flyer-back-logo")}</div>
</div>`;
}

export function flyer(inputs) {
  const c = campaign(inputs);
  const parts = makeParts(inputs);
  return sheet(piece("flyer"), inputs, parts, flyerFace(c, parts));
}

/** The banner, top to bottom: the brand, the offer at eye level, a large QR code within reach, the photo. */
export function banner(inputs) {
  const c = campaign(inputs);
  const parts = makeParts(inputs);
  return sheet(piece("banner"), inputs, parts, `
<div class="banner-top">${parts.logo()}${parts.text("p", "tagline", c.tagline, "tagline")}</div>
<div class="banner-offer">${parts.text("h1", "headline", c.headline, "headline")}${parts.text("p", "offer", c.offer, "the offer")}</div>
<div class="banner-scan">${parts.qr(c)}${parts.text("p", "scan-prompt", c.scan, "scan prompt")}${parts.text("p", "address", c.address, "web address")}</div>
<div class="banner-photo">${parts.photo("banner")}</div>
${parts.planNames(c.plans, "plan names")}
${parts.line("p", "event-bar", c.eventLine, "event line")}`);
}

/** Photo slides: each slide's own photo position, and the plan whose line it shows (Lean, Signature, Performance, Family). */
const PHOTO_SLIDES = [
  { position: "slide-1", plan: 0 },
  { position: "slide-2", plan: 1 },
  { position: "slide-3", plan: 2 },
  { position: "slide-4", plan: 3 },
];

/** The slideshow: a photo slide per plan with the plan's own line, then the offer and the QR code. */
export function slideshow(inputs) {
  const c = campaign(inputs);
  const parts = makeParts(inputs);
  const count = PHOTO_SLIDES.length + 1;
  const photoSlides = PHOTO_SLIDES.map(({ position, plan }, i) => {
    const p = c.plans[plan];
    return `<section class="slide slide-photo" data-accent="${esc(p.id)}" aria-roledescription="slide" aria-label="${i + 1} / ${count}"${i ? " hidden" : ""}>
${parts.photo(position, "slide-bg")}
<div class="slide-logo">${parts.logo()}</div>
<div class="slide-panel">${parts.text("p", "slide-kicker", p.name, "plan names")}${parts.text("p", "slide-line", p.promise, "plan lines")}</div>
</section>`;
  });
  const closing = `<section class="slide slide-close" aria-roledescription="slide" aria-label="${count} / ${count}" hidden>
<div class="close-text">
${parts.logo("close-logo")}
${parts.text("h1", "headline", c.headline, "headline")}
${parts.text("p", "subhead", c.subhead, "subhead")}
${parts.text("p", "offer", c.offer, "the offer")}
</div>
<div class="close-scan">${parts.qr(c)}${parts.text("p", "scan-prompt", c.scan, "scan prompt")}${parts.text("p", "address", c.address, "web address")}</div>
${parts.line("p", "event-bar", c.eventLine, "event line")}
</section>`;
  const p = piece("slideshow");
  return `${head(p.title, inputs)}
<body class="show">
<main class="deck" aria-roledescription="slideshow">
${[...photoSlides, closing].join("\n")}
</main>
<aside class="legend-float" id="legend" data-annotation>
<p class="caption"><b>${esc(p.title)}</b> · ${esc(p.size)} · a mock-up for a screen share</p>
${parts.legend()}
</aside>
<button type="button" class="legend-toggle" data-annotation aria-controls="legend">Legend (L)</button>
<script>
${inputs.scripts.slideshow.trim()}
</script>
</body>
</html>
`;
}

export function renderMockups(inputs) {
  return {
    "tent-card": tentCard(inputs),
    flyer: flyer(inputs),
    banner: banner(inputs),
    slideshow: slideshow(inputs),
  };
}

/** dist-mockups/index.html: the four pieces, for whoever opens the folder. */
export function indexPage(inputs, { pngs = true } = {}) {
  const rows = PIECES.map((p) => {
    const png = pngs && p.png ? ` · <a href="${p.png}">PNG</a>` : "";
    return `<li><a href="${p.file}"><b>${esc(p.title)}</b></a> · ${esc(p.size)}${png}</li>`;
  });
  return `${head("The four mock-ups", inputs)}
<body class="sheet index" data-annotation>
<main class="index-main">
<p class="caption"><b>Fit AF · Boston · the four mock-ups</b> — for a screen share, not for print. Built by <code>npm run build:mockups</code> from <code>data/</code>, <code>src/</code> and <code>mockups/photos.json</code>.</p>
<ul class="index-list">${rows.join("")}</ul>
</main>
</body>
</html>
`;
}
