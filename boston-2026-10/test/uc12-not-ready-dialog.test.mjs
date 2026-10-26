// UC12 (SPEC-ui-and-copy-pass.md § 4 B, the Advisor 2026-10-26: "Add a "Not ready?" secondary call to action link/button
// (we can edit the copy) after the checkout button (they should both reveal at the same time). When tapped, that shows a
// modal with the contents of the "save offer form". I think that will cleanup the flow."): on both builds that carry the
// save step (D item 1), run as a browser runs it:
//   *Not ready?* (item 1): a text button in the result card, after the card's checkout, shown with it and hidden with
//   it; never orange (See all plans' look: navy, underlined), centred, at least 44 px tall.
//   The dialog (item 2): the save step's whole contents (src/save/section.html) inside one <dialog>, nothing of it in the
//   page's flow; opened by *Not ready?*; its close button (×) and a press on the backdrop close it, focus back to *Not
//   ready?*; its accessible name the step's own. Esc is the browser's own (a modal dialog's cancel), read in Chrome
//   (tools/storybook/test/uc11-13-chrome.test.mjs).
//   The step unchanged inside it (item 3): a save through the dialog reaches /api/save as today (UC9's path).
//   The production page with `production` false (S20's, the rollback) has neither (item 4); the offer box at the top
//   points nowhere into the step (item 5); *Not ready?* sends nothing (D item 5).
// ⚠ The builder's reading, stated in § 4.1 (not ruled): "shown and hidden with it" is the save step's own rule since § 1
// item 2 (the Advisor: "only appear when the Checkout button appears"): *Not ready?* is shown exactly while the card's
// *Continue to checkout* is (flow1.js's `beside`), never beside *Choose your meals* alone; and its place is the step's
// since § 1, after the card's last link (*Choose my own meals*), now inside the result card.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { hiddenInTree } from "./cc-harness.mjs";
import { openVisit } from "./a-harness.mjs";
import { readingOrder } from "./save-end-fixture.mjs";
import { CHECKOUT, NO_CART, saveWith, saveStubs } from "./uc-harness.mjs";
import { browserParts, click, inOrder, inside, open, pages } from "./uc11-harness.mjs";

const { development, production, productionFalse } = await pages();
const BUILDS = { development, production };
/** B item 1, as § 4.2 item 6 rules them (the Advisor, 2026-10-26: "Let's try: "Not ready to checkout? Save your offer
 *  now.""): his words exactly, the link's text and its accessible name. */
const NOT_READY = "Not ready to checkout? Save your offer now.";
/** Every element id of the save step's markup (src/save/section.html as written), which item 2 moves into the dialog. */
const STEP_IDS = [...(await readFile(join(ROOT, "src", "save", "section.html"), "utf8")).matchAll(/\bid="([^"{}]+)"/g)].map((m) => m[1]);
/** The request a save makes, field by field (flow1.js's `body`; SPEC-save-offer-production): exactly these. */
const BODY = ["kind", "email", "zip", "consent_marketing", "event_id", "wording_version", "turnstile_token"];

const words = (n) => n.textContent.replace(/\s+/g, " ").trim();
const shown = (page, id) => page.has(id) && !hiddenInTree(page.el(id));
/** The page's CSS: every <style> block's text. */
const cssOf = (page) => [...page.document.querySelectorAll("style")].map((s) => s.textContent).join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
/** The bodies of every rule whose selector names `pattern`. */
const rulesFor = (css, pattern) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, sel]) => pattern.test(sel)).map(([, sel, body]) => ({ sel: sel.trim(), body }));

test("UC12: control — the save step's markup names its parts (src/save/section.html)", () => {
  for (const id of ["save", "save-form", "save-email", "save-zip", "save-turnstile", "save-out-of-area", "save-done", "save-expansion-done", "save-reopen"]) {
    assert.ok(STEP_IDS.includes(id), `#${id} is the step's`);
  }
});

