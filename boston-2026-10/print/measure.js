// The printed pieces' measuring pass (print/build-print.mjs), run in headless Chrome over a COPY of a print page, never
// the page printed. Once the fonts are in, it records, in inches from the page's top-left corner: the page, and for each
// face (a .print-face's .board, its trim) every photo window ([data-slot]), every run of text outside an annotation (its
// glyphs' box, from a Range), every QR code, and every painted field (a photo, or an element whose background is not the
// page's own). It writes them as JSON into a script element, which `--dump-dom` returns. It writes no text on the page.
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
    return {
      trim: inches(board.getBoundingClientRect()),
      photos: [...board.querySelectorAll("[data-slot]")].map((el) => ({ slot: el.dataset.slot, ...inches(el.getBoundingClientRect()) })),
      texts,
      qrs: [...board.querySelectorAll("img.qr")].map((el) => inches(el.getBoundingClientRect())),
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
