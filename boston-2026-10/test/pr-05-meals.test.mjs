// PR-5 (SPEC-plan-page-refinement § 2 item 3, § 5): which meals, two buttons: "Lunch or dinner" · "7 meals/week" and
// "Lunch and dinner" · "14 meals/week", the or / and emphasised, the words from data/messages.json (`plan_page`).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseHTML } from "linkedom";
import { renderPage, ROOT } from "../build.mjs";
import { MESSAGES, PLANS } from "./cc-harness.mjs";

const EXPECTED = { 7: ["Lunch or dinner", "7 meals/week", "or"], 14: ["Lunch and dinner", "14 meals/week", "and"] };

test("PR-5: two buttons with § 2 item 3's words from data/messages.json, or / and emphasised", async () => {
  const { document } = parseHTML(await renderPage(PLANS));
  const buttons = [...document.querySelectorAll(".counts [data-count]")];
  assert.equal(buttons.length, 2);
  for (const b of buttons) {
    const [name, line, word] = EXPECTED[b.getAttribute("data-count")];
    assert.equal(b.querySelector(".choice-name").textContent, name);
    assert.equal(b.querySelector(".choice-line").textContent, line);
    assert.equal(b.querySelector(".choice-name em")?.textContent, word, `${name}: "${word}" emphasised`);
  }
  const words = MESSAGES.plan_page;
  assert.deepEqual([words.counts["7"], words.counts["14"], words.per_week], ["Lunch *or* dinner", "Lunch *and* dinner", "{n} meals/week"], "the words are data's");
  for (const file of ["src/template.html", "build.mjs", "src/app.js"]) {
    assert.ok(!(await readFile(join(ROOT, file), "utf8")).includes("meals/week"), `${file} types none of them`);
  }
});
