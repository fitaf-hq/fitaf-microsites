// Shared by S27-S31 (SPEC-rung4-save-offer.md § 2b: save the offer at the END). Not a test file itself.
// The development page is run as a browser runs it (cc-harness openPlanPage: linkedom, its inline scripts in one `vm`
// context). "What a visitor reads" is the page in document order, skipping what is not displayed: an element or an
// ancestor carrying `hidden`, a closed <dialog>, <script>, <style>, <noscript>, <template>. Each assertion is a function
// so S31 can run it on a mutant, as S25 runs S21's.
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { hiddenInTree, openPlanPage, PLANS } from "./cc-harness.mjs";

/** A fixed browser clock for the page cases (the offer box's label is chosen on it; nothing here depends on which). */
export const NOW = Date.parse("2026-10-18T17:00:00Z");

/** Flow 1: the section holding DRAFT § 1's lines from "Not ready today?" to the privacy line, the form, and § 2. */
export const FLOW_ONE = "save";
/** The offer box at the top: § 2a's heading and label. */
export const OFFER_BOX = "offer-box";
/** SPEC-ui-and-copy-pass § 4 B (2026-10-26): Flow 1's link, *Not ready?*, the result card's last thing, and the modal
 *  dialog holding Flow 1 that it opens. */
export const NOT_READY = "not-ready";
export const SAVE_DIALOG = "save-dialog";

/**
 * § 4 B: a visitor's press on *Not ready?*, the dialog opening as the browser opens it. linkedom has no modal dialogs
 * (a-harness stubs them so for See all plans): the dialog's showModal and close stood in for (`open` set and removed,
 * `close` fired), the press the page's own (app.js's modal()). Returns the dialog and a function that closes it as its
 * close button does.
 */
export function openSaveDialog(page) {
  const dialog = page.el(SAVE_DIALOG);
  if (typeof dialog.showModal !== "function") {
    dialog.showModal = () => {
      dialog.setAttribute("open", "");
      dialog.open = true;
    };
    dialog.close = () => {
      if (!dialog.hasAttribute("open")) return;
      dialog.removeAttribute("open");
      dialog.open = false;
      const e = page.document.createEvent("Event");
      e.initEvent("close", false, false);
      dialog.dispatchEvent(e);
    };
  }
  assert.equal(hiddenInTree(page.el(NOT_READY)), false, "Not ready? is shown, to press");
  page.el(NOT_READY).click();
  assert.ok(dialog.hasAttribute("open"), "Not ready? opens Flow 1's dialog");
  return { dialog, close: () => dialog.querySelector('button[aria-label="Close"]').click() };
}

