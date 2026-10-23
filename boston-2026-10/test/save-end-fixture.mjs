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
 */
export function storeButton(page) {
  const { document } = page;
  const family = document.getElementById("panel-family");
  const card = hiddenInTree(family) ? document.getElementById("result") : family.querySelector(".family-card");
  if (!card || hiddenInTree(card)) return null;
  const last = readingOrder(card).at(-1) ?? null;
  assert.ok(last && last.localName === "a", `the card's last item is a link (got ${label(last)})`);
  assert.ok(String(last.getAttribute("href")).startsWith(`${PLANS.order_base_url}?mpid=`), `${label(last)} leaves for the store's order page`);
  return last;
}

/**
 * S27: the page in document order. In the markup: the offer box's heading is the page's first heading and Flow 2's
 * question 1 its second, the label under the heading, and Flow 1 after the store button. As run, at `hash` and again
 * with a plan chosen and on Family: the offer box is read first, then Flow 2 (question 1 first, for an individual
 * visit), and nothing of Flow 1 is read before the store button.
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
  assert.deepEqual(headings.slice(0, 2), ["save-title", "q-goal"], "in the markup: the offer box's heading first, Flow 2's question 1 next");
  assert.ok(at(OFFER_BOX) < at("save-title") && at("save-title") < at("save-offer-label"), "in the markup: the offer box holds the heading, then the label");
  assert.ok(at("save-offer-label") < at("q-goal"), "in the markup: the offer box, then question 1");
  assert.ok(at(FLOW_ONE) > at("result-cta"), "in the markup: no Flow 1 above the store button");

  for (const h of [...new Set([hash, "#lean-or-7d", "#family"])]) {
    const page = openPlanPage(html, { hash: h, now });
    const read = contentOrder(page.document);
    const box = page.el(OFFER_BOX);
    const flowOne = page.el(FLOW_ONE);
    const firstAfterBox = read.findIndex((n) => !inside(n, box));
    assert.ok(firstAfterBox > 0 && read[0].id === "save-title", `${h || "(no fragment)"}: the offer box is read first, its heading first (got ${label(read[0])})`);
    assert.ok(inside(read[firstAfterBox], page.document.querySelector("main")), `${h || "(no fragment)"}: then Flow 2 (got ${label(read[firstAfterBox])})`);
    if (hiddenInTree(page.el("panel-individual")) === false) {
      const q = read.find((n) => n.classList.contains("step-label"));
      assert.equal(q?.id, "q-goal", `${h || "(no fragment)"}: Flow 2's first question read is question 1`);
      assert.ok(!read.slice(0, read.indexOf(q)).some((n) => inside(n, flowOne)), `${h || "(no fragment)"}: nothing of Flow 1 before question 1`);
    }
    const button = storeButton(page);
    const early = read.filter((n) => inside(n, flowOne) && (!button || read.indexOf(n) < read.indexOf(button)));
    assert.deepEqual(early.map(label), [], `${h || "(no fragment)"}: as run, no Flow 1 above the store button`);
  }
}

/**
 * S28 (and S30): with a plan chosen, or on Family, Flow 1 is read directly after the store button: all of it, and
 * nothing between. `form`: whether its form is shown (OFFER), or only the one-line Save my offer link (PLAN, S30).
 */
export function assertFlowOneDirectlyAfterStoreButton(page, { form = true } = {}) {
  const read = readingOrder(page.document.body);
  const button = storeButton(page);
  assert.ok(button, "a plan is chosen: the store button is shown");
  const flowOne = read.filter((n) => inside(n, page.el(FLOW_ONE)));
  assert.ok(flowOne.length > 0, "Flow 1 is shown");
  const i = read.indexOf(button);
  assert.deepEqual(read.slice(i + 1, i + 1 + flowOne.length).map(label), flowOne.map(label), `directly after "${ownText(button)}": Flow 1, whole, nothing between`);
  if (form) {
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
}

/** S28: before a plan is chosen, nothing of Flow 1 is shown. */
export function assertFlowOneAbsent(page) {
  assert.equal(hiddenInTree(page.el(FLOW_ONE)), true, "Flow 1 is not shown");
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
 */
export function assertNoModalForFlowOne(html, { now = NOW } = {}) {
  const { document } = parseHTML(html);
  const nodes = [OFFER_BOX, FLOW_ONE].map((id) => document.getElementById(id));
  assert.ok(nodes.every(Boolean), "the page has the offer box and Flow 1");
  for (const node of nodes) {
    assert.deepEqual([...node.querySelectorAll(MODAL)].map(label), [], `#${node.id}: no dialog, [aria-modal], popover or dialog role inside`);
    for (let n = node.parentElement; n; n = n.parentElement) assert.ok(!n.matches(MODAL), `#${node.id}: not inside ${label(n)}`);
    for (const n of [node, ...node.querySelectorAll("*")]) assert.ok(!n.hasAttribute("style"), `${label(n)}: no inline style`);
  }
  assert.deepEqual([...document.querySelectorAll("[aria-modal]")].map(label), [], "no [aria-modal] anywhere on the page");
  // Since SPEC-why-fit-af.md § 2 item 2 "Why Fit AF?" is a second dialog (#why, the /why/ page in a frame); neither is
  // Flow 1's. Since SPEC-every-menu-and-nutrition § 11 item 5 (2026-10-22) its button and dialog sit above the tabs, so
  // #why comes first in the page.
  assert.deepEqual([...document.querySelectorAll("dialog")].map((d) => d.id), ["why", "all"], "the page's dialogs are /why/'s above the tabs (#why) and Flow 2's See all plans (#all)");
  const css = [...document.querySelectorAll("style")].map((s) => s.textContent).join("\n");
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (FLOW_ONE_SELECTOR.test(selector)) assert.doesNotMatch(body, OVERLAY_CSS, `no overlay: ${selector.trim()} { ${body.trim()} }`);
  }
  const flowOneScript = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes("Flow 1 — save the offer"));
  assert.ok(flowOneScript, "the page carries Flow 1's script");
  assert.doesNotMatch(flowOneScript, MODAL_JS, "Flow 1's script opens no dialog, popover or modal");
  for (const h of ["#lean-or-7d", "#family"]) {
    const page = openPlanPage(html, { hash: h, now });
    for (let n = page.el(FLOW_ONE).parentElement; n; n = n.parentElement) assert.ok(!n.matches(MODAL), `${h}: Flow 1 is not inside ${label(n)}`);
  }
}
