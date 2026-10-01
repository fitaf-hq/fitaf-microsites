// PR-1 (SPEC-plan-page-refinement § 1, § 5): removed. None of § 1's phrases is in either built page, with the committed
// week's Chef's Choice open; the mock-ups' build still carries "Find your plan." and the event line.
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadInputs, MOCKUPS_DIR, renderMockups } from "../mockups/build-mockups.mjs";
import { MESSAGES, PLANS } from "./cc-harness.mjs";
import { bothPages } from "./pr-harness.mjs";

const PHRASES = [
  ...MESSAGES.event_line, // § 1 item 1
  MESSAGES.headline, // § 1 item 2
  MESSAGES.subhead,
  "Pick your plan — here",
  "Choose your meals and check out — on the Fit AF store",
  "Pick a goal and how many meals to see your price.", // § 1 item 3
  "Pick a meal size and how many meals to see your price.", // the development page's form of it
  ">Your plan<", // § 1 item 4, the eyebrow
  MESSAGES.chefs_choice.note, // § 1 item 5
  ...PLANS.individual.map((p) => p.promise), // § 1 item 6
];

test("PR-1: none of § 1's phrases is in either built page; the mock-ups still carry the headline and event line", async () => {
  for (const [build, html] of Object.entries(await bothPages())) {
    assert.ok(html.includes('id="picks-data"'), `control: the ${build} page carries the week`);
    assert.deepEqual(PHRASES.filter((p) => html.includes(p)), [], `${build}: phrases § 1 removed`);
  }
  const pieces = renderMockups(await loadInputs({ photosDir: join(MOCKUPS_DIR, "no-such-folder"), today: "2026-10-15" }));
  const all = Object.values(pieces).join("\n");
  for (const phrase of [MESSAGES.headline, ...MESSAGES.event_line]) assert.ok(all.includes(phrase), `the mock-ups: ${phrase}`);
});
