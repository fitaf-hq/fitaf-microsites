// UC16 (SPEC-ui-and-copy-pass.md § 5 item 7, the Advisor 2026-10-26: "Add meal descriptions to the compact/closed
// representation of the meals."): a new optional `description` per meal in the picks file's `meals` map, shown under the
// meal's name in its closed row when the week carries one, in the muted line style; with none, the row as today; a blank
// one refused by the content's check. ⚠ No committed week carries one, so the two-menu fixture week is copied with
// invented descriptions for this case (never committed as data), on both builds that carry the card.
import test from "node:test";
import assert from "node:assert/strict";
import { hiddenInTree } from "./cc-harness.mjs";
import { BOTH, fixtureWords, menusPage, messagesFile, MENUS, MENUS_WEEK, openMenus, picksCopy } from "./em-harness.mjs";
import { weekData } from "../scripts/week-content.mjs";

const KEY = BOTH[0];
const HASH = `#lean-${KEY}`;
const words = (n) => n.textContent.replace(/\s+/g, " ").trim();
/** The fixture week with an invented description on the first two meals of its `meals` map (the case's own words). */
const NAMED = Object.keys(MENUS.meals).slice(0, 2);
const described = (text) => {
  const week = structuredClone(MENUS);
  NAMED.forEach((name, i) => (week.meals[name].description = text ?? `Fixture description ${i + 1}.`));
  return week;
};
/** The rows of the card's list: each meal's name and its description (null: none). */
const rows = (page) =>
  [...page.document.querySelectorAll("#cc-meals li")].map((li) => {
    const desc = li.querySelector(".cc-desc");
    return { name: words(li.querySelector(".cc-name")), desc: desc && !hiddenInTree(desc) ? words(desc) : null };
  });

test("UC16: a description the week carries is shown under its meal's name; the others none (§ 5 item 7)", async () => {
  const copy = await picksCopy(described());
  try {
    for (const target of ["prod", "dev"]) {
      const page = openMenus(await menusPage({ target, picks: copy.dir }), HASH);
      const read = rows(page);
      // A meal's row shows its display name (a cart item's `display`, by its `name`).
      const display = Object.fromEntries(Object.values(MENUS.lists).flatMap((l) => l.carts.flatMap((c) => c.items.map((m) => [m.name, m.display.replace(/\s+/g, " ").trim()]))));
      const byName = Object.fromEntries(NAMED.map((name, i) => [display[name], `Fixture description ${i + 1}.`]));
      const shownWith = read.filter((r) => r.desc);
      assert.ok(shownWith.length > 0, `${target}: control: a described meal is in the list at ${HASH}`);
      for (const r of read) {
        const name = Object.keys(byName).find((n) => r.name.startsWith(n));
        assert.equal(r.desc, name ? byName[name] : null, `${target}: ${r.name}: its description ${name ? "shown" : "none"}`);
      }
      const desc = page.document.querySelector("#cc-meals .cc-desc");
      const li = desc.closest("li");
      const all = [...li.querySelectorAll("*")];
      assert.ok(all.indexOf(desc) > all.indexOf(li.querySelector(".cc-name")), `${target}: under the name`);
    }
  } finally {
    await copy.done();
  }
});

test("UC16: without descriptions the rows are as today — no .cc-desc (§ 5 item 7)", async () => {
  for (const target of ["prod", "dev"]) {
    const page = openMenus(await menusPage({ target }), HASH);
    assert.equal(page.document.querySelectorAll(".cc-desc").length, 0, `${target}: none`);
  }
});

test("UC16: the content refuses a blank description (§ 5 item 7)", async () => {
  const copy = await picksCopy(described("   "));
  const words = await messagesFile(fixtureWords());
  try {
    await assert.rejects(weekData({ picksDir: copy.dir, week: MENUS_WEEK, messagesPath: words.path }), /description is blank/);
  } finally {
    await copy.done();
    await words.done();
  }
});

test("UC16: the muted line style, two lines at most (§ 5 item 7)", async () => {
  const page = openMenus(await menusPage(), HASH);
  const css = [...page.document.querySelectorAll("style")].map((s) => s.textContent).join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
  const body = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, sel]) => sel.split(",").some((s) => s.trim() === ".cc-desc")).map(([, , b]) => b).join(";");
  assert.match(body, /color:\s*var\(--muted\)/, "muted");
  assert.match(body, /font-size:\s*14px/, "14 px");
  assert.match(body, /-webkit-line-clamp:\s*2/, "two lines at most");
});
