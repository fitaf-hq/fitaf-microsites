// SO1–SO3 (SPEC-rung2-progress-and-checkout § 35), on the synthetic order page (linkedom: the SHIPPED text, as the other
// rung 2 cases run it): the structure the block builds for *Save my offer* and the rule that shows it at step 3 alone.
// What a browser draws (displayed or not at each step, the link's box against the pay button and the card field: SO4)
// is measured in Chrome by the watch package's r2-z35-save; linkedom does no layout and no :has(), so here the window
// answers CSS.supports() as a browser with :has() does, and the step rule is read from the block's own style.
//   SO1  at done the block's foot (#fitaf-nav) holds one a#fitaf-save, its words data/messages.json's handoff.save (no
//        phrase in the source), href https://eatfitaf.com/#save, target _blank, rel noopener, right before § 33's
//        a#fitaf-help (the line above it). No foot (a browser without :has(), no steps): no save link, the contact link
//        still made.
//   SO2  the style hides #fitaf-save at steps 1 and 2 by exactly one step selector of its display:none rule,
//        `:is(.fitaf-step-1,.fitaf-step-2):has(#fitaf-nav) #fitaf-save`, and nothing else names it (so step 3 shows it).
//   SO3  the block's own Continue twice (step 3), Back (step 2), Continue (step 3), then the store's summary drawn again:
//        one link throughout.
// Mutants: the link shown in every step (the step rule taken out: SO2 fails); added twice (SO3 fails).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { MESSAGES_PATH } from "../build.mjs";
import { STOREFRONT_SOURCE } from "../scripts/build-storefront.mjs";
import { CHECKOUT_PAYLOAD, fakeWindow, fragmentFor, LOG_PREFIX, orderPage, run, script } from "./r2-harness.mjs";

const SAVE = "https://eatfitaf.com/#save";
const DONE = `${LOG_PREFIX} done: /checkout`;
const STEP_RULE = ":is(.fitaf-step-1,.fitaf-step-2):has(#fitaf-nav) #fitaf-save";
const WORDS = JSON.parse(await readFile(MESSAGES_PATH, "utf8")).handoff ?? {};

/** A mutant of `text`: `from` replaced by `to`, exactly once, or refused (it would test nothing). */
function mutate(text, from, to) {
  const n = text.split(from).length - 1;
  if (n !== 1) throw new Error(`mutant: expected ${JSON.stringify(from)} once in the text, found it ${n} times`);
  return text.replace(from, to);
}

/**
 * The text run to done on a link, the store's checkout drawn at its route (an app-checkout: the payment section with a
 * card field, the form's pay button, the summary and its Total), in a window that answers CSS.supports() as `has` says
 * and carries the few members the block's steps use (scrollTo, addEventListener, innerHeight, a MutationObserver that
 * observes nothing: linkedom's is per document).
 */
async function toDone(text, { has = true } = {}) {
  const page = await orderPage();
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  Object.assign(h.window, {
    CSS: { supports: () => has },
    scrollTo() {},
    addEventListener() {},
    innerHeight: 844,
    MutationObserver: class {
      observe() {}
    },
  });
  const pushState = h.window.history.pushState;
  h.window.history.pushState = (...args) => {
    pushState(...args);
    if (h.url.pathname !== "/checkout") return;
    const c = page.document.createElement("app-checkout");
    c.innerHTML =
      '<div class="checkout"><form class="checkout__form"><section class="checkout__section payment"><iframe title="Card number"></iframe></section>' +
      '<div class="checkout__submit"><button type="button">Place order</button></div></form>' +
      '<aside class="checkout__summary"><div class="summary__row"><span>Subtotal</span><span>$87.50</span></div>' +
      '<div class="summary__total"><span>Total</span><span>$87.50</span></div></aside></div>';
    page.document.body.appendChild(c);
  };
  run(text, h.window);
  h.timers.drain();
  assert.ok(h.info.includes(DONE), JSON.stringify(h.info.filter((l) => l.startsWith(LOG_PREFIX))));
  return { h, doc: page.document };
}

const saves = (doc) => doc.querySelectorAll("#fitaf-save").length;

