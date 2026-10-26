// UC15 (SPEC-ui-and-copy-pass.md § 5 item 3, ⛔ the one-day BRIDGE, the Advisor 2026-10-26: "Make "Choose my own meals"
// effectively a toggle. *For tonight*, if someone selects it, please change the behavior of the checkout button to send
// them to the HMP catalog … selecting "choose my own meals" should just show the full list of products with a note that
// says they will select which ones they want in the *next* step."): on both builds that carry the card, with the two-menu
// fixture week, run as a browser runs it:
//   the chip a toggle among the menus (pressing it presses it and releases the menu; pressing a menu releases it);
//   pressed, the list is every meal of every menu's cart for the answers, each once, in the order they first appear,
//   with the note "You'll choose your meals in the next step." above it, and the checkout's link the store's plan page
//   (the result's Choose your meals address), its words unchanged; a menu pressed again, the cart's link and its list;
//   the checkout click sent as today, its mpid the link's; and every line of the bridge marked
//   "BRIDGE (SPEC-ui-and-copy-pass § 5 item 3)" so it can be found and removed whole.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { hiddenInTree, MESSAGES, PLANS } from "./cc-harness.mjs";
import { openVisit } from "./a-harness.mjs";
import { BOTH, cartsOf, chooseMenu, fixtureWords, menusPage, openMenus, SHOWN_LIST, FIXTURE_LIST } from "./em-harness.mjs";

const BUILDS = { production: await menusPage(), development: await menusPage({ target: "dev" }) };
const KEY = BOTH[0];
const HASH = `#lean-${KEY}`;
/** § 5 item 3: the note's words (⬜ his to edit), written here from the contract; the chip's, the words' `own`. */
const NOTE = "You'll choose your meals in the next step.";
const OWN = MESSAGES.chefs_choice.own;
const MARK = "BRIDGE (SPEC-ui-and-copy-pass § 5 item 3)";

const words = (n) => n.textContent.replace(/\s+/g, " ").trim();
/** The chip whose label reads `name`: its radio. */
const chipNamed = (page, name) => [...page.document.querySelectorAll("#cc-menus label")].find((l) => words(l) === name)?.querySelector("input");
/** Press a chip as a visitor does: its radio checked, then its change, which bubbles (em-harness chooseMenu's way). */
function press(page, radio) {
  for (const r of page.document.querySelectorAll('#cc-menus input[type="radio"]')) r.checked = r === radio;
  radio.dispatchEvent(new page.document.defaultView.Event("change", { bubbles: true }));
}
/** The list's meals as read: each name's words (a meal once has no count). */
const listed = (page) => [...page.document.querySelectorAll("#cc-meals li .cc-name")].map(words);
/** The union, written from the fixture: every menu's cart for KEY in the chooser's order, each meal once, by first sight. */
function union() {
  const seen = new Set();
  const out = [];
  for (const list of Object.keys(fixtureWords().menus).filter((k) => k === SHOWN_LIST || k === FIXTURE_LIST)) {
    for (const item of cartsOf(list)[KEY].items) {
      if (seen.has(item.name)) continue;
      seen.add(item.name);
      out.push(item.display.replace(/\s+/g, " ").trim());
    }
  }
  return out;
}

test("UC15: Choose my own meals pressed — the week's full list with its note, the checkout to the store's plan page (§ 5 item 3)", () => {
  const expected = union();
  assert.ok(expected.length > cartsOf(SHOWN_LIST)[KEY].items.length - 1, "control: the menus' carts differ, so the union is longer than one cart");
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = openMenus(html, HASH);
    const own = chipNamed(page, OWN);
    assert.ok(own, `${build}: the Choose my own meals chip`);
    const cartLink = page.el("cc-checkout").getAttribute("href");
    assert.match(cartLink, /#fitaf=/, `${build}: control: the checkout carries the cart`);
    press(page, own);
    const checked = [...page.document.querySelectorAll('#cc-menus input[type="radio"]')].filter((r) => r.checked);
    assert.deepEqual(checked, [own], `${build}: pressed, it alone`);
    assert.deepEqual(listed(page), expected, `${build}: every meal of every menu's cart for ${KEY}, each once, in order`);
    const note = [...page.document.querySelectorAll("#result p")].find((p) => words(p) === NOTE);
    assert.ok(note && !hiddenInTree(note), `${build}: the note shown`);
    const all = [...page.document.querySelectorAll("*")];
    assert.ok(all.indexOf(note) < all.indexOf(page.document.querySelector("#cc-meals li")), `${build}: the note above the list`);
    const plan = page.el("result-cta").getAttribute("href");
    assert.ok(plan.startsWith(`${PLANS.order_base_url}?mpid=`), `${build}: control: the plan page's address`);
    assert.equal(page.el("cc-checkout").getAttribute("href"), plan, `${build}: the checkout goes to the store's plan page`);
    assert.equal(words(page.el("cc-checkout")), MESSAGES.chefs_choice.checkout, `${build}: its words unchanged`);
    press(page, chipNamed(page, fixtureWords().menus[SHOWN_LIST]));
    assert.equal(own.checked, false, `${build}: a menu pressed releases it`);
    assert.equal(page.el("cc-checkout").getAttribute("href"), cartLink, `${build}: the cart's link again`);
    assert.equal(hiddenInTree(note), true, `${build}: the note hidden again`);
    assert.equal(listed(page).length, cartsOf(SHOWN_LIST)[KEY].items.length, `${build}: the menu's own list again`);
  }
});

test("UC15: the checkout click while Choose my own meals is pressed is sent as today, its mpid the link's (§ 5 item 3)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const visit = openVisit(html, { hash: HASH });
    press({ document: visit.document }, chipNamed({ document: visit.document }, OWN));
    const before = visit.beacons.length;
    visit.press("cc-checkout");
    const mpid = Number(/[?&]mpid=(\d+)/.exec(visit.el("cc-checkout").getAttribute("href"))[1]);
    assert.deepEqual(visit.beacons.slice(before).map((b) => [b.body.event, b.body.link, b.body.mpid]), [["click", "chefs-choice", mpid]], `${build}: one click, the link's mpid`);
  }
});

test("UC15: every line of the bridge is marked, so it can be removed whole (§ 5 item 3)", async () => {
  for (const file of [join("src", "chefs-choice", "chefs-choice.js"), join("src", "chefs-choice", "card.html")]) {
    const text = await readFile(join(ROOT, file), "utf8");
    assert.ok(text.includes(MARK), `${file} carries "${MARK}"`);
  }
});