test("UC12: Not ready? — in the result card after its checkout, shown with Continue to checkout and hidden without it (B item 1)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = open(html, CHECKOUT);
    assert.ok(shown(page, "cc-checkout"), `${build}, ${CHECKOUT}: control: Continue to checkout shown`);
    assert.ok(shown(page, "not-ready"), `${build}, ${CHECKOUT}: Not ready? shown`);
    const button = page.el("not-ready");
    assert.equal(words(button), NOT_READY, `${build}: its words`);
    assert.deepEqual([button.localName, button.getAttribute("type")], ["button", "button"], `${build}: a button`);
    assert.equal(button.getAttribute("aria-haspopup"), "dialog", `${build}: it opens a dialog`);
    assert.equal(button.getAttribute("aria-controls"), "save-dialog", `${build}: the save step's dialog`);
    assert.ok(!button.matches(".cta, .choice"), `${build}: not the store's button, not an answer`);
    assert.ok(inside(button, page.el("result")), `${build}: inside the result card`);
    const read = readingOrder(page.el("result"));
    assert.ok(read.indexOf(page.el("cc-checkout")) < read.indexOf(button), `${build}: read after Continue to checkout`);
    assert.equal(read.at(-1), button, `${build}: the card's last thing read (after its last link, Choose my own meals)`);
    for (const hash of [NO_CART, "#lean", "", "#family", "#family-or"]) {
      const other = open(html, hash);
      assert.equal(shown(other, "cc-checkout"), false, `${build}, ${hash || "(no fragment)"}: control: no Continue to checkout`);
      assert.equal(shown(other, "not-ready"), false, `${build}, ${hash || "(no fragment)"}: no Not ready?`);
    }
    page.go(NO_CART);
    assert.equal(shown(page, "not-ready"), false, `${build}: to answers with no cart: hidden with the checkout`);
    page.go(CHECKOUT);
    assert.equal(shown(page, "not-ready"), true, `${build}: back: shown with it`);
  }
});

test("UC12: the save step's whole contents in one dialog, nothing of it in the page's flow (B item 2)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = open(html, CHECKOUT);
    assert.ok(page.has("save-dialog"), `${build}: the dialog`);
    const dialog = page.el("save-dialog");
    assert.equal(dialog.localName, "dialog", `${build}: a <dialog>`);
    for (const id of STEP_IDS) {
      assert.equal(page.document.querySelectorAll(`[id="${id}"]`).length, 1, `${build}: #${id} once on the page`);
      assert.ok(inside(page.el(id), dialog), `${build}: #${id} inside the dialog`);
    }
    for (const id of ["save-skip-menu"].filter((x) => page.has(x))) assert.ok(inside(page.el(id), dialog), `${build}: #${id} (the menu link) inside the dialog`);
    assert.equal(dialog.getAttribute("aria-labelledby"), page.el("save").getAttribute("aria-labelledby"), `${build}: its accessible name the step's own`);
    assert.equal(dialog.hasAttribute("open"), false, `${build}: closed at load`);
    assert.deepEqual(readingOrder(page.document.body).filter((n) => inside(n, dialog)).map((n) => n.id || n.localName), [], `${build}: nothing of the step read in the page's flow`);
    const close = dialog.querySelector('button[aria-label="Close"]');
    assert.ok(close && words(close) === "×", `${build}: its close button (×)`);
  }
});

