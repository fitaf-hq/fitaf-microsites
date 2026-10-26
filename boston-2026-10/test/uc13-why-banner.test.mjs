// UC13 (SPEC-ui-and-copy-pass.md § 4 C, the Advisor 2026-10-26: "The "Why Fit AF?" button needs to look less like a
// transactional button and more of a … "actionable banner" or "non-intrusive ad-like unit" … It's also sitting awkwardly
// in the flow. For now, let's try putting it towards the bottom of the page (after checkout/save offer – and it should
// always be visible in the page flow, though it may scroll out of the viewport)."): on both builds that carry the page
// (D item 1), and on S20's (the production page with `production` false), whose template it is too:
//   its place (item 1): after the result card and *Not ready?*, before the foot (*See all plans* and the footnote), in
//   the page's flow, its no-script link in the same place; no longer above *Who is this for?*;
//   always shown (item 1): at the start, with no result, on both panels, with the result;
//   its look (item 2, ⬜ the orchestrator's reading, his to rule): a card the column's width, --ice, the hairline --line
//   border, the radius, at least 64 px tall, *Why Fit AF?* left-aligned in the heading type (Poppins 600, 17–19 px,
//   navy), a "→" at its right edge; hover darkens its border as the cards' do; never orange, not a pill; no raw colour
//   (UC10d's rule), and --navy on --ice a declared contrast pair;
//   the same button and dialog (item 2), the same words (item 3); it sends nothing new (D item 5).
// Drawn (its width, its height, the arrow's place, hover and the focus ring) in Chrome: tools/storybook/test/uc11-13-chrome.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { rawColours } from "../scripts/contrast.mjs";
import { hiddenInTree } from "./cc-harness.mjs";
import { openVisit } from "./a-harness.mjs";
import { CHECKOUT, NO_CART } from "./uc-harness.mjs";
import { browserParts, inOrder, inside, open, pages } from "./uc11-harness.mjs";

const { development, production, productionFalse } = await pages();
const PAGES = { development, production, "production (production false)": productionFalse };
/** Item 3: the words, unchanged. */
const WHY = "Why Fit AF?";
/** Item 2: the heading type's size, 17–19 px; the card at least 64 px tall. */
const SIZE_PX = { least: 17, most: 19 };
const TALL_PX = 64;

const words = (n) => n.textContent.replace(/\s+/g, " ").trim();
const cssOf = (page) => [...page.document.querySelectorAll("style")].map((s) => s.textContent).join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
/** The body of the rule whose selector is exactly `selector`. */
function rule(css, selector) {
  const found = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, sel]) => sel.trim() === selector).map(([, , body]) => body);
  assert.equal(found.length, 1, `one rule for ${selector} (found ${found.length})`);
  return found[0];
}

test("UC13: its place — after the result card and Not ready?, before the foot; no longer above the first question (C item 1)", () => {
  for (const [build, html] of Object.entries(PAGES)) {
    const page = open(html, CHECKOUT);
    const all = inOrder(page.document);
    const at = (node) => all.indexOf(node);
    const link = page.el("why-link");
    const foot = page.document.querySelector("footer.foot");
    assert.ok(at(link) > at(page.el("result")) && !inside(link, page.el("result")), `${build}: after the result card`);
    if (page.has("not-ready")) assert.ok(at(link) > at(page.el("not-ready")), `${build}: after Not ready?`);
    if (page.has("save-dialog")) assert.ok(at(link) > at(page.el("save-dialog")), `${build}: after the save step's dialog`);
    assert.ok(at(link) < at(foot), `${build}: before the foot`);
    assert.ok(at(link) > at(page.el("who")), `${build}: no longer above Who is this for?`);
    assert.ok(inside(link, page.document.querySelector("main.wrap")), `${build}: in the page's column (main.wrap)`);
    for (const id of ["panel-individual", "panel-family"]) assert.ok(!inside(link, page.el(id)), `${build}: in neither panel`);
    const after = all.slice(at(link) + 1).find((n) => !inside(n, link));
    assert.equal(after?.localName, "noscript", `${build}: its no-script link directly after it`);
    assert.match(after.innerHTML, /<a class="why-link" href="[^"]*why\/">Why Fit AF\?<\/a>/, `${build}: the no-script link to /why/`);
    const between = all.slice(at(link) + 1, at(foot)).filter((n) => !inside(n, after) && !inside(n, page.el("why")) && n.localName !== "dialog");
    assert.deepEqual(between.map((n) => n.id || n.localName), [], `${build}: nothing drawn between it and the foot`);
  }
});

