// The printed pieces' measuring pass (print/build-print.mjs), run in headless Chrome over a COPY of a print page, never
// the page printed. Once the fonts are in, it records, in inches from the page's top-left corner: the page, and for each
// face (a .print-face's .board, its trim) every photo window ([data-slot]), every run of text outside an annotation (its
// glyphs' box, from a Range), every QR code, every logo, every painted field (a photo, or an element whose background is
// not the page's own), and the blocks a layout is judged by (the offer, the scan block, and the body with its content box,
// SPEC-print-pieces.md § 9). It writes them as JSON into a script element, which `--dump-dom` returns. It writes no text.
(() => {
  const CSS_PX_PER_INCH = 96;
  const page = document.querySelector(".print-page");
  const inches = (r) => ({ x: r.left / CSS_PX_PER_INCH, y: r.top / CSS_PX_PER_INCH, w: r.width / CSS_PX_PER_INCH, h: r.height / CSS_PX_PER_INCH });
  const unpainted = (colour, pageColour) => colour === pageColour || /^rgba\(.*,\s*0\)$/.test(colour) || colour === "transparent";
  const annotation = (el) => el.closest("[data-annotation]") !== null;
  const nameOf = (el) => (el.dataset.slot ? `the photo ${el.dataset.slot}` : `the ${el.tagName.toLowerCase()} .${[...el.classList].join(".")}`);

  function face(board) {
    const pageColour = getComputedStyle(page).backgroundColor;
    const texts = [];
    const walker = document.createTreeWalker(board, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.data.trim() || annotation(node.parentElement)) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      texts.push({ text: node.data.trim(), ...inches(range.getBoundingClientRect()) });
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
    // (pages.mjs sizeRules), so they are scaled by the element's drawn width over its layout width
    const contentOf = (el) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      const drawn = r.width / el.offsetWidth;
      const side = (k) => (parseFloat(st[`padding${k}`]) + parseFloat(st[`border${k}Width`])) * drawn;
      const left = r.left + side("Left");
      const top = r.top + side("Top");
      return inches({ left, top, width: r.right - side("Right") - left, height: r.bottom - side("Bottom") - top });
    };
    const blocks = [...board.querySelectorAll(".offer, .scan, .flyer-body, .tent-body")]
      .filter((el) => !annotation(el))
      .map((el) => ({ what: [...el.classList].join("."), ...inches(el.getBoundingClientRect()), content: contentOf(el) }));
    return {
      trim: inches(board.getBoundingClientRect()),
      photos: [...board.querySelectorAll("[data-slot]")].map((el) => ({ slot: el.dataset.slot, ...inches(el.getBoundingClientRect()) })),
      texts,
      qrs: [...board.querySelectorAll("img.qr")].map((el) => inches(el.getBoundingClientRect())),
      logos: [...board.querySelectorAll("img.logo")].map((el) => inches(el.getBoundingClientRect())),
      blocks,
      fields,
    };
  }

  function measure() {
    const out = { page: inches(page.getBoundingClientRect()), faces: [...document.querySelectorAll(".print-face > .board")].map(face) };
    const json = document.createElement("script");
    json.type = "application/json";
    json.id = "print-measure";
    json.textContent = JSON.stringify(out);
    document.body.append(json);
  }

  document.fonts.ready.then(measure);
})();
