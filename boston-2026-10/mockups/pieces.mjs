// The four mock-ups: a tabletop tent card, a quarter-page flyer, a retractable banner and a slideshow.
// Mock-ups for a screen share: nothing here is print-ready. Each is laid out at a fixed size in CSS pixels
// that keeps the real piece's proportions; the sheet scales it to the window.
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
export function flyerFace(c, parts, { short = false, header = true, logo, side = "front", back } = {}) {
  if (side === "back") return flyerBack(c, parts, back);
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
 * The printed flyer's back (SPEC-print-pieces.md § 12 item 3), print-only: three square photos across the top; the
 * words, the heading at the headline's size, the first paragraph (the lede) at the tagline's, then each paragraph, its
 * lead-in apart; and the bottom row, the address at the left and the logo at the right. Each word is cited by its line in
 * the words file (`words.source`), which no legend lists: the back is on no mock-up's sheet.
 */
function flyerBack(c, parts, { positions, words }) {
  const cite = (line) => `data-src="${esc(`${words.source}#L${line}`)}"`;
  const paragraph = (p, cls) => `<p class="${cls}" ${cite(p.line)}>${p.lead === null ? "" : `<b class="flyer-back-lead">${esc(p.lead)}</b> `}${esc(p.text)}</p>`;
  const [lede, ...rest] = words.paragraphs;
  return `
<div class="flyer-back-photos">${positions.map((position) => parts.photo(position)).join("")}</div>
<div class="flyer-back-body">
  <div class="flyer-back-words">
  <h1 class="headline" ${cite(words.heading.line)}>${esc(words.heading.text)}</h1>
  ${[paragraph(lede, "tagline flyer-back-lede"), ...rest.map((p) => paragraph(p, "flyer-back-para"))].join("\n  ")}
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