test("UC13: always shown — at the start, with no result, on both panels, with the result (C item 1)", () => {
  for (const [build, html] of Object.entries(PAGES)) {
    for (const hash of ["", "#individual", "#family", "#family-or", "#lean", NO_CART, CHECKOUT, "#meals-and-7d"]) {
      const page = open(html, hash);
      assert.equal(hiddenInTree(page.el("why-link")), false, `${build}, ${hash || "(no fragment)"}: shown`);
    }
    const page = open(html);
    page.el("who-family").click();
    page.el("who-individual").click();
    assert.equal(hiddenInTree(page.el("why-link")), false, `${build}: after the panels are switched: shown`);
  }
});

test("UC13: the same button, the same dialog, the same words (C items 2–3)", () => {
  for (const [build, html] of Object.entries(PAGES)) {
    const page = open(html);
    const link = page.el("why-link");
    assert.equal(words(link), WHY, `${build}: its words`);
    assert.deepEqual([link.localName, link.getAttribute("type"), link.getAttribute("aria-haspopup"), link.getAttribute("aria-controls")], ["button", "button", "dialog", "why"], `${build}: the button opening #why`);
    const calls = browserParts(page);
    link.click();
    assert.deepEqual(calls, ["showModal #why"], `${build}: pressed, the /why/ dialog opens`);
    const banners = [...page.document.querySelectorAll("#why-link, .why-link")].filter((n) => !n.closest("noscript"));
    assert.equal(banners.length, 1, `${build}: one banner (its no-script link apart)`);
  }
});

test("UC13: its look — an actionable banner, never orange, not a pill (C item 2)", () => {
  for (const [build, html] of Object.entries(PAGES)) {
    const css = cssOf(open(html));
    const base = rule(css, ".why-link");
    assert.match(base, /background:\s*var\(--ice\)/, `${build}: on --ice`);
    assert.match(base, /border:\s*1px solid var\(--line\)/, `${build}: the hairline --line border`);
    assert.match(base, /border-radius:\s*var\(--radius\)/, `${build}: the radius, not a pill`);
    assert.match(base, /width:\s*100%/, `${build}: the column's width`);
    const tall = /min-height:\s*(\d+)px/.exec(base);
    assert.ok(tall && Number(tall[1]) >= TALL_PX, `${build}: at least ${TALL_PX} px tall (${tall?.[1]})`);
    const font = /font:\s*(\d+)\s+(\d+)px\/[\d.]+\s+var\(--head\)/.exec(base);
    assert.ok(font && font[1] === "600" && Number(font[2]) >= SIZE_PX.least && Number(font[2]) <= SIZE_PX.most, `${build}: Poppins 600, 17–19 px (${font?.[0]})`);
    assert.match(base, /color:\s*var\(--navy\)/, `${build}: navy`);
    assert.match(base, /text-align:\s*left/, `${build}: its words left-aligned`);
    assert.match(base, /justify-content:\s*space-between/, `${build}: the arrow at the right edge`);
    assert.match(rule(css, ".why-link::after"), /content:\s*"\\2192"/, `${build}: a "→" after its words`);
    assert.match(rule(css, ".why-link:hover"), /border-color:\s*var\(--field\)/, `${build}: hover darkens its border as the cards' (.choice:hover)`);
    assert.match(rule(css, ".choice:hover"), /border-color:\s*var\(--field\)/, `${build}: control: the cards' hover`);
    const every = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, sel]) => /\.why-link\b/.test(sel)).map(([, , body]) => body).join(";");
    assert.doesNotMatch(every, /var\(--(cta|cta-hover|orange|on-cta)\)/, `${build}: never orange`);
    assert.doesNotMatch(every, /border-radius:\s*(32px|50%|999)/, `${build}: not a pill`);
    assert.doesNotMatch(base, /margin:[^;]*\bauto\b/, `${build}: not centred like a button`);
  }
});

test("UC13: no raw colour; --navy on --ice a declared pair (C item 2, D item 1)", async () => {
  const template = await readFile(join(ROOT, "src", "template.html"), "utf8");
  const css = [...template.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  assert.deepEqual(rawColours(css), [], "the template's CSS: no raw colour outside :root");
  const { pairs } = JSON.parse(await readFile(join(ROOT, "src", "contrast-pairs.json"), "utf8"));
  assert.ok(pairs.some((p) => p.fg === "--navy" && p.bg === "--ice" && p.role === "body" && !p.build), "--navy on --ice, at body text's role, on every build");
});

test("UC13: the banner sends nothing new (D item 5)", () => {
  for (const [build, html] of Object.entries(PAGES)) {
    const visit = openVisit(html);
    const before = visit.beacons.length;
    visit.press("why-link");
    assert.deepEqual(visit.beacons.slice(before).map((b) => b.body.event), [], `${build}: no event`);
  }
});
