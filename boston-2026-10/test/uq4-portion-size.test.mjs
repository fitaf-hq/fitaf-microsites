// UQ4 (SPEC-ui-and-copy-pass.md § 2 item 4, the Advisor 2026-10-25: "near "What's your goal", add a "Find my portion
// size" (or similar) that expands to include our calorie/protein calculator (which is currently arbitrarily placed near
// the bottom of the page)"; and on its words, the same day: "I'm fine keeping it whatever copy we have"): directly below
// the goal's answers, the existing calculator (src/save/share-panel.html) moved there from below the save section,
// nowhere else on the page, collapsed by default behind a disclosure button whose words are the calculator's own heading,
// "What share of my day is that?" (the button inside that heading, so the phrase is printed once); "Find my portion size"
// is printed nowhere. Opened, its help line, fields, hint and lines are the contract's commit's (81a1199) word for word,
// and its arithmetic gives test/ms-golden.json's lines. Opening it moves nothing above it; its state is remembered
// nowhere (no storage, no fragment). The calculator is the development page's alone (devSlots' SHARE_PANEL; the
// production page has never carried it), so the disclosure is too: the production page carries neither (as built; § 2.1).
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { parseHTML } from "linkedom";
import { ROOT } from "../build.mjs";
import { openVisit } from "./a-harness.mjs";
import { hiddenInTree } from "./cc-harness.mjs";
import { open } from "./ms-harness.mjs";
import { type } from "./uc-harness.mjs";
import { CALCULATOR_TITLE, inOrder, NOT_A_PHRASE, pages } from "./uq-harness.mjs";

const { production, development } = await pages();
const golden = JSON.parse(await readFile(new URL("./ms-golden.json", import.meta.url), "utf8"));
/** The contract's own commit: the calculator's markup before it moved. */
const BEFORE = "81a1199";
const squash = (s) => s.replace(/\s+/g, " ").replace(/> </g, "><").trim();
const IDS = ["share-targets", "share-protein-line", "share-calories-line"];

/** Each element before `node` in document order, as markup a visitor's press could change: its attributes and own text. */
function before(page, node) {
  const all = inOrder(page.document);
  return all.slice(0, all.indexOf(node)).map((n) => `${n.localName}${JSON.stringify([...n.attributes].map((a) => [a.name, a.value]))}${[...n.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join("")}`);
}

test("UQ4: directly below the goal's answers, the calculator, collapsed behind its own heading as a disclosure button (the development page)", () => {
  const { document } = parseHTML(development);
  const goals = document.querySelector(".choices.goals");
  const share = goals.nextElementSibling;
  assert.equal(share?.id, "share", "the goal's answers are followed by the calculator");
  assert.equal(share.closest(".step"), document.getElementById("q-goal").closest(".step"), "in the goal's group");
  const heading = share.firstElementChild;
  assert.deepEqual([heading?.localName, heading?.className], ["h3", "share-title"], "its heading first, as before");
  const toggle = heading.querySelector("button");
  assert.deepEqual(
    [toggle?.id, toggle?.getAttribute("type"), toggle?.textContent.trim(), toggle?.getAttribute("aria-expanded"), toggle?.getAttribute("aria-controls")],
    ["share-toggle", "button", CALCULATOR_TITLE, "false", "share-body"],
    "the heading's words are a button, collapsed, controlling the rest of the calculator",
  );
  assert.equal(heading.textContent.trim(), toggle.textContent.trim(), "the heading holds the button alone");
  const body = heading.nextElementSibling;
  assert.deepEqual([body?.id, body?.hasAttribute("hidden"), body?.nextElementSibling ?? null], ["share-body", true, null], "the rest of the calculator directly below, hidden: collapsed by default");
  assert.equal(development.split(CALCULATOR_TITLE).length - 1, 1, "the calculator's heading printed once");
  assert.ok(!development.includes(NOT_A_PHRASE), `"${NOT_A_PHRASE}" printed nowhere`);
});