const NOT_DISPLAYED = new Set(["script", "style", "noscript", "template"]);
const notDisplayed = (n) => n.hasAttribute("hidden") || NOT_DISPLAYED.has(n.localName) || (n.localName === "dialog" && !n.hasAttribute("open"));
const ownText = (n) => [...n.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join("").replace(/\s+/g, " ").trim();
const inside = (node, ancestor) => {
  for (let n = node; n; n = n.parentElement) if (n === ancestor) return true;
  return false;
};
const label = (n) => (n ? `${n.localName}${n.id ? `#${n.id}` : ""} "${ownText(n) || n.getAttribute("type") || ""}"` : "nothing");

/** What a visitor reads, in document order: every displayed element with text of its own, and every displayed field. */
export function readingOrder(root) {
  const out = [];
  const walk = (node) => {
    for (const child of node.children) {
      if (notDisplayed(child)) continue;
      if (ownText(child) || child.localName === "input") out.push(child);
      walk(child);
    }
  };
  walk(root);
  return out;
}

/** The reading order without the page-wide DRAFT banner (a development marking, not the page's content). */
const contentOrder = (document) => readingOrder(document.body).filter((n) => !inside(n, document.querySelector(".draft-banner")));

/**
 * The button that leaves for the store, as the visitor reads it (flows/02-choose.md § 7): the last thing read on the
 * shown card, the Family card's *Choose your meals*, or the result card's (*Choose your meals*, or with a week the
 * Chef's Choice card's *Choose my own meals*). null before a plan is chosen. It must be a link to the store's order page.
 * ⚠ AMENDED by SPEC-ui-and-copy-pass § 2.2 (2026-10-25): Family's result is the result card too, once its question is
 * answered; the Family card's own door is a visitor's without script (the page's script hides it), so on Family with no
 * answer there is no store button, as on an individual page before a plan.
 * ⚠ AMENDED by SPEC-ui-and-copy-pass § 4 B (2026-10-26): *Not ready?* (a button, Flow 1's link) is the result card's last
 * thing where Flow 1 is offered, so the store button is the last thing read before it.
 */
export function storeButton(page) {
  const { document } = page;
  const family = document.getElementById("panel-family");
  const result = document.getElementById("result");
  const door = family.querySelector(".family-card a[data-plan]");
  const card = !hiddenInTree(result) ? result : !hiddenInTree(family) && door && !hiddenInTree(door) ? family.querySelector(".family-card") : null;
  if (!card || hiddenInTree(card)) return null;
  const last = readingOrder(card).filter((n) => n.id !== NOT_READY).at(-1) ?? null;
  assert.ok(last && last.localName === "a", `the card's last item is a link (got ${label(last)})`);
  assert.ok(String(last.getAttribute("href")).startsWith(`${PLANS.order_base_url}?mpid=`), `${label(last)} leaves for the store's order page`);
  return last;
}

/**
 * S27: the page in document order. In the markup: the offer box's heading is the page's first heading and Flow 2's
 * question 1 its second, the label under the heading, and Flow 1 after the store button. ⚠ AMENDED by
 * SPEC-ui-and-copy-pass § 1 item 1 (2026-10-23): the box's heading IS its line (#save-offer-label, the offer's headline,
 * else its label), and "Your Boston offer" (#save-title, before it) is the box's accessible name, not drawn. As run, at `hash` and again
 * with a plan chosen and on Family: the offer box is read first, then Flow 2 (question 1 first, for an individual
 * visit), and nothing of Flow 1 is read before the store button.
 * ⚠ AMENDED by SPEC-ui-and-copy-pass § 2 items 1–2 (2026-10-25): Flow 2's question 1 is who it is for (#q-who, the tabs
 * made a question), above both panels, so it is read first on Family too; the goal is the last question.
 */
export function assertOfferBoxThenFlowTwo(html, { hash = "", now = NOW } = {}) {
  const { document } = parseHTML(html);
  const all = [...document.querySelectorAll("*")];
  const at = (id) => {
    const i = all.indexOf(document.getElementById(id));
    assert.ok(i >= 0, `the page has #${id}`);
    return i;
  };
  const headings = all.filter((n) => /^h[1-6]$/.test(n.localName)).map((h) => h.id);
  assert.deepEqual(headings.slice(0, 2), ["save-offer-label", "q-who"], "in the markup: the offer box's heading first, Flow 2's question 1 next");
  assert.ok(at(OFFER_BOX) < at("save-title") && at("save-title") < at("save-offer-label"), "in the markup: the offer box holds the heading, then the label");
  assert.ok(at("save-offer-label") < at("q-who"), "in the markup: the offer box, then question 1");
  assert.ok(at(FLOW_ONE) > at("result-cta"), "in the markup: no Flow 1 above the store button");

  for (const h of [...new Set([hash, "#lean-or-7d", "#family"])]) {
    const page = openPlanPage(html, { hash: h, now });
    const read = contentOrder(page.document);
    const box = page.el(OFFER_BOX);
    const flowOne = page.el(FLOW_ONE);
    const firstAfterBox = read.findIndex((n) => !inside(n, box));
    assert.ok(firstAfterBox > 0 && read[0].id === "save-offer-label", `${h || "(no fragment)"}: the offer box is read first, its heading first (got ${label(read[0])})`);
    assert.ok(inside(read[firstAfterBox], page.document.querySelector("main")), `${h || "(no fragment)"}: then Flow 2 (got ${label(read[firstAfterBox])})`);
    const q = read.find((n) => n.classList.contains("step-label"));
    assert.equal(q?.id, "q-who", `${h || "(no fragment)"}: Flow 2's first question read is question 1`);
    assert.ok(!read.slice(0, read.indexOf(q)).some((n) => inside(n, flowOne)), `${h || "(no fragment)"}: nothing of Flow 1 before question 1`);
    const button = storeButton(page);
    const early = read.filter((n) => inside(n, flowOne) && (!button || read.indexOf(n) < read.indexOf(button)));
    assert.deepEqual(early.map(label), [], `${h || "(no fragment)"}: as run, no Flow 1 above the store button`);
  }
}

/**
 * S28 (and S30): with a plan chosen, or on Family, Flow 1 is read directly after the store button: all of it, and
 * nothing between. `form`: whether its form is shown (OFFER), or only the one-line Save my offer link (PLAN, S30).
 * `done` (SPEC-ui-and-copy-pass § 1 item 2, UC2): after a save, only its done line (the development page's DRAFT tag
 * apart), the form not shown. Since that item, "a plan chosen" means the card's Continue to checkout is shown.
 * ⚠ AMENDED by SPEC-ui-and-copy-pass § 4 B (2026-10-26, the Advisor: "a "Not ready?" secondary call to action link/button
 * … after the checkout button … When tapped, that shows a modal with the contents of the "save offer form""): nothing of
 * Flow 1 is in the page's flow. Directly after the store button is its link, *Not ready?*; pressed (openSaveDialog), its
 * dialog holds Flow 1 whole and nothing else but the dialog's close button, read as the checks above read it; the
 * dialog is then closed as its close button closes it, the page left as it was.
 */
export function assertFlowOneDirectlyAfterStoreButton(page, { form = true, done = false } = {}) {
  const read = readingOrder(page.document.body);
  const button = storeButton(page);
  assert.ok(button, "a plan is chosen: the store button is shown");
  const i = read.indexOf(button);
  assert.equal(label(read[i + 1]), label(page.el(NOT_READY)), `directly after "${ownText(button)}": Not ready?`);
  assert.deepEqual(read.filter((n) => inside(n, page.el(FLOW_ONE))).map(label), [], "nothing of Flow 1 read in the page's flow");
  const { dialog, close } = openSaveDialog(page);
  try {
    const inDialog = readingOrder(dialog);
    const flowOne = inDialog.filter((n) => inside(n, page.el(FLOW_ONE)));
    assert.ok(flowOne.length > 0, "Flow 1 is shown");
    assert.deepEqual(inDialog.filter((n) => !inside(n, page.el(FLOW_ONE))).map((n) => n.getAttribute("aria-label")), ["Close"], "in its dialog: Flow 1, whole, and the close button, nothing else");
    if (done) {
      assert.deepEqual(flowOne.filter((n) => !n.classList.contains("draft-tag")).map((n) => n.id), ["save-done", "save-done-email"], "only the done line");
      assert.equal(hiddenInTree(page.el("save-form")), true, "the form is not shown");
    } else if (form) {
      assert.equal(hiddenInTree(page.el("save-form")), false, "its form is shown");
      const lines = flowOne.map(ownText);
      const first = lines.findIndex((t) => t.startsWith("Not ready today? Save it"));
      assert.ok(first >= 0 && first < flowOne.indexOf(page.el("save-email")), "DRAFT § 1's \"Not ready today? Save it\" line, then the form");
    } else {
      assert.deepEqual(flowOne.map((n) => n.id), ["save-reopen"], "only the one-line Save my offer link");
      assert.equal(ownText(page.el("save-reopen")), "Save my offer");
      assert.equal(hiddenInTree(page.el("save-form")), true, "the form is not shown");
    }
    return { button, flowOne };
  } finally {
    close();
  }
}

/** S28: before a plan is chosen, nothing of Flow 1 is shown. ⚠ AMENDED by SPEC-ui-and-copy-pass § 4 B: nor its link. */
export function assertFlowOneAbsent(page) {
  assert.equal(hiddenInTree(page.el(FLOW_ONE)), true, "Flow 1 is not shown");
  if (page.has(NOT_READY)) assert.equal(hiddenInTree(page.el(NOT_READY)), true, "its link, Not ready?, is not shown");
  assert.deepEqual(readingOrder(page.document.body).filter((n) => inside(n, page.el(FLOW_ONE))).map(label), [], "nothing of Flow 1 is read");
}

const MODAL = "dialog, [aria-modal], [popover], [role=dialog], [role=alertdialog]";
/** Flow 1's own selectors: what a rule must name to style Flow 1 or the offer box. */
const FLOW_ONE_SELECTOR = /#save\b|\.save\b|\.save-|#offer-box\b|\.offer-box\b|\.draft-tag\b|\.field\b|\.tick\b|\.skip/;
const OVERLAY_CSS = /position\s*:\s*(fixed|absolute|sticky)|z-index|\binset\s*:|backdrop/i;
const MODAL_JS = /showModal|\.show\s*\(|showPopover|requestFullscreen|aria-modal|createElement\s*\(\s*["']dialog/;

/**
 * S29: the page's markup has no dialog, [aria-modal] or overlay element for Flow 1 or the offer box: none inside them,
 * none around them; no [aria-modal] anywhere; the page's one dialog is Flow 2's See all plans; no rule styling Flow 1
 * positions or stacks it over the page; Flow 1's script opens nothing. As run, with a plan chosen and on Family, Flow 1
 * is inside no dialog.
 * ⚠ AMENDED by SPEC-ui-and-copy-pass § 4 B (2026-10-26, the Advisor: "When tapped, that shows a modal with the contents of
 * the "save offer form". I think that will cleanup the flow."): rung 4's "no modal" (§ 2b item 1) is reversed for Flow 1
 * by his ruling, so this is now S29's rule as § 4 B makes it, and its name says so. Flow 1 is inside exactly ONE modal
 * element, its own dialog (#save-dialog, which *Not ready?* opens through the page's modal(), as See all plans and Why Fit
 * AF? open theirs); nothing inside Flow 1 is a dialog, popover or [aria-modal]; the offer box is in none and holds none;
 * no inline style; no [aria-modal] anywhere (a <dialog> opened by showModal is modal by itself); the page's dialogs are
 * See all plans (#all), Flow 1's (#save-dialog) and, since § 4 C at the foot, /why/'s (#why), in that order; no rule
 * styling Flow 1 positions or stacks it over the page (the dialog's top layer is the browser's); Flow 1's own script
 * opens nothing. As run, with a plan chosen and on Family, Flow 1's one modal ancestor is #save-dialog.
 */
export function assertFlowOneInItsDialog(html, { now = NOW } = {}) {
  const { document } = parseHTML(html);
  const [box, flowOne, dialog] = [OFFER_BOX, FLOW_ONE, SAVE_DIALOG].map((id) => document.getElementById(id));
  assert.ok(box && flowOne && dialog, "the page has the offer box, Flow 1 and its dialog");
  const modalsAround = (node) => {
    const out = [];
    for (let n = node.parentElement; n; n = n.parentElement) if (n.matches(MODAL)) out.push(n);
    return out;
  };
  for (const node of [box, flowOne]) {
    assert.deepEqual([...node.querySelectorAll(MODAL)].map(label), [], `#${node.id}: no dialog, [aria-modal], popover or dialog role inside`);
    for (const n of [node, ...node.querySelectorAll("*")]) assert.ok(!n.hasAttribute("style"), `${label(n)}: no inline style`);
  }
  assert.deepEqual(modalsAround(box).map(label), [], "the offer box is inside no dialog");
  assert.equal(dialog.localName, "dialog", "Flow 1's dialog is a <dialog>");
  assert.deepEqual(modalsAround(flowOne).map(label), [label(dialog)], "Flow 1 is inside exactly one modal element, its own dialog");
  assert.deepEqual([...document.querySelectorAll("[aria-modal]")].map(label), [], "no [aria-modal] anywhere on the page");
  assert.deepEqual([...document.querySelectorAll("dialog")].map((d) => d.id), ["all", SAVE_DIALOG, "why"], "the page's dialogs: See all plans, Flow 1's, /why/'s at the foot");
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(scripts.some((s) => s.includes(`modal($("#${SAVE_DIALOG}"), $("#${NOT_READY}"), $("#save-close"));`)), "Not ready? opens it through the page's modal()");
  const css = [...document.querySelectorAll("style")].map((s) => s.textContent).join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (FLOW_ONE_SELECTOR.test(selector)) assert.doesNotMatch(body, OVERLAY_CSS, `no overlay: ${selector.trim()} { ${body.trim()} }`);
  }
  const flowOneScript = scripts.find((s) => s.includes("Flow 1 — save the offer"));
  assert.ok(flowOneScript, "the page carries Flow 1's script");
  assert.doesNotMatch(flowOneScript, MODAL_JS, "Flow 1's script opens no dialog, popover or modal");
  for (const h of ["#lean-or-7d", "#family"]) {
    const page = openPlanPage(html, { hash: h, now });
    assert.deepEqual(modalsAround(page.el(FLOW_ONE)).map(label), [label(page.el(SAVE_DIALOG))], `${h}: Flow 1's one modal ancestor is its dialog`);
  }
}
