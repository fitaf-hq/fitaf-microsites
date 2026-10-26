// UC14 (SPEC-ui-and-copy-pass.md § 5 items 1, 2 and 4, the Advisor 2026-10-26: "move up "Choose my own meals" to under
// the 5 preset menu options" · "Please drop "15 meals go through as our 14-meal plan for now." and other variants" · "Add a
// new call to action that's similar to "Explore our menus" … above Chef's Choice etc." · "This moves all of the pricing
// information to above the checkout button" · "increase the text weight on the meal names"): on both builds that carry
// the card (the production page with `production` true and the development page), with the two-menu fixture week
// (em-harness: Chef's Choice and an invented list), run as a browser runs it:
//   item 1, the card's order: the heading "Explore our menus" in the questions' heading style, the chips (the menus, then
//   *Choose my own meals* the last chip), the meal list, the price, the checkout, then *Not ready?*; no *Choose my own
//   meals* link below the checkout;
//   item 2, the rounded line never printed: no #result-rounded, and none of its texts on the page, for every answer set
//   that has one;
//   item 4, the meal names at weight 600 (the rule; drawn in Chrome, uc14-16-chrome).
import test from "node:test";
import assert from "node:assert/strict";
import { hiddenInTree, MESSAGES, PLANS } from "./cc-harness.mjs";
import { BOTH, fixtureWords, menusPage, openMenus } from "./em-harness.mjs";
import { ROUNDED, TABLE } from "./ms-harness.mjs";
import { readingOrder } from "./save-end-fixture.mjs";

const BUILDS = { production: await menusPage(), development: await menusPage({ target: "dev" }) };
/** § 5 item 1: the heading's words (⬜ his to edit), written here from the contract. */
const EXPLORE = "Explore our menus";
/** The chip joined to the menus: *Choose my own meals*, its words unchanged (the words' `own`). */
const OWN = MESSAGES.chefs_choice.own;
const HASH = `#lean-${BOTH[0]}`;

const words = (n) => n.textContent.replace(/\s+/g, " ").trim();

test("UC14: the card's order — Explore our menus, the chips with Choose my own meals last, the list, the price, the checkout, Not ready? (§ 5 item 1)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = openMenus(html, HASH);
    const result = page.el("result");
    assert.equal(hiddenInTree(result), false, `${build}: control: the result card`);
    const read = readingOrder(result);
    const at = (node) => read.indexOf(node);
    const heading = page.document.querySelector("#result .step-label");
    assert.ok(heading && words(heading) === EXPLORE, `${build}: the heading "${EXPLORE}" in the questions' heading style (.step-label)`);
    const chips = [...page.document.querySelectorAll("#cc-menus label")].filter((l) => !hiddenInTree(l)).map(words);
    const menus = Object.values(fixtureWords().menus).filter((n) => typeof n === "string");
    assert.equal(chips.at(-1), OWN, `${build}: Choose my own meals the last chip`);
    assert.ok(chips.length >= 2 && chips.slice(0, -1).every((n) => menus.includes(n)), `${build}: the menus before it (${chips.join(", ")})`);
    // Each part by an element a visitor reads (one with words of its own, or a field): the heading, the first chip's
    // radio, the first meal's name, the weekly total, the checkout, Not ready?.
    const order = [heading, page.document.querySelector("#cc-menus input"), page.document.querySelector("#cc-meals .cc-name"), page.el("result-total"), page.el("cc-checkout"), page.el("not-ready")];
    const places = order.map((n) => (n ? at(n) : -1));
    assert.ok(places.every((i) => i >= 0), `${build}: control: every part read (${places.join(", ")})`);
    assert.deepEqual([...places].sort((a, b) => a - b), places, `${build}: heading, chips, list, price, checkout, Not ready? in that order (${places.join(", ")})`);
    assert.equal(page.document.getElementById("cc-own"), null, `${build}: no Choose my own meals link below the checkout`);
  }
});

test("UC14: the rounded line is never printed — no #result-rounded and none of its texts, for every answer set with one (§ 5 item 2)", () => {
  const phrase = MESSAGES.plan_page.rounded;
  const texts = TABLE.filter((r) => r.plan < r.meals).map((r) => phrase.replace("{meals}", r.meals).replace("{plan}", r.plan));
  assert.ok(texts.length > 0 && ROUNDED.length === texts.length, "control: answer sets above their plan, each a rounded text");
  for (const [build, html] of Object.entries(BUILDS)) {
    assert.ok(!texts.some((t) => html.includes(t)), `${build}: no rounded text in the page`);
    for (const key of ROUNDED) {
      for (const goal of PLANS.individual.map((p) => p.id)) {
        const page = openMenus(html, `#${goal}-${key}`);
        assert.equal(page.document.getElementById("result-rounded"), null, `${build}, #${goal}-${key}: no #result-rounded`);
        const shown = readingOrder(page.document.body).map(words).join(" ");
        for (const t of texts) assert.ok(!shown.includes(t), `${build}, #${goal}-${key}: "${t}" not read`);
      }
    }
  }
});

test("UC14: the meal names at weight 600 (§ 5 item 4)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const css = [...openMenus(html, HASH).document.querySelectorAll("style")].map((s) => s.textContent).join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, sel]) => sel.split(",").some((s) => s.trim() === ".cc-name"));
    assert.ok(rules.some(([, , body]) => /font-weight:\s*600/.test(body)), `${build}: .cc-name { font-weight: 600 }`);
  }
});