test("UQ4: the calculator is in the page exactly once, moved: before the result, not after the save section; its words the contract's commit's", () => {
  const { document } = parseHTML(development);
  for (const sel of ["#share", ".share", ".share-title", "#share-toggle", "#share-body", "#share-protein", "#share-calories", "#share-out"]) {
    assert.equal(document.querySelectorAll(sel).length, 1, `${sel}: once`);
  }
  const all = inOrder(document);
  const at = (id) => all.indexOf(document.getElementById(id));
  assert.ok(at("share") < at("result"), "above the result");
  assert.ok(at("share") < at("save"), "not below the save section, where it was");
  const r = spawnSync("git", ["-C", ROOT, "show", `${BEFORE}:./src/save/share-panel.html`], { encoding: "utf8" });
  assert.equal(r.status, 0, `git show ${BEFORE}: ${r.stderr}`);
  const was = /<div class="share" id="share">\s*<h3 class="share-title">([^<]*)<\/h3>([\s\S]*)<\/div>\s*$/.exec(r.stdout);
  assert.equal(was?.[1], CALCULATOR_TITLE, `control: ${BEFORE}'s calculator and its heading`);
  assert.equal(squash(document.getElementById("share-body").innerHTML), squash(was[2]), "its help line, fields, hint and lines unchanged, word for word");
});

test("UQ4: as run, collapsed at every fragment; a press opens it, a second closes it; nothing above it changes; no fragment written", () => {
  for (const hash of ["", "#lean", "#lean-7", "#lean-or-5d-b"]) {
    const page = open(development, hash);
    assert.deepEqual([page.el("share-toggle").getAttribute("aria-expanded"), hiddenInTree(page.el("share-body")), hiddenInTree(page.el("share-toggle"))], ["false", true, false], `${hash || "(no fragment)"}: collapsed, its button shown`);
  }
  const page = open(development, "#lean-or-5d-b");
  const toggle = page.el("share-toggle");
  const above = before(page, toggle);
  toggle.click();
  assert.deepEqual([toggle.getAttribute("aria-expanded"), hiddenInTree(page.el("share-body"))], ["true", false], "a press opens the calculator");
  assert.deepEqual(before(page, toggle), above, "opening it changes nothing above it");
  assert.equal(page.hash(), "#lean-or-5d-b", "nothing in the fragment");
  toggle.click();
  assert.deepEqual([toggle.getAttribute("aria-expanded"), hiddenInTree(page.el("share-body"))], ["false", true], "a second press closes it");
  assert.equal(page.hash(), "#lean-or-5d-b", "nothing in the fragment");
});

test("UQ4: opened, the arithmetic is unchanged: today's lines at #lean-7 and #signature-14 (test/ms-golden.json)", () => {
  for (const hash of ["#lean-7", "#signature-14"]) {
    const page = open(development, hash);
    page.el("share-toggle").click();
    type(page, "share-protein", "150");
    type(page, "share-calories", "2,600");
    assert.equal(hiddenInTree(page.el("share-out")), false, `${hash}: the lines shown`);
    assert.deepEqual(IDS.map((id) => page.el(id).textContent), golden.share[hash], `${hash}: the golden's lines`);
  }
});

test("UQ4: its state is kept nowhere — a visit that opens it and types touches no storage; opened again, collapsed", () => {
  const visit = openVisit(development, { hash: "#lean-7" });
  visit.press("share-toggle");
  assert.equal(visit.el("share-toggle").getAttribute("aria-expanded"), "true", "control: opened");
  for (const [id, value] of [["share-protein", "150"], ["share-calories", "2600"]]) {
    visit.el(id).value = value;
    visit.el(id).dispatchEvent(new visit.document.defaultView.Event("input"));
  }
  assert.deepEqual(visit.touched, [], "no storage API touched");
  assert.equal(visit.hash(), "#lean-7", "nothing in the fragment");
  assert.doesNotMatch(development, /localStorage|sessionStorage|indexedDB|document\.cookie/, "the page's scripts name no storage");
  const again = open(development, "#lean-7");
  assert.equal(again.el("share-toggle").getAttribute("aria-expanded"), "false", "a page opened again starts collapsed");
});

test("UQ4: the production page carries no calculator, so no disclosure (the calculator is the development page's alone)", () => {
  for (const id of ["share-toggle", "share"]) assert.doesNotMatch(production, new RegExp(`id="${id}"`), `no #${id}`);
});
