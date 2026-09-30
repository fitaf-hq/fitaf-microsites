// The deep-carting progress screen (SPEC-rung2-progress-and-checkout §§ 2, 10, 11, 12; § 14 moved it here): ONE element
// of ours, #fitaf-screen, over the whole viewport. ONE function, ONE source: scripts/build-storefront.mjs inlines its
// text (progressScreen.toString(), at the SCREEN slot of fitaf-handoff.js) into the Footer block and the console file, as
// it inlines the key function; tools/storybook's stories import this module. So the body below is what a visitor's
// browser runs: plain script (no module syntax inside it), no global but the language's own and the document it is
// given, no comment inside it (a comment there would ship), and no `<` at all (§ 11: the store's admin reads one as a
// tag; the build refuses it).
//
// progressScreen(d, words, tokens) makes the screen in document `d` (appended to its body, shown as a manual popover)
// and returns what fill B calls at its moments:
//   added(meal, card, k, t)  after press k of t: the meal's slide (made at its first press, from its own card: the name
//                            as the card's .product__content-title shows it, and the card's photo only if the page has
//                            already loaded it, its currentSrc reused, so nothing new is requested); the bar at k of
//                            t + 1; the step line (words.step, its {meal}, {n} and {total} filled);
//   last()                   after the press of CHECKOUT: the bar full, words.checkout;
//   remove()                 at done, at every stop (fill B's end()); and on its own at the 90 s clock.
// `words` is data/messages.json's handoff ({ title, step, checkout }) and `tokens` the page's own colours as custom
// properties ("--navy:#…;--cta:#…;--ice:#…;--white:#…"): both from the build's own readers, scripts/screen-inputs.mjs.
// A story drives it with no store at all: a stand-in card is any element holding an img and a .product__content-title.
//
// The screen, element by element (§ 11: built with createElement, no markup): #fitaf-screen[popover=manual] > style,
// div > (h2, div.b > i, div.c > one div per meal (the one shown marked `on`), p[role=status][aria-live=polite]).
// Its style: the screen fixed above everything; § 10 item 1's rule making the store's extras pop-up invisible (never
// removed) while the screen is up, which goes with the screen; its clocks are CSS animations, not timers: fitaf-e, 90 s
// on the screen itself, whose end removes it, `!important` so a page's reduced-motion reset cannot end it at once, and
// fitaf-t, 2.5 s, repeating on the carousel once every meal is added, each turn showing the next slide; with
// prefers-reduced-motion nothing inside the screen animates. It is a MANUAL popover, which no other popover closes (§ 12).
// As in fitaf-handoff.js, the function's body is not indented: it ships, and the Footer block has a ceiling (10,240).
export function progressScreen(d, words, tokens) {
var S = d.createElement("div"), NOW, SLIDES = {}, box, line;
var CSS = "#fitaf-screen{" + tokens + ";position:fixed;inset:0;width:auto;height:auto;margin:0;border:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;background:var(--navy);color:var(--white);font:16px/1.4 system-ui,sans-serif;text-align:center;animation:fitaf-e 90s!important}" +
"#fitaf-screen>div{width:100%;max-width:420px}#fitaf-screen h2{margin:0 0 16px;font-size:24px;font-weight:700;color:inherit}" +
"#fitaf-screen .b{height:8px;border-radius:4px;background:var(--ice);overflow:hidden}#fitaf-screen i{display:block;height:100%;width:0;background:var(--cta);transition:width .3s}" +
"#fitaf-screen .c{margin:24px 0 16px}#fitaf-screen .c>*{display:none}#fitaf-screen .c>.on{display:block;animation:fitaf-in .4s}#fitaf-screen .y{animation:fitaf-t 2.5s infinite}" +
"#fitaf-screen img{display:block;width:100%;height:min(220px,32vh);object-fit:cover;border-radius:6px}#fitaf-screen b{display:block;margin-top:10px;font-size:18px}#fitaf-screen p{margin:0;min-height:1.4em}" +
".cdk-overlay-pane:has(app-extra-products-dialog),.cdk-overlay-backdrop:has(+* app-extra-products-dialog){visibility:hidden!important}" +
"@keyframes fitaf-e{}@keyframes fitaf-t{}@keyframes fitaf-in{from{opacity:0;transform:translateX(24px)}}@media (prefers-reduced-motion:reduce){#fitaf-screen *{animation:none!important;transition:none!important}}";
function make(tag, parent, cls) { var e = d.createElement(tag); if (cls) e.className = cls; return parent.appendChild(e); }
function $(q) { return S.querySelector(q); }
function show(el) { if (NOW) NOW.className = ""; (NOW = el).className = "on"; }
S.id = "fitaf-screen";
S.setAttribute("popover", "manual");
make("style", S).textContent = CSS;
box = make("div", S);
make("h2", box).textContent = words.title;
make("i", make("div", box, "b"));
make("div", box, "c").onanimationiteration = function () { show(NOW.nextElementSibling || this.firstElementChild); };
line = make("p", box);
line.setAttribute("role", "status");
line.setAttribute("aria-live", "polite");
S.onanimationend = function (e) { if (e.target === S) S.remove(); };
d.body.appendChild(S);
if (S.showPopover) S.showPopover();
return {
  added: function (meal, c, k, t) {
    var el = SLIDES[meal], im = c.querySelector("img"), i;
    if (!el) {
      el = SLIDES[meal] = d.createElement("div");
      if (im && im.complete && im.naturalWidth) { i = el.appendChild(d.createElement("img")); i.alt = ""; i.src = im.currentSrc; }
      el.appendChild(d.createElement("b")).textContent = c.querySelector(".product__content-title").textContent.replace(/\s+/g, " ").trim();
      $(".c").appendChild(el);
    }
    show(el);
    $("i").style.width = k / (t + 1) * 100 + "%";
    $("p").textContent = words.step.replace("{meal}", el.lastChild.textContent).replace("{n}", k).replace("{total}", t);
    if (k === t) $(".c").className = "c y";
  },
  last: function () { $("i").style.width = "100%"; $("p").textContent = words.checkout; },
  remove: function () { S.remove(); }
};
}
