// UC8 (SPEC-ui-and-copy-pass.md § 1 item 8, the Advisor's note f-wrap: "I think we can make quantities greater than 1
// into a circled number overlayed on the top right corner of the meal image (much like an unread message count on an app
// icon)"): a quantity above 1 is a circled count on the meal's tile, not "× 2" in the line; a quantity of 1 shows nothing;
// the count stays in the row's accessible name (its words: the line as the content wrote it, the meal_qty phrase). Here
// the markup as run, on the week delivered 2026-11-01 (five menus; breakfasts twice in a weekday cart), both builds;
// where the badge and the chips are drawn, at 390 and 1280, is Storybook's (tools/storybook/test/uc-chrome.test.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { pageWithWeek, weekData } from "../scripts/week-content.mjs";
import { mealLine, MESSAGES, openPlanPage, pageWithPicks } from "./cc-harness.mjs";
import { devPage } from "./dev-page.mjs";
import { NOW } from "./uc-harness.mjs";

const WEEK = "2026-11-01";
/** Lunch or dinner on weekdays, with breakfast: the cart where the week's breakfasts come twice. */
const HASH = "#lean-or-5d-b";
const picks = JSON.parse(await readFile(join(ROOT, "data", "picks", `${WEEK}.json`), "utf8"));
const cart = picks.lists["chefs-choice"].carts.find((c) => c.lunch_dinner === "or" && !c.weekends && c.breakfast);
const pages = [
  ["the development page", pageWithWeek(await devPage({ card: true }), (await weekData({ week: WEEK, target: "dev" })).data)],
  ["the production page", (await pageWithPicks({ target: "prod", picks: join(ROOT, "data", "picks"), week: WEEK })).html],
];
const squash = (s) => s.replace(/\s+/g, " ").trim();

/** A node's text without what is visually hidden (.visually-hidden), as a sighted visitor reads it. */
function drawnText(node) {
  let out = "";
  for (const child of node.childNodes) {
    if (child.nodeType === 3) out += child.textContent;
    else if (child.nodeType === 1 && !child.classList.contains("visually-hidden")) out += drawnText(child);
  }
  return out;
}

/** Each meal row of the card at HASH: its words (the control's, when the row is a button: its name from its content;
 *  else the row's), its name as drawn, its badge and the words hidden. */
/** An element's words without a meal's description (`.cc-desc`, SPEC-ui-and-copy-pass § 5 item 7). */
function withoutDescription(el) {
  const copy = el.cloneNode(true);
  for (const d of copy.querySelectorAll(".cc-desc")) d.remove();
  return copy.textContent;
}

function rows(html) {
  const page = openPlanPage(html, { hash: HASH, now: NOW });
  assert.equal(page.el("cc-list").hasAttribute("hidden"), false, "control: the week's list is shown");
  return [...page.el("cc-meals").children].filter((n) => n.localName === "li").map((li) => {
    const badges = [...li.querySelectorAll(".cc-thumb .cc-qty")];
    const name = li.querySelector(".cc-name");
    return {
      // ⚠ AMENDED by SPEC-ui-and-copy-pass § 5 item 7 (2026-10-26, the week of 2026-11-01 now carrying descriptions): a
      // meal's description is read under its name, apart from its line.
      words: squash(withoutDescription(li.querySelector("button.cc-meal") ?? li)),
      drawn: squash(drawnText(name)),
      hidden: [...name.querySelectorAll(".visually-hidden")].map((n) => n.textContent).join(""),
      badge: badges.map((b) => ({ qty: b.getAttribute("data-qty"), ariaHidden: b.getAttribute("aria-hidden"), text: b.textContent })),
    };
  });
}

test("UC8: the week's cart has meals twice (control), and the phrase the content writes them with is on the list", () => {
  assert.ok(cart.items.some((m) => m.qty > 1) && cart.items.some((m) => m.qty === 1), "control: quantities of 1 and above it");
  for (const [name, html] of pages) {
    const page = openPlanPage(html, { hash: HASH, now: NOW });
    assert.equal(page.el("cc-list").getAttribute("data-meal-qty"), MESSAGES.chefs_choice.meal_qty, `${name}: #cc-list carries meal_qty, the build's words`);
  }
});

test("UC8: a quantity above 1 — the count on the tile (a badge hidden from assistive technology), the line drawn without it", () => {
  for (const [name, html] of pages) {
    const shown = rows(html);
    assert.equal(shown.length, cart.items.length, `${name}: control: a row per meal`);
    cart.items.forEach((meal, i) => {
      const where = `${name}, ${meal.display}`;
      assert.equal(shown[i].words, mealLine(meal), `${where}: the row's words are the content's line, so its name carries the count`);
      if (meal.qty > 1) {
        assert.deepEqual(shown[i].badge, [{ qty: String(meal.qty), ariaHidden: "true", text: "" }], `${where}: one badge on its tile, the count drawn by the style`);
        assert.equal(shown[i].drawn, squash(meal.display), `${where}: the line drawn is the meal's name alone`);
        assert.equal(squash(shown[i].hidden), squash(mealLine(meal).replace(squash(meal.display), "")), `${where}: the rest of the line, visually hidden`);
      } else {
        assert.deepEqual(shown[i].badge, [], `${where}: a quantity of 1 shows nothing`);
        assert.equal(shown[i].hidden, "", `${where}: nothing hidden`);
        assert.equal(shown[i].drawn, squash(meal.display), `${where}: its name`);
      }
    });
  }
});
