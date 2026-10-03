// R2-78a and R2-79a (SPEC-rung2-progress-and-checkout § 19 items 1 and 3), on the style's text as fill B sets it at done
// (the shipped text, run on the synthetic order page): the new H rules hide each order line's price (H11,
// .summary__item-price), its portion tag (H12, .summary__item-addons: the line's add-on pills, where the store shows a
// portion), its quantity control (H13, .summary__item-quantity-controls) and its remove control (H14,
// .summary__item-remove), and the plan's total row (H15, .summary__plan-total), each by display:none, scoped to the
// deep-carted checkout; and never the line itself, its photograph (.summary__item-image) or its name
// (.summary__item-name), nor the order's Total (.summary__total, H9's rule unchanged). Each name is in
// storefront/dependencies.json (F2). What is DISPLAYED on a checkout is proven in Chrome (the watch package's R2-78,
// R2-79 and R2-80).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { CHECKOUT_PAYLOAD, fakeWindow, fragmentFor, orderPage, run, script } from "./r2-harness.mjs";
import { deepState } from "./r2-screen.mjs";

const SCOPE = "html.fitaf-deep:has(app-checkout) ";
const H = { H11: "summary__item-price", H12: "summary__item-addons", H13: "summary__item-quantity-controls", H14: "summary__item-remove", H15: "summary__plan-total" };
const KEPT = ["summary__item", "summary__item-image", "summary__item-name", "summary__total"];

/** The style's text at done, and its hiding rules' selector lists (all of them scoped, R2-42b). */
async function hidingSelectors() {
  const page = await orderPage();
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  run(await script(), h.window);
  h.timers.drain();
  const { css } = deepState(page.document);
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => [sel.trim(), body.replace(/\s+/g, "")]);
  return rules.filter(([, body]) => /^display:none!important;?$/.test(body)).map(([sel]) => sel);
}
/** Does a selector list name the class `name` as a class of its own (not a prefix of a longer one)? */
const names = (list, name) => new RegExp(`\\.${name.replace(/[-_]/g, (c) => `\\${c}`)}(?![\\w-])`).test(list);

/**
 * § 25 (the three-step checkout): the one hide rule also carries the step selectors, each beginning with a step class
 * (`.fitaf-step-N`, or `:is(.fitaf-step-2,.fitaf-step-3)`) and the block's own foot (`:has(#fitaf-nav)`), which hide
 * the order lines in steps 2 and 3 by design (§ 25.2; R2-84 and R2-85 show them displayed at step 1, in Chrome). They
 * are taken out of the list before the "never hidden" check, which holds for every other selector; and the lines' one
 * step selector is pinned to steps 2 and 3.
 */
function stepParts(list) {
  const head = `${SCOPE}:is(`;
  if (!list.startsWith(head) || !list.endsWith(")")) return { rest: list, steps: [] };
  const inner = list.slice(head.length, -1);
  const parts = [];
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
  const isStep = (s) => /^(:is\()?\.fitaf-step-\d/.test(s.trim());
  return { rest: `${head}${parts.filter((s) => !isStep(s)).join(",")})`, steps: parts.filter(isStep) };
}


test("R2-78a: the style hides each line's price, portion, quantity and remove (H11–H14), never the line, its photograph or its name", async () => {
  const hiding = await hidingSelectors();
  for (const id of ["H11", "H12", "H13", "H14"]) {
    assert.ok(hiding.some((list) => list.startsWith(SCOPE) && names(list, H[id])), `${id}: .${H[id]} hidden on the deep-carted checkout`);
  }
  const lineSteps = hiding.flatMap((list) => stepParts(list).steps).filter((s) => names(s.replace(/:has\([^)]*\)|:not\([^)]*\)/g, ""), "summary__item"));
  assert.deepEqual(lineSteps, [":is(.fitaf-step-2,.fitaf-step-3):has(#fitaf-nav) .summary__item"], "§ 25: the lines hidden in steps 2 and 3 only, by one step selector");
  for (const name of KEPT) assert.ok(!hiding.some((list) => names(stepParts(list).rest.replace(/:has\([^)]*\)|:not\([^)]*\)/g, ""), name)), `.${name} never hidden (but by § 25's step selectors)`);
});

test("R2-79a: the style hides the plan's total row (H15); the order's Total stays (H9's rule unchanged)", async () => {
  const hiding = await hidingSelectors();
  assert.ok(hiding.some((list) => list.startsWith(SCOPE) && names(list, H.H15)), "H15: .summary__plan-total hidden");
  assert.ok(hiding.some((list) => list.includes(".summary__row:not(.summary__row--discount,:has(.summary__total))")), "H9 as it was");
});

test("R2-78a/R2-79a: F2 carries each new H rule's name, and the line's photograph and name", async () => {
  const deps = JSON.parse(await readFile(join(ROOT, "storefront", "dependencies.json"), "utf8"));
  const literals = deps.literals.map((d) => d.literal);
  for (const name of [...Object.values(H), "summary__item-image", "summary__item-name"]) {
    assert.ok(literals.includes(`"${name}"`), `storefront/dependencies.json names "${name}"`);
  }
});
