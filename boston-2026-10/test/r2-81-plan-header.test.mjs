// R2-81a (SPEC-rung2-progress-and-checkout § 21), on the style's text as fill B sets it at done (the shipped text, run on
// the synthetic order page): the plan group's header (H16, .summary__plan-group-header: the plan's name, its "Remove
// plan" button and the chevron) and its return link (H17, .summary__plan-return) hidden by display:none, scoped to the
// deep-carted checkout; § 19's lines and the order's Total untouched; each name in storefront/dependencies.json (F2).
// What is DISPLAYED, deep-carted and on an ordinary visit, is proven in Chrome (the watch package's R2-81).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { CHECKOUT_PAYLOAD, fakeWindow, fragmentFor, orderPage, run, script } from "./r2-harness.mjs";
import { deepState } from "./r2-screen.mjs";

const SCOPE = "html.fitaf-deep:has(app-checkout) ";
const H = { H16: "summary__plan-group-header", H17: "summary__plan-return" };
const KEPT = ["summary__item", "summary__item-image", "summary__item-name", "summary__total", "summary__plan-group", "summary__items"];

async function hidingSelectors() {
  const page = await orderPage();
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  run(await script(), h.window);
  h.timers.drain();
  const { css } = deepState(page.document);
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => [sel.trim(), body.replace(/\s+/g, "")]);
  return rules.filter(([, body]) => /^display:none!important;?$/.test(body)).map(([sel]) => sel);
}
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


test("R2-81a: the style hides the plan group's header and its return link (H16, H17); never the lines, the group or the Total", async () => {
  const hiding = await hidingSelectors();
  for (const [id, name] of Object.entries(H)) {
    assert.ok(hiding.some((list) => list.startsWith(SCOPE) && names(list, name)), `${id}: .${name} hidden on the deep-carted checkout`);
  }
  const lineSteps = hiding.flatMap((list) => stepParts(list).steps).filter((s) => names(s.replace(/:has\([^)]*\)|:not\([^)]*\)/g, ""), "summary__item"));
  assert.deepEqual(lineSteps, [":is(.fitaf-step-2,.fitaf-step-3):has(#fitaf-nav) .summary__item"], "§ 25: the lines hidden in steps 2 and 3 only, by one step selector");
  for (const name of KEPT) assert.ok(!hiding.some((list) => names(stepParts(list).rest.replace(/:has\([^)]*\)|:not\([^)]*\)/g, ""), name)), `.${name} never hidden (but by § 25's step selectors)`);
});

test("R2-81a: F2 carries both names", async () => {
  const deps = JSON.parse(await readFile(join(ROOT, "storefront", "dependencies.json"), "utf8"));
  const literals = deps.literals.map((d) => d.literal);
  for (const name of Object.values(H)) assert.ok(literals.includes(`"${name}"`), `storefront/dependencies.json names "${name}"`);
});
