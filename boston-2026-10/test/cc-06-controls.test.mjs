// CC-6 (SPEC-chefs-choice § 3, § 4): the controls. Since SPEC-plan-page-refinement § 2 item 5 the list is always open:
// no button, the list shown with no press (CC-6a, updated); "Choose my own meals" is the rung 1 link, the plan's order
// page with no fragment; both links are reachable by keyboard. And the rest of Flow 2 is rung 1's: a count without picks keeps the single Choose your
// meals, no JavaScript shows no card, and the grid's and the Family card's links are unchanged.
import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { parseHTML } from "linkedom";
import { renderPage } from "../build.mjs";
import { anchors, hrefs } from "./helpers.mjs";
import {
  builtPage,
  card,
  CELLS,
  DAYS,
  FIXTURE,
  hiddenInTree,
  midday,
  ON,
  openPlanPage,
  PLANS,
  picksDir,
} from "./cc-harness.mjs";

const NOW = midday(DAYS["S-5"]);

/** Focusable by Tab: a button (not disabled) or a link with an href, no negative tabindex, nothing hidden around it. */
function tabbable(node) {
  const tag = node.tagName.toLowerCase();
  if (tag === "button" && node.hasAttribute("disabled")) return false;
  if (tag === "a" && !node.getAttribute("href")) return false;
  if (!["a", "button"].includes(tag)) return false;
  if (Number(node.getAttribute("tabindex") ?? 0) < 0) return false;
  return !hiddenInTree(node);
}

test("CC-6a (updated, SPEC-plan-page-refinement § 2 item 5): the list is shown with no press; there is no button", async () => {
  const { html } = await builtPage({ on: ON });
  const page = openPlanPage(html, { hash: "#signature-14", now: NOW });
  assert.equal(page.has("cc-toggle"), false, "no Chef's Choice button");
  assert.doesNotMatch(html, /aria-controls="cc-list"/, "nothing opens or closes the list");
  const s = card(page);
  assert.deepEqual([s.list, s.own], [true, true], "the list and Choose my own meals, on load");
  assert.ok(page.el("cc-list").contains(page.el("cc-checkout")), "Continue to checkout is in the list");
});

test("CC-6b: Choose my own meals is the rung 1 link for every size and count; Choose your meals gives way to both", async () => {
  const { html } = await builtPage({ on: ON });
  const grid = Object.fromEntries(anchors(html).filter((a) => a["data-cell"]).map((a) => [a["data-cell"], a.href]));
  for (const [hash, , mpid] of CELLS) {
    const s = card(openPlanPage(html, { hash, now: NOW }));
    assert.equal(s.choose, false, `${hash}: the single Choose your meals is not shown`);
    assert.deepEqual([s.list, s.own], [true, true], `${hash}: the list and Choose my own meals are`);
    assert.equal(s.ownHref, `https://fitafnutrition.com/order?mpid=${mpid}`, `${hash}: the plan's order page, no fragment`);
    assert.equal(s.ownHref, grid[hash.slice(1)], `${hash}: exactly the grid's rung 1 link for the cell`);
    assert.equal(s.ownHref, s.chooseHref, `${hash}: and today's Choose your meals link`);
  }
});

test("CC-6c: both links are reachable by keyboard, in the card's order, nothing hiding them (no button since § 2 item 5)", async () => {
  const { html } = await builtPage({ on: ON });
  const page = openPlanPage(html, { hash: "#lean-7", now: NOW });
  const own = page.el("cc-own");
  assert.ok(tabbable(page.el("cc-checkout")), "Continue to checkout takes focus, with no press");
  assert.ok(tabbable(own), "Choose my own meals takes focus");
  assert.equal(tabbable(page.el("result-cta")), false, "the single Choose your meals does not (it is hidden)");
  const order = [...page.document.querySelectorAll("a, button")].filter(tabbable).map((n) => n.id);
  const at = (id) => order.indexOf(id);
  assert.ok(at("cc-checkout") >= 0 && at("cc-checkout") < at("cc-own"), `tab order: ${order.join(", ")}`);
  const style = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  assert.match(style, /\.cta\[hidden\][^{]*\{[^}]*display:\s*none/, "a hidden .cta is not drawn (.cta sets display: flex)");
});

test("CC-6d: a count with no picks keeps today's card; no JavaScript shows no card", async () => {
  const onlySeven = structuredClone(FIXTURE);
  delete onlySeven.menus["14"];
  const dir = await picksDir({ "2026-10-04.json": onlySeven });
  try {
    const { html } = await builtPage({ picks: dir, on: ON });
    const seven = card(openPlanPage(html, { hash: "#lean-7", now: NOW }));
    assert.deepEqual([seven.choose, seven.list, seven.own], [false, true, true], "control: 7 has picks");
    const fourteen = card(openPlanPage(html, { hash: "#lean-14", now: NOW }));
    assert.deepEqual([fourteen.choose, fourteen.own, fourteen.list], [true, false, false], "14: today's card");
    assert.equal(fourteen.chooseHref, "https://fitafnutrition.com/order?mpid=23");
    const page = openPlanPage(html, { hash: "#lean-7", now: NOW });
    page.go("#lean-14");
    assert.deepEqual(
      (({ choose, own, list }) => [choose, own, list])(card(page)),
      [true, false, false],
      "changing 7 to 14 in the page: today's card",
    );
    page.go("#performance-7");
    const back = card(page);
    assert.deepEqual([back.choose, back.list, back.own], [false, true, true], "and back to a count with picks");
    assert.equal(back.ownHref, "https://fitafnutrition.com/order?mpid=31", "for the new size");
    // Without JavaScript the card's container is .js-only, which the page's <noscript> style hides.
    const { document } = parseHTML(html);
    for (const id of ["cc-list", "cc-own"]) {
      const node = document.getElementById(id);
      assert.ok(node.closest("#result"), `#${id} is on the result card`);
      assert.ok(node.closest(".js-only"), `#${id} is inside .js-only, not shown without JavaScript`);
      assert.ok(node.hasAttribute("hidden"), `#${id} is hidden until the script shows it`);
    }
    assert.match(html, /<noscript><style>\.js-only \{ display: none !important; \}/, "control: the page's no-script rule");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("CC-6e: the grid's links and the Family card are rung 1's, byte for byte", async () => {
  const withPicks = (await builtPage({ on: ON })).html;
  const today = await renderPage(PLANS);
  assert.ok(withPicks.includes('id="cc-list"'), "control: the page carries the Chef's Choice card");
  assert.deepEqual(hrefs(withPicks), hrefs(today), "the same seven order links, no more (the card's are set by the script)");
  const part = (html, from, to) => html.slice(html.indexOf(from), html.indexOf(to, html.indexOf(from)));
  for (const [from, to] of [
    ['<dialog class="all" id="all"', "</dialog>"],
    ['<section class="panel" id="panel-family"', "</section>"],
  ]) {
    assert.ok(today.includes(from), `control: ${from}`);
    assert.equal(part(withPicks, from, to), part(today, from, to), from);
  }
});
