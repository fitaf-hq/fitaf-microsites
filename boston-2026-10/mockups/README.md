# mockups/ — four marketing mock-ups for the Boston trip

**Mock-ups for a SCREEN SHARE at an Owner meeting. Nothing here is printed and nothing is print-ready.**
A tabletop tent card, a quarter-page flyer, a retractable banner and a slideshow, built to carry two
messages:

1. **One integrated effort** (POEMS: People, Objects, Environments, Messages, Services). The four pieces
   and the microsite share one visual language (the page's own colour tokens, fonts, logo, navy bar,
   orange rule, plan colours), **one offer** and **one QR code**.
2. **All of it is downstream of the knowledge base.** Every phrase, price, plan and colour on a piece
   comes from the same files the microsite is built from, so a change in one place changes every piece.
   Each piece carries a small legend, **"Where each part comes from"**, in plain labels for the Owner
   ("Words: the shared message list", "Offer: the offer list", …). The file names stay behind a switch
   ("Show file names", or the **N** key). On the HTML, pointing at a legend row outlines the parts that
   come from that source.

## Build

```sh
npm --prefix boston-2026-10 run build:mockups              # HTML + PNGs -> dist-mockups/ (git-ignored)
npm --prefix boston-2026-10 run build:mockups -- --no-png  # HTML only, no Chrome
npm --prefix boston-2026-10 run build:mockups -- --on 2026-10-20 --event demo
```

`dist-mockups/`: `tent-card.html` + `.png`, `flyer.html` + `.png`, `banner.html` + `.png`,
`slideshow.html`, `index.html`, and the files they load (`fonts/`, `assets/`, `qr/`, `photos/`). The
folder is wholly this build's output and starts empty on every run. **Never hand-edit it.**

- **The PNGs are rendered by headless Chrome** (`--screenshot`, a throwaway profile, background
  networking off) at 2× from each piece's sheet. `CHROME=<path>` names another Chrome binary.
  ⚠ Chrome 154 on macOS writes the screenshot and then does not exit, so `png.mjs` waits for a complete
  PNG, stops Chrome's process group and checks the PNG's size (see its header comment).
- **The slideshow**: → ↓ PageDown or space forward, ← ↑ PageUp back, Home and End, and the ends wrap; a
  click goes forward, a click on the left quarter goes back; `#3` in the URL opens slide 3. **L** shows or
  hides the legend (open by default on a wide screen, closed on a phone), **N** shows the file names behind
  its plain labels, **F** asks for full screen. **On a screen (landscape) a photo slide's navy panel is the
  right 40%, full height, and the photo fills the left 60%; on a phone (portrait) the panel is a band along
  the bottom** (`SPEC-photo-slots.md` § 2a, the Advisor's ruling of 2026-09-30).
- **The legend's words** are data too: [`legend.json`](legend.json) holds its title, its note ("Change one
  of these, and every piece that uses it changes."), the switch's label and a plain label per source
  (`what: from`), as the Advisor set them on 2026-09-29. It must name every source and no other (the build
  refuses it otherwise). The PNGs show the plain labels; the switch starts off.
- **The offer** is chosen by the Worker's own rule, `offerForSave` (`src/worker/offers.js`): the live event
  offer, else the current general one, on `--on` (default today in the send time zone of
  `data/save.json`). ⛔ Every offer is still a placeholder (`[The offer]`): the Owner has not named it.
  Before 2026-10-01 the general placeholder is chosen, from then the Boston event placeholder; both read
  `[The offer]` today, and will differ once the Owner names them.
- **The QR code** is the one `build.mjs` writes (`writeQrCodes`), for the first event in
  `data/events.json` unless `--event` names another. There is no second QR generator (test P4).

## ⛔ Photographs — never committed

This repository is PUBLIC and a photograph's usage rights are the Owner's. Photos live in
**`mockups/photos/`, which git ignores**, and are named by the committed manifest
[`photos.json`](photos.json) (position → file name). A position whose file is not in the folder shows a
labelled placeholder ("Photo to come", the position and the file it waits for).

- **To preview with real photos**: copy a photo into `mockups/photos/` under its position's file name (e.g.
  `tent-large.jpg`) and rebuild. Nothing else changes: `photos.json` keeps each position's own file name and
  is never set to a photo's own name or ID (test P3-7 reads it from git). To repeat a photo, copy it under
  each position's file name.
- ⚠ **The PNGs and `dist-mockups/photos/` then carry the photographs.** Both are git-ignored; do not attach
  or publish them without the Owner's say.
- **Each position is one place in one piece** ([`SPEC-mockup-photos.md`](../SPEC-mockup-photos.md) § 1), so a
  photo shows only where it is put: changing a position's photo changes that one place. Every photo fills
  its window (`object-fit: cover`, centred), so a photo of another shape is cropped to it. The **shape** is
  the window's width divided by its height, measured in headless Chrome at 1920 × 1080 with the legend
  shut (2026-09-30):

