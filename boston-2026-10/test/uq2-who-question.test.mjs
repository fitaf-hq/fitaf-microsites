// UQ2 (SPEC-ui-and-copy-pass.md § 2 item 2, the Advisor 2026-10-25: "change "Invididual / Family" into a question (it
// will now be the first one)"): the two tabs are gone; the first question is "Who is this for?" in the look of the other
// questions (a group named by its heading, an h2.step-label, and two answer buttons in the meal questions' style, each its
// words alone), the individual plan the default, on the left, Family on the right, in the Advisor's words ruled
// 2026-10-25 ("Just me", "Me and my family"; § 2.1). Its phrases are data/messages.json's, as every
// question's (`plan_page.questions.who`), and the build refuses a missing one, naming it. The fragment's #family and
// #individual still land on that answer (and every other fragment on Individual); a press writes the fragment as the
// tabs did. Like the tabs, the question needs the page's script (js-only): without it both panels show, as before.
// Copies only; no file in the repository is edited.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseHTML } from "linkedom";
import { MESSAGES } from "./cc-harness.mjs";
import { open, pageOf } from "./ms-harness.mjs";
import { choose, pages, whoOf, WHO } from "./uq-harness.mjs";

const { production, development } = await pages();
const BUILDS = { production, development };

/** A copy of data/messages.json at a temporary path, and its remover. */
async function messagesCopy(messages) {
  const dir = await mkdtemp(join(tmpdir(), "boston-uq2-"));
  const path = join(dir, "messages.json");
  await writeFile(path, JSON.stringify(messages, null, 2));
  return { path, done: () => rm(dir, { recursive: true, force: true }) };
}

/** A button's look as markup: its tag, type, classes and the classes of its children (its words apart). */
const shape = (b) => ({ tag: b.localName, type: b.getAttribute("type"), cls: b.className, kids: [...b.children].map((c) => c.className), pressed: b.hasAttribute("aria-pressed") });

test("UQ2: no tabs: no tab list, tab or tab panel; the panels keep their ids", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const { document } = parseHTML(html);
    assert.equal(document.querySelectorAll('[role="tablist"], [role="tab"], [role="tabpanel"], .tabs, .tab').length, 0, `${build}: no tab`);
    assert.ok(document.getElementById("panel-individual") && document.getElementById("panel-family"), `${build}: the two panels, by their ids`);
  }
});

test("UQ2: the first question is Who is this for?, in the look of the others: Just me on the left, Me and my family on the right", () => {
  const words = MESSAGES.plan_page.questions.who;
  assert.deepEqual({ heading: words?.heading, individual: words?.individual, family: words?.family }, { heading: WHO.heading, ...WHO.words }, "data/messages.json's phrases are the contract's");
  for (const [build, html] of Object.entries(BUILDS)) {
    const { document } = parseHTML(html);
    const group = document.getElementById("who");
    assert.ok(group, `${build}: #who`);
    assert.ok(group.matches('.step[role="group"][aria-labelledby="q-who"]'), `${build}: a group named by its heading, as each question's`);
    assert.ok(group.classList.contains("js-only"), `${build}: needs the page's script, as the tabs did`);
    const heading = group.querySelector("h2.step-label");
    assert.deepEqual([heading?.id, heading?.textContent.trim()], ["q-who", WHO.heading], `${build}: its heading`);
    const answers = [...group.querySelectorAll(".choices.counts > button")];
    assert.deepEqual(answers.map((b) => b.getAttribute("data-who")), WHO.answers, `${build}: the individual plan on the left, Family on the right`);
    assert.deepEqual(answers.map((b) => b.textContent.trim()), WHO.answers.map((a) => WHO.words[a]), `${build}: its answers' words`);
    // In the look of the other questions: each answer shaped as Q1's are (its tag, type, class and its words' span).
    const q1 = [...document.querySelectorAll('[data-q="lunch_dinner"]')];
    assert.equal(q1.length, 2, `${build}: control: Q1's two answers`);
    for (const b of answers) assert.deepEqual(shape(b), shape(q1[0]), `${build}: ${b.getAttribute("data-who")} shaped as Q1's answers`);
    assert.equal(group.parentElement.localName, "main", `${build}: in the page's column`);
    assert.ok(!group.closest("#panel-individual, #panel-family"), `${build}: above both panels, in neither`);
  }
});

