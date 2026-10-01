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

test("R2-81a: the style hides the plan group's header and its return link (H16, H17); never the lines, the group or the Total", async () => {
  const hiding = await hidingSelectors();
  for (const [id, name] of Object.entries(H)) {
    assert.ok(hiding.some((list) => list.startsWith(SCOPE) && names(list, name)), `${id}: .${name} hidden on the deep-carted checkout`);
  }
  for (const name of KEPT) assert.ok(!hiding.some((list) => names(list.replace(/:has\([^)]*\)|:not\([^)]*\)/g, ""), name)), `.${name} never hidden`);
});

test("R2-81a: F2 carries both names", async () => {
  const deps = JSON.parse(await readFile(join(ROOT, "storefront", "dependencies.json"), "utf8"));
  const literals = deps.literals.map((d) => d.literal);
  for (const name of Object.values(H)) assert.ok(literals.includes(`"${name}"`), `storefront/dependencies.json names "${name}"`);
});
