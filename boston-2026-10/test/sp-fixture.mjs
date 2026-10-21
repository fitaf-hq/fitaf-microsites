// Shared by SP1 and SP2 (SPEC-save-offer-production.md § 1, § 5). Not a test file itself. The page is run as a browser
// runs it (cc-harness openPlanPage: linkedom, its inline scripts in one `vm` context). Each assertion is a function, so a
// case can run it on a mutant and on either build's page.
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import saveConfig from "../data/save.json" with { type: "json" };
import { offerForSave } from "../src/worker/offers.js";
import { zonedDate } from "../src/worker/zoned-time.js";
import { hiddenInTree, openPlanPage } from "./cc-harness.mjs";
import { readingOrder } from "./save-end-fixture.mjs";

/** § 1 item 1: the step's offer line, and the label the page writes into it (offerForSave's, as the box at the top). */
export const STEP_OFFER = "save-step-offer";
export const STEP_OFFER_LABEL = "save-step-offer-label";

/** The offer box at the top as SPEC-rung4 § 2a and § 2b left it: § 1 item 1 keeps it as it is. */
export const OFFER_BOX_MARKUP = `<div class="wrap save-wrap">
  <section class="offer-box js-only" id="offer-box" aria-labelledby="save-title">
    <h2 id="save-title">Your Boston offer</h2>
    <p class="save-offer"><strong id="save-offer-label"></strong></p>
  </section>
</div>`;

/** § 1 item 2: the step's two buttons, and the page's quieter button they become. */
export const SAVE_BUTTONS = ["save-submit", "save-expansion"];
/** The quieter button's class: the step's own, which already draws its one-line *Save my offer* (SPEC-rung4 § 2b item 4). */
export const QUIET_CLASS = "skip";
/** The style the quieter button must be, by the contract's words: *See all plans*' (the footer's `.all-link`). */
export const QUIET_REFERENCE = "all-link";
/** What a visitor sees of a button's style: its colours, its type, its decoration, its box's edge. */
export const QUIET_PROPERTIES = ["color", "background", "border", "font", "text-decoration", "text-underline-offset"];

const squash = (s) => s.replace(/\s+/g, " ").trim();

/** SP1 in the markup: the line directly above the save lead, inside the open step, empty (the page writes the label, so
 *  the build stays date-independent: S24); the offer box at the top as it was. */
export function assertOfferLineInMarkup(html) {
  const { document } = parseHTML(html);
  assert.ok(html.includes(OFFER_BOX_MARKUP), "the offer box at the top, as it was");
  const lead = document.querySelector("#save .save-lead");
  assert.ok(lead, "the step has its save lead");
  assert.match(squash(lead.textContent), /^Not ready today\? Save it/, "the save lead is DRAFT § 1's line");
  const line = lead.previousElementSibling;
  assert.equal(line?.id, STEP_OFFER, "directly above the save lead: the step's offer line");
  const label = line.querySelector(`#${STEP_OFFER_LABEL}`);
  assert.ok(label, `the line holds #${STEP_OFFER_LABEL}`);
  assert.equal(label.textContent, "", "empty in the markup: the page writes the label in the browser");
  assert.ok(document.getElementById("save-open").contains(line), "inside the open step, so it goes wherever the step goes");
}

/**
 * SP1 as run, at `hash` with the browser's clock at `now`: the step's line shows the label offerForSave gives the Worker
 * for that date in the send time zone, the same as the box at the top, written as text, and read directly before the
 * save lead. Returns the label shown.
 */
export function assertOfferLineAsRun(html, offers, { hash, now }) {
  const page = openPlanPage(html, { hash, now });
  const where = `${hash} at ${new Date(now).toISOString()}`;
  const label = page.el(STEP_OFFER_LABEL);
  assert.equal(hiddenInTree(label), false, `${where}: the step's offer line is shown`);
  const expected = offerForSave(zonedDate(now, saveConfig.send_time_zone), offers).label;
  assert.equal(label.textContent, expected, `${where}: the step's line is offerForSave's label`);
  assert.equal(page.el("save-offer-label").textContent, expected, `${where}: the box at the top shows the same`);
  assert.equal(label.children.length, 0, `${where}: written as text, never as markup`);
  const read = readingOrder(page.document.body);
  const lead = page.document.querySelector("#save .save-lead");
  assert.ok(read.indexOf(lead) > 0, `${where}: the save lead is read`);
  assert.equal(read[read.indexOf(lead) - 1], label, `${where}: the offer's line is read directly before "Not ready today? Save it"`);
  return label.textContent;
}

/** The declarations of the page's one CSS rule whose selector list names `selector` exactly, as a property -> value map. */
export function ruleOf(html, selector) {
  const { document } = parseHTML(html);
  const css = [...document.querySelectorAll("style")].map((s) => s.textContent).join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
  const found = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, selectors]) => selectors.split(",").some((s) => s.trim() === selector));
  assert.equal(found.length, 1, `one rule names ${selector} (found ${found.length})`);
  return Object.fromEntries(
    found[0][2]
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => [d.slice(0, d.indexOf(":")).trim(), squash(d.slice(d.indexOf(":") + 1))]),
  );
}

/** SP2 in the markup: the step's two buttons are the quieter button, not `.cta`, and that class looks as See all plans
 *  does (every property a visitor sees, the same value). */
export function assertQuietButtons(html) {
  const { document } = parseHTML(html);
  for (const id of SAVE_BUTTONS) {
    const button = document.getElementById(id);
    assert.ok(button, `the page has #${id}`);
    assert.equal(button.classList.contains("cta"), false, `#${id} is not the --cta button`);
    assert.equal(button.classList.contains(QUIET_CLASS), true, `#${id} is the page's quieter button (.${QUIET_CLASS})`);
  }
  const quiet = ruleOf(html, `.${QUIET_CLASS}`);
  const reference = ruleOf(html, `.${QUIET_REFERENCE}`);
  for (const property of QUIET_PROPERTIES) {
    assert.ok(property in reference, `See all plans' rule sets ${property}`);
    assert.equal(quiet[property], reference[property], `.${QUIET_CLASS} ${property}: See all plans' (.${QUIET_REFERENCE})`);
  }
}

/** The `.cta` elements a visitor sees on `page`, by id (or the start of their markup). */
export const shownCtas = (page) =>
  [...page.document.querySelectorAll(".cta")].filter((n) => !hiddenInTree(n)).map((n) => n.id || n.getAttribute("data-plan") || n.outerHTML.slice(0, 60));

/** Submit the step's form with `email` and `zip`, as a visitor pressing Save my offer. */
export function submitSave(page, { email = "dummy-sp@example.com", zip }) {
  page.el("save-email").value = email;
  page.el("save-zip").value = zip;
  const event = page.document.createEvent("Event");
  event.initEvent("submit", true, true);
  page.el("save-form").dispatchEvent(event);
}