// ⚠ AMENDED by SPEC-ui-and-copy-pass § 4.2 item 1 (2026-10-26, the Advisor: "let's start with just the question"): a
// fragment carrying no answer (none, or one the page does not know) is the start, neither answer pressed and neither
// panel shown; a meal answer or a size still lands on Individual.
test("UQ2: #family and #individual land on their answer; a meal answer or a size on Individual; no answer, the start (neither)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    for (const [hash, pressed] of [["#family", "family"], ["#individual", "individual"], ["", null], ["#lean", "individual"], ["#lean-or-7d", "individual"], ["#meals-and-5d-b", "individual"], ["#nope", null]]) {
      const page = open(html, hash);
      assert.deepEqual(whoOf(page), { shown: true, answers: WHO.answers, pressed: pressed ? [pressed] : [] }, `${build}, ${hash || "(no fragment)"}`);
      assert.equal(page.el("panel-family").hasAttribute("hidden"), pressed !== "family", `${build}, ${hash || "(no fragment)"}: the Family panel`);
      assert.equal(page.el("panel-individual").hasAttribute("hidden"), pressed !== "individual", `${build}, ${hash || "(no fragment)"}: the Individual panel`);
      assert.equal(page.hash(), hash, `${build}, ${hash || "(no fragment)"}: no fragment of its own on opening`);
    }
  }
});

test("UQ2: a press writes the fragment as the tabs did; pressing the answer already chosen writes nothing", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = open(html, "#signature-or-7d-b");
    choose(page, "individual");
    assert.equal(page.hash(), "#signature-or-7d-b", `${build}: Individual again: nothing new`);
    choose(page, "family");
    assert.deepEqual([page.hash(), whoOf(page).pressed], ["#family", ["family"]], `${build}: Family`);
    choose(page, "family");
    assert.equal(page.hash(), "#family", `${build}: Family again: nothing new`);
    choose(page, "individual");
    assert.deepEqual([page.hash(), whoOf(page).pressed], ["#signature-or-7d-b", ["individual"]], `${build}: back to the state left`);
    const fresh = open(html, "#family");
    choose(fresh, "individual");
    assert.equal(fresh.hash(), "#individual", `${build}: from #family with nothing chosen: #individual`);
  }
});

test("UQ2: the question's words are data/messages.json's: with each a letterless marker, the question shows no letter", async () => {
  const messages = structuredClone(MESSAGES);
  messages.plan_page.questions.who = { heading: "⟦1⟧", individual: "⟦2⟧", family: "⟦3⟧" };
  const copy = await messagesCopy(messages);
  try {
    for (const target of ["prod", "dev"]) {
      const { document } = parseHTML(await pageOf({ target, messagesPath: copy.path }));
      const text = document.getElementById("who").textContent;
      assert.deepEqual(text.match(/⟦\d⟧/g), ["⟦1⟧", "⟦2⟧", "⟦3⟧"], `${target}: the three phrases, in order`);
      assert.doesNotMatch(text.replace(/⟦\d⟧/g, ""), /\p{L}/u, `${target}: no letter not from data/`);
    }
  } finally {
    await copy.done();
  }
});

for (const key of ["heading", "individual", "family"]) {
  test(`UQ2: the build refuses a missing plan_page.questions.who.${key}`, async () => {
    const messages = structuredClone(MESSAGES);
    assert.equal(typeof messages.plan_page.questions.who?.[key], "string", "fixture control: the phrase is committed");
    delete messages.plan_page.questions.who[key];
    const copy = await messagesCopy(messages);
    try {
      await assert.rejects(pageOf({ messagesPath: copy.path }), new RegExp(`data/messages\\.json: plan_page\\.questions\\.who\\.${key}`));
    } finally {
      await copy.done();
    }
  });
}
