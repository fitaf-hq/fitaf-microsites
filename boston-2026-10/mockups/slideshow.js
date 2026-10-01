// The slideshow's controls. → ↓ PageDown and space go forward, ← ↑ PageUp back, Home and End to the ends,
// and the ends wrap. A click goes forward, a click on the left quarter goes back. The slide number is in
// the URL fragment (#3), so a reload stays put. L shows or hides the legend; N (or the legend's switch) shows
// the file names behind its plain labels; F asks for full screen.
// It plays itself (SPEC-slideshow.md § 1 item 3): each slide for SLIDE_MS, dissolving into the next over FADE_MS (the
// stylesheet's --fade, set from here), wrapping; a key or click that moves the slide restarts the count. Under
// prefers-reduced-motion the stylesheet drops the fade; the slides still advance.
// It only shows and hides slides; it writes no text (test P2).
(() => {
  // ⭐ The two durations, here and nowhere else (the Advisor: "assume that we'll end up tweaking that").
  const SLIDE_MS = 7000;
  const FADE_MS = 500;
  const slides = [...document.querySelectorAll(".slide")];
  const NEXT = ["ArrowRight", "ArrowDown", "PageDown", " "];
  const PREV = ["ArrowLeft", "ArrowUp", "PageUp"];
  const BACK_ZONE = 0.25;
  const WIDE_PX = 700;
  let index = 0;
  let timer = null;
  document.documentElement.style.setProperty("--fade", `${FADE_MS}ms`);
  document.body.classList.add("playing");

  const wrap = (i) => (i + slides.length) % slides.length;
  function fromHash() {
    const n = Number.parseInt(String(location.hash).slice(1), 10);
    return Number.isInteger(n) ? Math.min(Math.max(n, 1), slides.length) - 1 : 0;
  }
  // A slide is shown by its `on` class (the stylesheet fades it in, and the one leaving out); `hidden` is the markup's
  // state without JavaScript only. Every show restarts the count to the next.
  function show(i) {
    index = i;
    slides.forEach((slide, k) => {
      slide.hidden = false;
      slide.classList.toggle("on", k === i);
    });
    history.replaceState(null, "", `#${i + 1}`);
    clearTimeout(timer);
    timer = setTimeout(() => show(wrap(index + 1)), SLIDE_MS);
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