| position | piece | where, highest in the piece's hierarchy first | shape |
|---|---|---|---|
| `banner` | banner | the photo, below the offer and the QR | 1.58 |
| `flyer` | flyer | the hero, across the top | 2.20 |
| `tent-large` | tent card | the large photo, left, two rows tall | 1.21 |
| `tent-top` | tent card | the small tile, top right | 1.23 |
| `tent-bottom` | tent card | the small tile, bottom right | 1.23 |
| `slide-1` | slideshow | slide 1 (Lean's line) | 1.07 on a screen, 0.46 on a phone |
| `slide-2` | slideshow | slide 2 (Signature's line) | 1.07 on a screen, 0.46 on a phone |
| `slide-3` | slideshow | slide 3 (Performance's line) | 1.07 on a screen, 0.46 on a phone |
| `slide-4` | slideshow | slide 4 (Family's line) | 1.07 on a screen, 0.46 on a phone |

## Where each part comes from

| part | from |
|---|---|
| headline, subhead, tagline, event line | `data/messages.json`: **the same values the page shows** (its h1, intro line, meta description and top bar) |
| scan prompt, the "from $… a meal" line | `data/messages.json` (the mock-ups' own phrases) |
| the offer | `data/offers.json`, chosen by `offerForSave` |
| plan names, plan lines (promises), the lowest price per meal | `data/plans.json`; the price is the lowest of the cells the page shows (`shown_counts`) |
| the QR code, the web address | `data/events.json` (the QR file written by `build.mjs`) |
| photos | `mockups/photos.json` → `mockups/photos/` |
| logo | `src/assets/fitaf-logo.png` (the page's, copied by `build.mjs` `copyStatic`) |
| colours and fonts | `src/template.html`: its `:root` block and `@font-face` rules, copied into each piece at build time |

Every text element carries `data-src`, a JSON pointer into its file (`data/plans.json#/individual/0/name`),
and the legend is built from those same records. The separators (`·`) are drawn by the stylesheet, so
**no word on a piece is typed in the renderer**: test P2 replaces every cited data string with a marker
that has no letters and finds no letter left. The legend, the sheet's caption and the photo placeholders'
labels are *annotations* (`data-annotation`): they describe a mock-up and are not part of it.

## Sizes

Each static piece is laid out at a fixed size in CSS pixels that keeps the real piece's proportions:
the tent card's face (4 × 6 in) and the flyer (4.25 × 5.5 in) at 120 px per inch; the banner (33 × 80 in)
at 12.125 px per inch (400 × 970) so it fits a screen. The sheet scales the piece to the window. On the
banner, at full size, the QR code spans 36–54 in above the floor (a phone's reach) and the offer 56–61 in
(eye level), with the photo below them (measured 2026-09-29 from the rendered layout).

## Colour and contrast

`mockups.css` uses the template's tokens only (`var(--…)`): no raw colour, no token of its own, and
nothing translucent. **Text over a photo region sits on a solid panel** (the slides' navy panel, the white
logo plate), never on the photo. Every pair the pieces draw is in `src/contrast-pairs.json` with
`"build": "mockups"`, and `npm run contrast` reads this stylesheet too (its raw-colour refusal covers it).
The QR code's own navy-on-white comes from `build.mjs`, not from CSS.

## Tests (`test/p*.test.mjs`, no network, no Chrome)

| | case |
|---|---|
| P1 | git tracks no image but the store's logo and the flow diagrams (each named by its flow block, never by folder); `mockups/photos/` and `dist-mockups/` are ignored (with controls) |
| P2 | every text run sits in an element citing `data/` by JSON pointer; the letterless-marker render; one changed value (offer, headline, scan prompt, event URL) shows on all four; one changed phrase in `data/messages.json` changes the page and all four; a changed price reaches the flyer; no CSS `content` or script writes a word |
| P3 | the manifest names the nine positions, plain file names (a path or another extension is refused); each position is on exactly one element, in the piece and place `SPEC-mockup-photos.md` § 1 gives it, and a position the manifest lacks is refused; placeholders naming the position and its file without photos, each file with them; one position's changed file changes exactly one element, every other photo byte-for-byte as before; two positions naming one file both show it, copied once; the manifest in git names each position's own `<position>.jpg`, status placeholder |
| P4 | the QR files are byte-identical to `writeQrCodes`', decode to the event URL, one per piece; no QR generator here |
| P5 | the legend: a plain label per source from `legend.json` (and a changed one reaches all four), file names only behind the switch, hidden by default, a label missing is refused; the `:root` tokens and font faces are the shipped page's; a token changed in the template reaches all four; the stylesheet is well formed; every file a piece loads is written; no raw colour or translucency; no text inside a photo; the legend lists exactly the cited files |
| P6 | 3–5 photo slides, each with one plan line, then the closing slide with the offer and the QR; keys, clicks, the fragment, the legend and N, run in a `vm` over a stand-in DOM |
