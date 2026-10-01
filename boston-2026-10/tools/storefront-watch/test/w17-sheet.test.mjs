// W17 (SPEC-rung2-progress-and-checkout § 17.4, live): given the microsite's own checkout link (`--link`), the smoke runs
// THAT link (its meals, its plan, its photo part) instead of one it builds from the menu, and reports, per slide of the
// progress screen, whether it showed Fit AF's sheet: shown (the sheet's img, on a host of the block's fixed list,
// loaded), failed (asked for, and the browser reported an error: the slide fell back to today's rule), asked (asked
// for, neither seen), or not found (no sheet on that slide). A report, not a pass rule (§ 18).
// W17a: the line, on recorded outcomes, and how a link becomes the smoke's choice (its mpid and its meals by name, read
// against the menu with the site's own key function), no browser.
import test from "node:test";
import assert from "node:assert/strict";
import * as faces from "../lib/faces.mjs";
import * as smoke from "../lib/smoke.mjs";
import { siteCode } from "../lib/site-code.mjs";

const run = (events) => ({ done: true, screenAtEnd: false, events: [{ e: "screen+" }, ...events, { e: "screen-" }] });
const slide = (name, src = "https://eatfitaf.com/assets/photo-sheets/s.jpg") => ({ e: "slide", name, src });

test("W17a: per slide — shown, failed, asked or not found; the line counts the shown", () => {
  assert.equal(typeof faces.sheetLine, "function", "lib/faces.mjs has W17's line");
  const f = run([
    slide("Meal A"),
    { e: "sheet", name: "Meal A", ok: true },
    slide("Meal B"),
    { e: "sheet", name: "Meal B", ok: false },
    slide("Meal C"),
    slide("Meal D", null),
  ]);
  assert.equal(faces.sheetLine(f), "W17: Fit AF's sheet on 1 of 4 slides: Meal A shown; Meal B failed; Meal C asked; Meal D not found");
  assert.equal(faces.sheetLine(run([])), "W17: no slide seen");
  assert.equal(faces.sheetLine(null), "W17: not recorded");
});

test("W17a: --link — the smoke's choice is the link's own plan and meals (by name from the menu, each as many times as the link says)", async () => {
  assert.equal(typeof smoke.linkChoice, "function", "lib/smoke.mjs reads a given link");
  const code = await siteCode();
  const menu = [
    { name: "Meal One", priceCents: 1250 },
    { name: "Meal Two", priceCents: 1250 },
    { name: "Meal Three", priceCents: 1300 },
  ];
  const payload = code.payloadFromArgs(["--mpid", "21", "--item", "Meal One:5", "--item", "Meal Three:2"], code.counts);
  const href = `${code.handoffLink(code.plans, payload)}!0!/assets/photo-sheets/s.jpg!5s!g,g,4w,4w!`;
  const choice = smoke.linkChoice(href, menu, code);
  assert.equal(choice.mpid, 21);
  assert.deepEqual(choice.chosen.map((c) => c.name), [...Array(5).fill("Meal One"), "Meal Three", "Meal Three"]);
  assert.deepEqual(choice.chosen.map((c) => c.priceCents), [...Array(5).fill(1250), 1300, 1300]);
  assert.equal(choice.path, new URL(href).pathname + new URL(href).search + new URL(href).hash, "the link's own path, query and fragment, photo part included");
  assert.throws(() => smoke.linkChoice(href, menu.slice(0, 1), code), /not on the menu/);
  assert.throws(() => smoke.linkChoice("https://fitafnutrition.com/order?mpid=21", menu, code), /#fitaf=/);
});
