// The printed pieces' measuring pass (print/build-print.mjs), run in headless Chrome over a COPY of a print page, never
// the page printed. Once the fonts are in, it records, in inches from the page's top-left corner: the page, and for each
// face (a .print-face's .board, its trim) every photo window ([data-slot]), every run of text outside an annotation (its
// glyphs' box, from a Range, its type's size in layout px and its lines), every QR code, every logo, every painted field
// (a photo, or an element whose background is not the page's own), and the blocks a layout is judged by (the rule, the
// headline, the offer, the scan block, and the body with its content box, SPEC-print-pieces.md §§ 9–10; the flyer's
// back's photos, words, bottom row and body, § 12). A page of several sheets (the flyer's front and back, § 12) is
// measured a sheet at a time, each as `sheets[i]`; `page` and `faces` are the first's. It writes them as JSON into a
// script element, which `--dump-dom` returns. It writes no text.
(() => {
  const CSS_PX_PER_INCH = 96;
  const inches = (r) => ({ x: r.left / CSS_PX_PER_INCH, y: r.top / CSS_PX_PER_INCH, w: r.width / CSS_PX_PER_INCH, h: r.height / CSS_PX_PER_INCH });
  const unpainted = (colour, pageColour) => colour === pageColour || /^rgba\(.*,\s*0\)$/.test(colour) || colour === "transparent";
  const annotation = (el) => el.closest("[data-annotation]") !== null;
  const nameOf = (el) => (el.dataset.slot ? `the photo ${el.dataset.slot}` : `the ${el.tagName.toLowerCase()} .${[...el.classList].join(".")}`);
  /** How many lines a range's text is set on: its line boxes' distinct tops (a run split by a tag shares its lines). */
  const linesOf = (range) => new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size;
  /** The layout px of an element's type: its computed font size (the page is drawn scaled, not zoomed, so this is the layout's). */
  const sizeOf = (el) => parseFloat(getComputedStyle(el).fontSize);

  function face(board, pageColour) {
    const texts = [];
    // § 17.4: the lines the fine print is set on, across its runs (a bold run and its neighbours share a line)
    const fineTops = new Set();
    const walker = document.createTreeWalker(board, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.data.trim() || annotation(node.parentElement)) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      // § 17.4: a run of the fine print ([data-fine]) is marked, for its own floor
      const fine = node.parentElement.closest("[data-fine]") !== null;
      if (fine) for (const r of range.getClientRects()) if (r.width > 0) fineTops.add(Math.round(r.top));
      // its weight too, for the fine print's (§ 17.4 item 3: the body face's regular)
      const weight = Number(getComputedStyle(node.parentElement).fontWeight);
      texts.push({ text: node.data.trim(), ...inches(range.getBoundingClientRect()), size: sizeOf(node.parentElement), lines: linesOf(range), weight, ...(fine ? { fine } : {}) });
    }
    const fields = [...board.querySelectorAll("*")]
      .filter((el) => !annotation(el))
      .filter((el) => {
        if (el.dataset.slot) return true;
        const style = getComputedStyle(el);
        return !unpainted(style.backgroundColor, pageColour) || style.backgroundImage !== "none";
      })
      .map((el) => ({ what: nameOf(el), ...inches(el.getBoundingClientRect()) }));
    // The content box, as drawn: the computed padding and borders are in layout pixels and the page is drawn scaled
    // (pages.mjs sizeRules), so they are scaled by the element's drawn width over its layout width. On a face turned
    // 180° (the tent's upper) each side is drawn opposite its own: its top padding at the bottom, its left at the right
    const contentOf = (el) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      const drawn = r.width / el.offsetWidth;
      const side = (k) => (parseFloat(st[`padding${k}`]) + parseFloat(st[`border${k}Width`])) * drawn;
      const [l, t, rt, b] = el.closest(".print-face-turned") ? ["Right", "Bottom", "Left", "Top"] : ["Left", "Top", "Right", "Bottom"];
      const left = r.left + side(l);
      const top = r.top + side(t);
      return inches({ left, top, width: r.right - side(rt) - left, height: r.bottom - side(b) - top });
    };
    const linesIn = (el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return linesOf(range);
    };
    const blocks = [...board.querySelectorAll(".rule, .headline, .offer, .scan, .flyer-body, .tent-body, .flyer-back-photos, .flyer-back-words, .flyer-back-foot, .flyer-back-body")]
      .filter((el) => !annotation(el))
      .map((el) => ({ what: [...el.classList].join("."), ...inches(el.getBoundingClientRect()), content: contentOf(el), lines: linesIn(el) }));
    // § 17: each box whose words must not overflow it ([data-fit]): its content box, as drawn, and the box its words fill:
    // across, their glyphs (every run of text inside it, from a Range); down, their lines, the box of each run's nearest
    // block (a glyph's box is its font's whole height, which overhangs a tight line, so it would read a set line as over).
    // A run whose block is the fit box itself (a headline line) is measured across alone. And the entry card's writing lines
    const blockOf = (node, el) => {
      let block = node.parentElement;
      while (block !== el && getComputedStyle(block).display.startsWith("inline")) block = block.parentElement;
      return block;
    };
    const wordsBox = (el) => {
      const across = [];
      const down = [];
      const inside = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node = inside.nextNode(); node; node = inside.nextNode()) {
        if (!node.data.trim() || annotation(node.parentElement)) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        across.push(inches(range.getBoundingClientRect()));
        const block = blockOf(node, el);
        if (block !== el) down.push(inches(block.getBoundingClientRect()));
      }
      if (!across.length) return null;
      const x = Math.min(...across.map((r) => r.x));
      const y = down.length ? Math.min(...down.map((r) => r.y)) : null;
      return { x, w: Math.max(...across.map((r) => r.x + r.w)) - x, y, h: y === null ? null : Math.max(...down.map((r) => r.y + r.h)) - y };
    };
    const fits = [...board.querySelectorAll("[data-fit]")].map((el) => ({ what: el.dataset.fit, content: contentOf(el), words: wordsBox(el) }));
    // each field's writing lines (the email's are several on one line, § 17.2 item 2), and each field's first, whose pitch is checked
    const entryFields = [...board.querySelectorAll(".entry-field")].map((el) => ({ lines: [...el.querySelectorAll(".entry-line")].map((line) => inches(line.getBoundingClientRect())) }));
    const lines = entryFields.filter((field) => field.lines.length).map((field) => field.lines[0]);
    return {
      fineLines: fineTops.size,
      fits,
      entryFields,
      lines,
      trim: inches(board.getBoundingClientRect()),
      photos: [...board.querySelectorAll("[data-slot]")].map((el) => ({ slot: el.dataset.slot, ...inches(el.getBoundingClientRect()) })),
      texts,
      qrs: [...board.querySelectorAll("img.qr")].map((el) => inches(el.getBoundingClientRect())),
      logos: [...board.querySelectorAll("img.logo")].map((el) => inches(el.getBoundingClientRect())),
      blocks,
      fields,
    };
  }

  function sheet(el) {
    const page = el.querySelector(".print-page");
    const pageColour = getComputedStyle(page).backgroundColor;
    // § 17.2 item 1: a letter sheet's cut guides, drawn on the page between its cells
    const guides = [...el.querySelectorAll(".letter-guide")].map((guide) => inches(guide.getBoundingClientRect()));
    return { page: inches(page.getBoundingClientRect()), faces: [...el.querySelectorAll(".print-face > .board")].map((board) => face(board, pageColour)), guides };
  }

  function measure() {
    const sheets = [...document.querySelectorAll(".print-sheet")].map(sheet);
    const out = { ...sheets[0], sheets };
    const json = document.createElement("script");
    json.type = "application/json";
    json.id = "print-measure";
    json.textContent = JSON.stringify(out);
    document.body.append(json);
  }

  document.fonts.ready.then(measure);
})();
