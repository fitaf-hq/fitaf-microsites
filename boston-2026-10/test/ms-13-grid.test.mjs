// MS-13 (SPEC-meal-selection.md § 8 item 1, § 8.1): the grid. *See all plans* (the dialog and its 3 × 2 grid) is
// byte-identical to the page before the meal selection, its heads still "7 meals / Lunch or dinner" (`shown_counts` stays,
// § 8 item 1); so is the Family panel (§ 0). The "before" is test/ms-golden.json, recorded at 985f777. Read from the
// production page without picks, the production page with a week open, and the development page.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { devPage } from "./dev-page.mjs";
import { pageOf, V1_DIR, V2_DIR } from "./ms-harness.mjs";
import { existsSync } from "node:fs";

const golden = JSON.parse(await readFile(new URL("./ms-golden.json", import.meta.url), "utf8"));
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const part = (html, from, to) => {
  const at = html.indexOf(from);
  assert.ok(at >= 0, `the page has ${from}`);
  return html.slice(at, html.indexOf(to, at) + to.length);
};

test("MS-13: See all plans and the Family panel are byte-identical to the page before; the heads are today's", async () => {
  const pages = {
    "production, no picks": await pageOf(),
    "production, a version-1 week": await pageOf({ picks: V1_DIR }),
    ...(existsSync(V2_DIR) ? { "production, a version-2 week": await pageOf({ picks: V2_DIR }) } : {}),
    development: await devPage(),
  };
  for (const [label, html] of Object.entries(pages)) {
    const dialog = part(html, '<dialog class="all" id="all"', "</dialog>");
    assert.deepEqual([sha(dialog), Buffer.byteLength(dialog)], [golden.grid.dialog_sha256, golden.grid.dialog_bytes], `${label}: the dialog`);
    const heads = [...dialog.matchAll(/<th scope="col">([\s\S]*?)<\/th>/g)].map((m) => m[1]);
    assert.deepEqual(heads, ["7 meals<br>Lunch or dinner", "14 meals<br>Lunch and dinner"], `${label}: the heads`);
    const family = part(html, '<section class="panel" id="panel-family"', "</section>");
    assert.deepEqual([sha(family), Buffer.byteLength(family)], [golden.grid.family_sha256, golden.grid.family_bytes], `${label}: the Family panel`);
  }
});
