// R2-94 (SPEC-rung2-progress-and-checkout § 37.2): the store's admin refused the paste of block 10833c1 with
// "Attribute values can't contain < or >": it reads `name = "value"` (or `name = 'value'`) in the block's text as an HTML
// attribute. Measured by the orchestrator on both shipped fragments with ATTRIBUTE below: 91b875e (pasted) had 0 such
// matches whose quoted value holds `<` or `>`, 10833c1 (refused) exactly 1, fitaf-struck.js's `var PLAIN = "…>…"`.
// So the Footer block and the console file hold none. (A selector string as a call's argument, as § 36's prices() had it,
// is what 91b875e's paste proved.) The control plants `var X = "a>b"` in the text and is caught.
import test from "node:test";
import assert from "node:assert/strict";
import { storefrontFiles } from "../scripts/build-storefront.mjs";

/** The orchestrator's measurement: an attribute-like `name = "value"` or `name = 'value'`. */
const ATTRIBUTE = /[\w\-:.]+\s*=\s*("[^"\n]*"|'[^'\n]*')/g;
/** The matches whose quoted value holds `<` or `>`: what the admin refuses. */
export const angled = (text) => [...text.matchAll(ATTRIBUTE)].filter((m) => /[<>]/.test(m[1])).map((m) => m[0]);

test("R2-94: the Footer block and the console file hold no attribute-like name = \"value\" with < or > in its value", async () => {
  const files = await storefrontFiles({ commit: "0000000" });
  assert.equal(files.length, 2, "fixture control: both files");
  for (const f of files) assert.deepEqual(angled(f.content), [], `${f.name}: no attribute value holding < or >`);
});

test("R2-94 control: a planted var X = \"a>b\" (and 'a<b') is caught", async () => {
  const [f] = await storefrontFiles({ commit: "0000000" });
  assert.deepEqual(angled(`${f.content}\nvar X = "a>b";\nvar Y='a<b';`).slice(-2), ['X = "a>b"', "Y='a<b'"]);
  assert.deepEqual(angled('d.querySelectorAll(".a>b")'), [], "a selector as a call's argument is not one");
});
