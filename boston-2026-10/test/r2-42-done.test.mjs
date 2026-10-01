// R2-42 (SPEC-rung2-progress-and-checkout § 2 item 4, § 3 items 1–3): at `done`, fill B puts the class `fitaf-deep` on
// <html> and adds ONE <style id="fitaf-deep"> (in <head>), and the screen goes, AFTER the mark and the style are set, so
// the first thing the visitor sees is the stripped checkout. The order is read from the document's own mutation
// records, and at the done line itself. The style's text is pinned to § 3's form: every rule is written
// `html.fitaf-deep:has(app-checkout) …`, and it hides (display: none !important), nothing else. What it hides on a
// checkout is proven in Chrome (the watch package, R2-45 … R2-51).
import test from "node:test";
import assert from "node:assert/strict";
import { assertCheckedOut, CHECKOUT_PAYLOAD, fakeWindow, fragmentFor, orderPage, run, script, untouchableStorage } from "./r2-harness.mjs";
import { DEEP, deepState, SCREEN_ID, screenOf, watchLines, watchMutations } from "./r2-screen.mjs";

/** Split a style sheet's text into its rules: [selector list, declarations]. The hide style has no nested blocks. */
function rules(css) {
  return [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => [sel.trim(), body.trim()]);
}

/** A selector list split at its top-level commas (not those inside :is(), :has() or :not()). */
function selectors(list) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i] === "(") depth++;
    else if (list[i] === ")") depth--;
    else if (list[i] === "," && depth === 0) {
      out.push(list.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(list.slice(start).trim());
  return out;
}

test("R2-42: done — html.fitaf-deep, one style#fitaf-deep in <head>, the screen gone, the style set before the screen went", async () => {
  const page = await orderPage();
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page, storage: untouchableStorage() });
  const mutations = watchMutations(page.document);
  const lines = watchLines(h, page.document);
  run(await script(), h.window);
  h.timers.drain();
  assertCheckedOut(h, page, "/order?mpid=21");

  const done = lines.find((l) => l.line === "[fitaf-handoff] done: /checkout");
  assert.ok(done, JSON.stringify(lines));
  assert.equal(done.screen, false, "the screen is gone when done is logged");
  assert.equal(done.style, true, "the style is set when done is logged");
  const state = deepState(page.document);
  assert.equal(state.mark, true, "html.fitaf-deep");
  assert.equal(state.styles, 1, "exactly one style#fitaf-deep");
  assert.equal(state.inHead, true, "in <head>");
  assert.equal(screenOf(page.document), null);

  const events = await mutations.settle();
  const at = (e) => events.findIndex((x) => x[0] === e[0] && x[1] === e[1]);
  const shown = at(["added", SCREEN_ID]);
  const style = at(["added", DEEP]);
  const mark = events.findIndex((x) => x[0] === "class" && x[1].split(/\s+/).includes(DEEP));
  const gone = at(["removed", SCREEN_ID]);
  assert.ok(shown >= 0 && style >= 0 && mark >= 0 && gone >= 0, JSON.stringify(events));
  assert.ok(shown < style && style < gone, `the style before the screen went: ${JSON.stringify(events)}`);
  assert.ok(mark < gone, `the mark before the screen went: ${JSON.stringify(events)}`);
  assert.equal(events.filter((x) => x[0] === "added" && x[1] === SCREEN_ID).length, 1, "one screen, once");
});

/**
 * § 10 item 3: the one rule that does not hide. The app banner's library reserves a top margin on <html> itself (inline,
 * its original kept in data-smartbanner-original-margin-top); it is undone with the banner, on the checkout only.
 */
const BANNER_MARGIN = ["html.fitaf-deep:has(app-checkout)[data-smartbanner-original-margin-top]", "margin-top:0!important"];

/**
 * § 19 item 2: the order lines made COMPACT (each line's photograph about 48 px beside its name, the spacing tight, so 14
 * lines fit one 390 x 844 screen): the only other rules that do not hide, each on one of the store's line elements and
 * setting only size, spacing, alignment and the name's two-line clamp. R2-80 (Chrome, the watch package) measures them.
 */
const COMPACT = [".summary__item", ".summary__item-image", ".summary__item-name"].map((c) => `html.fitaf-deep:has(app-checkout) ${c}`);
const COMPACT_PROPERTIES = new Set(["padding", "margin", "margin-bottom", "gap", "align-items", "width", "height", "min-height", "font-size", "line-height", "display", "-webkit-line-clamp", "-webkit-box-orient", "overflow"]);

test("R2-42b: the style — every rule scoped `html.fitaf-deep:has(app-checkout) …`, and it only hides (but the banner's margin and § 19's compact lines)", async () => {
  const page = await orderPage();
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  run(await script(), h.window);
  h.timers.drain();
  const { css } = deepState(page.document);
  const all = rules(css);
  assert.ok(all.length > 0, `a rule: ${css}`);
  const margin = all.filter(([list]) => list === BANNER_MARGIN[0]);
  assert.equal(margin.length, 1, "§ 10 item 3: exactly one rule for the banner's reserved margin");
  assert.equal(margin[0][1].replace(/\s+/g, "").replace(/;$/, ""), BANNER_MARGIN[1], "and it only sets the margin back");
  const compact = all.filter(([list]) => COMPACT.includes(list));
  assert.deepEqual(compact.map(([list]) => list).sort(), [...COMPACT].sort(), "§ 19 item 2: one compact rule for each line element");
  for (const [list, body] of compact) {
    const props = body.split(";").map((d) => d.split(":")[0].trim()).filter(Boolean);
    assert.deepEqual(props.filter((p) => !COMPACT_PROPERTIES.has(p)), [], `${list}: size, spacing and the clamp only: ${body}`);
    assert.doesNotMatch(body.replace(/\s+/g, ""), /display:none/, `${list}: never hidden`);
  }
  for (const [list, body] of all.filter(([l]) => l !== BANNER_MARGIN[0] && !COMPACT.includes(l))) {
    for (const sel of selectors(list)) assert.ok(sel.startsWith("html.fitaf-deep:has(app-checkout) "), `scoped: ${sel}`);
    assert.match(body.replace(/\s+/g, ""), /^display:none!important;?$/, `hiding only: ${body}`);
  }
  assert.doesNotMatch(css, /@import|url\(|@font-face/, "the style loads nothing");
});
