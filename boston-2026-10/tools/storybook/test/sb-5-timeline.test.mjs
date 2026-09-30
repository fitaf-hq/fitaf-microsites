// SB-5 (SPEC-storybook.md § 5): the Timeline story's times are rung 2 § 13a's table, in ONE data object that cites it
// (stories/timeline-data.js), so a new measurement changes one place. The table is read here from the contract itself,
// and every one of its times, at each of its four columns, must equal the object's; so must the unthrottled checkout
// wait § 13 records (4.1–4.5 s). The story's A, B and C durations are the object's.
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { CONTRACT, read, TOOL } from "./paths.mjs";

/** § 13a's table, read from the contract: each row's cells at the four columns, as numbers ([start, end] for "a → b"). */
async function table() {
  const text = await read(CONTRACT);
  const section = text.slice(text.indexOf("## 13a."), text.indexOf("## 14."));
  const rows = section.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| seconds") && !l.startsWith("|---"));
  const cell = (c) => (c.includes("→") ? c.split("→").map((x) => Number(x.trim())) : Number(c.trim()));
  const read4 = (label) => {
    const row = rows.find((r) => r.includes(label));
    assert.ok(row, `§ 13a has the row ${label}`);
    return row.split("|").slice(2, 6).map(cell);
  };
  const header = section.split("\n").find((l) => l.startsWith("| seconds")).split("|").slice(2, 6).map((c) => c.trim());
  const unthrottled = /CHECKOUT to `\/checkout` in\s+(\d\.\d)–(\d\.\d) s/.exec(text.slice(text.indexOf("## 13."), text.indexOf("## 13a.")));
  return {
    header,
    screen: read4("**A.**"),
    firstCard: read4("the first meal card exists"),
    meals: read4("**B.**"),
    checkout: read4("**C.**"),
    total: read4("the checkout's Total appears"),
    unthrottled: unthrottled ? [Number(unthrottled[1]), Number(unthrottled[2])] : null,
  };
}

test("SB-5: the timeline's data object is § 13a's table, column for column, and cites it", async () => {
  const t = await table();
  assert.deepEqual(t.header, ["Fast 4G 1280", "Fast 4G 390", "Slow 4G 1280", "Slow 4G 390"], "fixture control: § 13a's four columns");
  const { PROFILES, durations } = await import(pathToFileURL(join(TOOL, "stories", "timeline-data.js")).href);
  const measured = ["fast-1280", "fast-390", "slow-1280", "slow-390"];
  measured.forEach((id, i) => {
    const p = PROFILES[id];
    assert.ok(p, `the profile ${id}`);
    assert.match(p.source, /§ 13a/, `${id} cites § 13a`);
    assert.deepEqual(
      { screen: p.screen, firstCard: p.firstCard, meals: p.meals, checkout: p.checkout, total: p.total },
      { screen: t.screen[i], firstCard: t.firstCard[i], meals: t.meals[i], checkout: t.checkout[i], total: t.total[i] },
      `${id}: § 13a's times`,
    );
    const d = durations(p);
    assert.equal(d.a, Math.round((t.meals[i][0] - t.screen[i]) * 10) / 10, `${id}: A, the screen up before the first meal`);
    assert.equal(d.b, Math.round((t.meals[i][1] - t.meals[i][0]) * 10) / 10, `${id}: B, the meals`);
    assert.equal(d.c, Math.round((t.checkout[i][1] - t.checkout[i][0]) * 10) / 10, `${id}: C, CHECKOUT to /checkout`);
  });
  assert.deepEqual(t.unthrottled, [4.1, 4.5], "fixture control: § 13's unthrottled wait");
  assert.deepEqual(PROFILES.unthrottled.checkoutRange, t.unthrottled, "unthrottled: § 13's CHECKOUT to /checkout");
  assert.match(PROFILES.unthrottled.source, /§ 13\b/);
});
