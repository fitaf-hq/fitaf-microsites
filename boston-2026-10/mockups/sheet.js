// A static mock-up's sheet. Scales the piece to fit the window (it keeps its proportions; beside the legend
// when there is room, above it when there is not), and while the pointer is on a legend row outlines the
// parts that come from that row's file. It writes no text (test P2).
(() => {
  const board = document.querySelector(".board");
  const aside = document.querySelector(".aside");
  const GUTTER_PX = 24;
  const MIN_BESIDE = 0.5;
  const MIN_ZOOM = 0.2;

  function fit() {
    const w = Number(board.dataset.w);
    const h = Number(board.dataset.h);
    const beside = Math.min(1, (innerHeight - 2 * GUTTER_PX) / h, (innerWidth - 3 * GUTTER_PX - aside.offsetWidth) / w);
    const stacked = beside < MIN_BESIDE;
    document.body.classList.toggle("stacked", stacked);
    const zoom = stacked ? Math.min(1, (innerWidth - 2 * GUTTER_PX) / w) : beside;
    board.style.zoom = String(Math.max(zoom, MIN_ZOOM));
  }

  const partsFrom = (file) =>
    [...board.querySelectorAll("[data-src]")].filter((el) => el.dataset.src.split(" ").some((s) => s.split("#")[0] === file));
  for (const row of document.querySelectorAll(".legend [data-file]")) {
    const mark = (on) => partsFrom(row.dataset.file).forEach((el) => el.classList.toggle("hl", on));
    row.addEventListener("mouseenter", () => mark(true));
    row.addEventListener("mouseleave", () => mark(false));
  }

  addEventListener("resize", fit);
  fit();
})();
