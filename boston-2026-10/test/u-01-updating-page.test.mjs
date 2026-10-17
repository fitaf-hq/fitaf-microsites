// U1 (SPEC-week-content.md § 8 items 3–5): the page over an UPDATING week shows, in the Chef's Choice card's place, a
// card reading § 8's words (data/messages.json's, never a literal in the script), no Chef's Choice cart and no checkout
// link anywhere in the card, no form; and the page's existing fallback stays as it is (Choose your meals, the store's
// order page): at every fragment the rest of what a visitor sees is the page with no week. Both pages (production's and
// the development build's), and production's as its unchanged Worker serves it from the bucket (§ 8 item 4); and the
// page's script alone, given the week as § 8 item 2 words it, written here (U1e: no content command in the way).
// The checks are test/u-checks.mjs's, which § 8 item 5's mutant re-runs on a mirror (test/u-mutants.test.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { MESSAGES } from "./cc-harness.mjs";
import { noWeekPage, picksText } from "./wc-harness.mjs";
import {
  updatingCardProblems,
  UPDATING_KEY,
  UPDATING_WEEK,
  UPDATING_WORDS,
  updatingPageProblems,
  updatingServedProblems,
} from "./u-checks.mjs";

test("U1a: data/messages.json's chefs_choice.updating is § 8's words; no source carries them", async () => {
  assert.equal(MESSAGES.chefs_choice?.[UPDATING_KEY], UPDATING_WORDS);
  const sources = [
    "src/template.html",
    "src/app.js",
    "src/chefs-choice/card.html",
    "src/chefs-choice/chefs-choice.js",
    "src/chefs-choice/style.css",
    "build.mjs",
    "scripts/chefs-choice.mjs",
    "scripts/week-content.mjs",
  ];
  for (const file of sources) {
    const text = await readFile(join(ROOT, file), "utf8");
    assert.ok(!text.includes(UPDATING_WORDS), `${file} carries the card's words`);
  }
});

for (const target of ["prod", "dev"]) {
  test(`U1b (${target}): the page over an updating week: the card shown with its words, no cart, no checkout link, the fallback as it is`, async () => {
    assert.deepEqual(await updatingPageProblems(ROOT, { target }), []);
  });
}

test("U1c: production as its Worker serves the bucket's updating week: put in #picks-data, and the page passes U1", async () => {
  assert.deepEqual(await updatingServedProblems(ROOT), []);
});

for (const [label, carts] of [["the key absent", undefined], ["empty", {}]]) {
  test(`U1e: the page's script alone, given § 8 item 2's week written here (no carts: ${label}): the card shown, the fallback as it is`, async () => {
    const { pageWithWeek } = await import("../scripts/week-content.mjs");
    const noWeek = await noWeekPage();
    const week = { delivery: UPDATING_WEEK, updating: true, ...(carts ? { carts } : {}) };
    const html = pageWithWeek(noWeek, { ...JSON.parse(picksText(noWeek)), weeks: [week] });
    assert.deepEqual(updatingCardProblems(html, noWeek, UPDATING_WORDS), []);
  });
}

test("U1d: the card's words are data/messages.json's: a marker there is what the card shows", async () => {
  const dir = await mkdtemp(join(tmpdir(), "boston-u1-words-"));
  try {
    const messages = structuredClone(MESSAGES);
    messages.chefs_choice = { ...messages.chefs_choice, [UPDATING_KEY]: "⟦U1⟧" };
    const messagesPath = join(dir, "messages.json");
    await writeFile(messagesPath, JSON.stringify(messages, null, 2));
    assert.deepEqual(await updatingPageProblems(ROOT, { messagesPath }), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
