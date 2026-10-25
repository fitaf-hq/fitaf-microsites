// UQ3 (SPEC-ui-and-copy-pass.md § 2 item 3, until its item 7's Family flow is built, § 2.2): choosing Family shows today's
// Family section (familySection: its name, its promise, its price and its door; and since § 2.1, the Advisor through the
// orchestrator, 2026-10-25, a line of its own saying it serves a family of 3–4, from data/plans.json's `servings`, in
// place of the promise line's "· serves 3–4") in place, directly below the question, and
// hides the four meal questions, the goal and the individual result (and with them the save step and the calculator,
// which are the individual plan's); See all plans hides, as it did on the Family tab. Choosing Individual brings them back
// with every answer kept: the same fragment, the same answers pressed, the same card and links. Both builds, the page
// run as a browser runs it. ⬜ Family's own questions (item 7, ruled 2026-10-25) are § 2.2's contract, not built here.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { card, hiddenInTree, MESSAGES, PLANS } from "./cc-harness.mjs";
import { open, pageOf, plansCopy, questionsOf, resultOf } from "./ms-harness.mjs";
import { choose, pages, readAfter, SERVES, whoOf } from "./uq-harness.mjs";

const { production, development } = await pages();
const BUILDS = { production, development };
const money = (cents) => `$${(cents / 100).toFixed(2)}`;
/** The individual plan's parts Family hides: the four meal questions, the goal, the result (and the step, the calculator). */
const INDIVIDUAL = ["q-lunch_dinner", "q-weekends", "q-breakfast", "q-snacks", "q-goal", "result"];
const cardOf = (page) => {
  const { tiles, ...rest } = card(page);
  return { ...rest, tiles: tiles.length };
};
const shown = (page, id) => !hiddenInTree(page.el(id));

/** What the Family section shows, read off the page: today's familySection, from data/plans.json's `family`. */
function assertFamilySection(page, where) {
  const section = page.el("panel-family");
  assert.equal(hiddenInTree(section), false, `${where}: the Family section is shown`);
  const fc = section.querySelector(".family-card");
  const f = PLANS.family;
  const cell = f.counts[0];
  assert.equal(fc?.querySelector("h2")?.textContent, f.name, `${where}: its name`);
  assert.deepEqual([...fc.children].filter((c) => c.localName === "p").map((p) => p.textContent.replace(/\s+/g, " ").trim()), [f.promise, SERVES(f.servings)], `${where}: its promise, then the family it serves`);
  assert.deepEqual([...fc.querySelectorAll(".figures dd")].map((d) => d.textContent), [money(cell.price_per_meal_cents), money(cell.price_per_meal_cents * cell.meals_per_week)], `${where}: its price`);
  assert.equal(fc.querySelector("a.cta").getAttribute("href"), `${PLANS.order_base_url}?mpid=${cell.mpid}`, `${where}: its door`);
  // In place below the question: the first thing read after the question is the Family section's.
  const next = readAfter(page, page.el("who"));
  assert.ok(next && section.contains(next), `${where}: the Family section directly below the question (read next: ${next?.localName}#${next?.id} "${next?.textContent.trim().slice(0, 40)}")`);
}

test("UQ3: Family shows the Family section below the question and hides the meal questions, the goal and the result", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    for (const how of ["opened at #family", "pressed"]) {
      const page = how === "pressed" ? open(html, "#lean-and-5d-b") : open(html, "#family");
      if (how === "pressed") choose(page, "family");
      const where = `${build}, ${how}`;
      assert.deepEqual(whoOf(page).pressed, ["family"], `${where}: Family pressed`);
      assertFamilySection(page, where);
      for (const id of INDIVIDUAL) assert.equal(shown(page, id), false, `${where}: #${id} hidden`);
      assert.equal(shown(page, "all-link"), false, `${where}: See all plans hidden, as on the Family tab`);
      if (page.document.getElementById("save")) assert.equal(shown(page, "save"), false, `${where}: no save step`);
      if (page.document.getElementById("share")) assert.equal(shown(page, "share"), false, `${where}: no calculator`);
    }
  }
});

test("UQ3: Individual brings every answer back, kept: the fragment, the answers, the result and the card", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = open(html, "#lean-and-5d-b");
    const before = { hash: page.hash(), questions: questionsOf(page), result: resultOf(page), card: cardOf(page) };
    assert.equal(before.result.shown, true, `${build}: control: the result is shown`);
    assert.ok(before.card.checkout, `${build}: control: the fixture week's cart`);
    choose(page, "family");
    choose(page, "individual");
    assert.deepEqual(whoOf(page).pressed, ["individual"], `${build}: Individual pressed`);
    assert.deepEqual({ hash: page.hash(), questions: questionsOf(page), result: resultOf(page), card: cardOf(page) }, before, `${build}: as left`);
    for (const id of INDIVIDUAL) assert.equal(shown(page, id), true, `${build}: #${id} shown again`);
    assert.equal(shown(page, "panel-family"), false, `${build}: the Family section hidden`);
    assert.equal(shown(page, "all-link"), true, `${build}: See all plans back`);
  }
});

test("UQ3: the family line is data/messages.json's (plan_page.family_serves), its numbers data/plans.json's servings; a missing phrase refuses the build", async () => {
  const phrase = MESSAGES.plan_page.family_serves;
  assert.equal(typeof phrase, "string", "fixture control: the phrase is committed");
  assert.ok(phrase.includes("{min}") && phrase.includes("{max}"), "its two placeholders");
  const other = await plansCopy((p) => (p.family.servings = { min: 2, max: 5 }));
  try {
    const page = open(await pageOf({ plansPath: other.path }), "#family");
    const lines = [...page.el("panel-family").querySelectorAll(".family-card p")].map((p) => p.textContent.trim());
    assert.ok(lines.includes(SERVES({ min: 2, max: 5 })), `the line follows the servings: ${JSON.stringify(lines)}`);
  } finally {
    await other.done();
  }
  for (const broken of [undefined, phrase.replace("{max}", "")]) {
    const messages = structuredClone(MESSAGES);
    if (broken === undefined) delete messages.plan_page.family_serves;
    else messages.plan_page.family_serves = broken;
    const dir = await mkdtemp(join(tmpdir(), "boston-uq3-"));
    try {
      await writeFile(join(dir, "messages.json"), JSON.stringify(messages, null, 2));
      await assert.rejects(pageOf({ messagesPath: join(dir, "messages.json") }), /data\/messages\.json: plan_page\.family_serves/, broken === undefined ? "missing" : "without {max}");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
});