test("UC12: opening it; its close button and the backdrop close it; focus back to Not ready? (B item 2)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = open(html, CHECKOUT);
    const calls = browserParts(page);
    const dialog = page.el("save-dialog");
    page.el("not-ready").click();
    assert.deepEqual(calls, ["showModal #save-dialog"], `${build}: Not ready? opens it, modal`);
    const read = readingOrder(dialog).map(words);
    assert.ok(read.some((t) => t.startsWith("Not ready today? Save it")), `${build}: open, the step's lead read`);
    assert.ok(readingOrder(dialog).includes(page.el("save-email")), `${build}: and its form`);
    click(page, page.el("save-lead"));
    assert.equal(dialog.hasAttribute("open"), true, `${build}: a press inside its box leaves it open`);
    dialog.querySelector('button[aria-label="Close"]').click();
    assert.deepEqual(calls.slice(1), ["close #save-dialog", "focus #not-ready"], `${build}: × closes it, focus back to Not ready?`);
    page.el("not-ready").click();
    click(page, dialog);
    assert.deepEqual(calls.slice(3), ["showModal #save-dialog", "close #save-dialog", "focus #not-ready"], `${build}: a press on the backdrop (the dialog itself) closes it, focus back`);
  }
});

test("UC12: a save through the dialog reaches /api/save as today (B item 3)", async () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const { globals, fetches } = saveStubs();
    const page = open(html, CHECKOUT, globals);
    browserParts(page);
    page.el("not-ready").click();
    await saveWith(Object.assign(page, { fetches }));
    assert.equal(fetches.length, 1, `${build}: one request`);
    assert.equal(fetches[0].url, "/api/save", `${build}: to /api/save`);
    assert.deepEqual(Object.keys(JSON.parse(fetches[0].init.body)), BODY, `${build}: exactly the save's fields`);
    assert.ok(shown(page, "save-done") && inside(page.el("save-done"), page.el("save-dialog")), `${build}: the done line, in the dialog`);
  }
});

test("UC12: the production page with production false has neither (B item 4)", () => {
  const page = open(productionFalse, CHECKOUT);
  assert.ok(shown(page, "cc-checkout"), "control: the card's checkout shown");
  for (const id of ["not-ready", "save-dialog", "save"]) assert.equal(page.has(id), false, `no #${id}`);
});

test("UC12: never orange — See all plans' look, centred, at least 44 px (B item 1)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const css = cssOf(open(html));
    const rules = rulesFor(css, /\.not-ready\b/);
    assert.ok(rules.length > 0, `${build}: a rule for .not-ready`);
    const all = rules.map((r) => r.body).join(";");
    assert.doesNotMatch(all, /var\(--(cta|cta-hover|orange|on-cta)\)/, `${build}: no orange`);
    const base = rules.find((r) => r.sel === ".not-ready").body;
    assert.match(base, /color:\s*var\(--navy\)/, `${build}: navy`);
    assert.match(base, /text-decoration:\s*underline/, `${build}: underlined`);
    const min = /min-height:\s*(\d+)px/.exec(base);
    assert.ok(min && Number(min[1]) >= 44, `${build}: at least 44 px tall (${min?.[1]})`);
    assert.match(base, /margin:[^;]*\bauto\b|text-align:\s*center/, `${build}: centred`);
    assert.ok(rules.some((r) => /\[hidden\]/.test(r.sel) && /display:\s*none/.test(r.body)), `${build}: hidden means hidden (its display does not outrank [hidden])`);
  }
});

test("UC12: the offer box at the top points nowhere into the step (B item 5)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = open(html);
    const box = page.el("offer-box");
    assert.deepEqual([...box.querySelectorAll("a, button, [href], [aria-controls]")].map((n) => n.outerHTML), [], `${build}: no link or control in it`);
    const named = inOrder(page.document).filter((n) => n.getAttribute("aria-labelledby") === "save-title").map((n) => n.id);
    assert.deepEqual(named, ["offer-box", "save-dialog", "save"], `${build}: its #save-title names the box itself and the step (the dialog and the section), nothing else`);
  }
});

test("UC12: Not ready? sends nothing (D item 5)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const visit = openVisit(html, { hash: CHECKOUT });
    const before = visit.beacons.length;
    visit.press("not-ready");
    assert.deepEqual(visit.beacons.slice(before).map((b) => b.body.event), [], `${build}: no event`);
  }
});
