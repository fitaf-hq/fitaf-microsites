// The slideshow's controls. → ↓ PageDown and space go forward, ← ↑ PageUp back, Home and End to the ends,
// and the ends wrap. A click goes forward, a click on the left quarter goes back. The slide number is in
// the URL fragment (#3), so a reload stays put. L shows or hides the legend; N (or the legend's switch) shows
// the file names behind its plain labels; F asks for full screen.
// It only shows and hides slides; it writes no text (test P2).
(() => {
  const slides = [...document.querySelectorAll(".slide")];
  const dots = [...document.querySelectorAll(".dot")];
  const NEXT = ["ArrowRight", "ArrowDown", "PageDown", " "];
  const PREV = ["ArrowLeft", "ArrowUp", "PageUp"];
  const BACK_ZONE = 0.25;
  const WIDE_PX = 700;
  let index = 0;

  const wrap = (i) => (i + slides.length) % slides.length;
  function fromHash() {
    const n = Number.parseInt(String(location.hash).slice(1), 10);
    return Number.isInteger(n) ? Math.min(Math.max(n, 1), slides.length) - 1 : 0;
  }
  function show(i) {
    index = i;
    slides.forEach((slide, k) => {
      slide.hidden = k !== i;
    });
    dots.forEach((dot, k) => dot.classList.toggle("on", k === i));
    history.replaceState(null, "", `#${i + 1}`);
  }
  const toggleLegend = () => document.body.classList.toggle("legend-open");
  const filesBox = document.querySelector(".files-toggle input");
  function showFiles(on) {
    document.body.classList.toggle("show-files", on);
    filesBox.checked = on;
  }
  filesBox.addEventListener("change", () => showFiles(filesBox.checked));
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }

  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    let to = null;
    if (NEXT.includes(key)) to = wrap(index + 1);
    else if (PREV.includes(key)) to = wrap(index - 1);
    else if (key === "Home") to = 0;
    else if (key === "End") to = slides.length - 1;
    else if (key === "l") toggleLegend();
    else if (key === "n") showFiles(!document.body.classList.contains("show-files"));
    else if (key === "f") toggleFullscreen();
    else return;
    e.preventDefault();
    if (to !== null) show(to);
  });
  addEventListener("click", (e) => {
    if (e.target.closest(".legend-toggle")) return toggleLegend();
    if (e.target.closest(".legend-float")) return;
    show(wrap(index + (e.clientX < innerWidth * BACK_ZONE ? -1 : 1)));
  });
  addEventListener("hashchange", () => show(fromHash()));

  document.body.classList.toggle("legend-open", innerWidth >= WIDE_PX);
  show(fromHash());
})();