test("SO1: the foot holds one save link — its words, href, target and rel — right before the contact link", async () => {
  assert.equal(typeof WORDS.save, "string", "data/messages.json handoff.save");
  const source = await readFile(STOREFRONT_SOURCE, "utf8");
  assert.ok(!source.includes(WORDS.save), "no phrase in the source: the words are data/messages.json's");
  const text = await script();
  assert.ok(text.includes(JSON.stringify(WORDS.save)), "the built text carries the words");
  const { doc } = await toDone(text);
  const nav = doc.getElementById("fitaf-nav");
  assert.ok(nav, "fixture control: the steps drawn, their foot on the page");
  assert.equal(saves(doc), 1, "one save link");
  const a = doc.getElementById("fitaf-save");
  assert.equal(a.localName, "a", "a link, never a button");
  assert.equal(a.textContent, WORDS.save);
  assert.equal(a.getAttribute("href"), SAVE);
  assert.equal(a.getAttribute("target"), "_blank");
  assert.equal(a.getAttribute("rel"), "noopener");
  assert.equal(a.parentElement, nav, "in the block's own foot");
  assert.equal(a.nextElementSibling?.id, "fitaf-help", "right before the contact link: the line above it");
});

test("SO1: no foot (a browser without :has(), no steps) — no save link; the contact link still made", async () => {
  const { doc } = await toDone(await script(), { has: false });
  assert.equal(doc.getElementById("fitaf-nav"), null, "fixture control: no steps drawn");
  assert.equal(saves(doc), 0, "no save link without the steps");
  assert.equal(doc.querySelectorAll("#fitaf-help").length, 1, "the contact link, as § 33 places it");
});

/** The block's style's display:none rule split into its top-level selectors (the `:is(...)` after its scope). */
function hideParts(css) {
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1], m[2]]);
  return rules.map(([sel, body]) => {
    const head = "html.fitaf-deep:has(app-checkout) :is(";
    const parts = [];
    if (sel.startsWith(head) && sel.endsWith(")")) {
      const inner = sel.slice(head.length, -1);
      let depth = 0;
      let start = 0;
      for (let i = 0; i < inner.length; i++) {
        if (inner[i] === "(") depth++;
        else if (inner[i] === ")") depth--;
        else if (inner[i] === "," && depth === 0) {
          parts.push(inner.slice(start, i));
          start = i + 1;
        }
      }
      parts.push(inner.slice(start));
    } else parts.push(sel);
    return { sel, body, parts };
  });
}

/** SO2 over `text`: one step selector of the display:none rule names #fitaf-save, and no other rule names it. */
async function stepRule(text) {
  const { doc } = await toDone(text);
  const css = doc.getElementById("fitaf-deep")?.textContent ?? "";
  assert.ok(css.length > 0, "fixture control: the block's style on the page");
  const rules = hideParts(css).filter((r) => r.sel.includes("#fitaf-save"));
  assert.equal(rules.length, 1, `one rule names the save link: ${JSON.stringify(rules.map((r) => r.sel.slice(-200)))}`);
  assert.match(rules[0].body, /^display:none!important;?$/, "a rule that hides");
  assert.deepEqual(rules[0].parts.filter((p) => p.includes("#fitaf-save")), [STEP_RULE], "hidden at steps 1 and 2 alone (so step 3 shows it)");
}

test("SO2: the style hides the save link at steps 1 and 2 alone, by one step selector", async () => {
  await stepRule(await script());
});

test("SO2 (mutant): the link shown in every step — SO2 fails", async () => {
  await assert.rejects(stepRule(mutate(await script(), `${STEP_RULE},`, "")), assert.AssertionError);
});

/** SO3 over `text`: one link through Continue, Continue, Back, Continue and the summary drawn again. */
async function oneLink(text) {
  const { h, doc } = await toDone(text);
  const html = doc.documentElement;
  const step = () => [1, 2, 3].filter((n) => html.classList.contains(`fitaf-step-${n}`));
  const click = (id) => {
    const b = doc.getElementById(id);
    assert.ok(b, `fixture control: the block's ${id}`);
    b.onclick();
    h.timers.drain();
  };
  assert.deepEqual(step(), [1], "fixture control: step 1 at done");
  assert.equal(saves(doc), 1, "one at step 1");
  for (const [id, to] of [["fitaf-go", 2], ["fitaf-go", 3], ["fitaf-back", 2], ["fitaf-go", 3]]) {
    click(id);
    assert.deepEqual(step(), [to], `fixture control: ${id} shows step ${to}`);
    assert.equal(saves(doc), 1, `one at step ${to}`);
  }
  const summary = doc.querySelector(".checkout__summary");
  summary.innerHTML = `${summary.innerHTML}`;
  assert.equal(saves(doc), 1, "one after the store's summary is drawn again");
}

test("SO3: Continue, Continue, Back, Continue and a re-render leave one link", async () => {
  await oneLink(await script());
});

test("SO3 (mutant): the link added twice — SO3 fails", async () => {
  await assert.rejects(oneLink(mutate(await script(), "ui(save);", "ui(save); ui(save);")), assert.AssertionError);
});
