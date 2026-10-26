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
import { PLANS } from "./cc-harness.mjs";

const golden = JSON.parse(await readFile(new URL("./ms-golden.json", import.meta.url), "utf8"));
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const part = (html, from, to) => {
  const at = html.indexOf(from);
  assert.ok(at >= 0, `the page has ${from}`);
  return html.slice(at, html.indexOf(to, at) + to.length);
};

// ⚠ AMENDED again by SPEC-ui-and-copy-pass § 2.2 (2026-10-25, Family's own question): the Family panel is § 2.2's (its
// price moved into the result card, its question added: UF1–UF3), so only its card's name, promise and line are held
// here, as § 2 left them; the grid as before.
// ⚠ AMENDED by SPEC-ui-and-copy-pass § 2 (2026-10-25): the Family panel is no longer a tab panel (item 2: the tabs are the
// first question), and its promise line's "· serves 3–4" is a line of its own (§ 2.1, the Advisor: "Somewhere we should
// say that Family … serves a typical family of 3-4 people"). The panel is the page before with exactly those two changes
// undone, byte for byte; each must be found once (since § 2.2, the first of the two changes and the card's lines are held).
const f = PLANS.family;
const FAMILY_CHANGES = [
  ['<section class="panel" id="panel-family" hidden>', '<section class="panel" id="panel-family" role="tabpanel" aria-labelledby="tab-family" hidden>'],
  [
    `<p>${f.promise}</p>\n      <p>Serves a family of ${f.servings.min}–${f.servings.max}.</p>`,
    `<p>${f.promise} &middot; serves ${f.servings.min}–${f.servings.max}</p>`,
  ],
];

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
    assert.ok(family.startsWith(FAMILY_CHANGES[0][0]), `${label}: the Family panel, no tab panel`);
    assert.ok(family.includes(`<h2>${f.name}</h2>\n      ${FAMILY_CHANGES[1][0]}`), `${label}: the Family card's name, promise and line, as § 2 made them`);
  }
});
