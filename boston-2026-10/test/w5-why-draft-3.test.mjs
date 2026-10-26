// W5 (SPEC-why-fit-af.md § 7, 2026-10-26, the Advisor's draft 3 before tonight's event): the /why/ page each build writes
// (production and development) reads exactly § 7 item 1's words between its top and its *Find your plan* button, in
// that order and in those elements (draft 2's other sections, and its draft line, gone); its two links (§ 7 item 2) go to
// the store site's contact page and open at the top level (`target="_top"`, the page being shown in the plan page's
// dialog frame); and *Find your plan* is as § 6 left it (the plan page, no target). The words are written here from the
// contract, character for character (its en dashes and straight apostrophes).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseHTML } from "linkedom";
import { build } from "../build.mjs";

/** § 7 item 1, in order: [element, words]. */
const WORDS = [
  ["h1", "Why Fit AF?"],
  ["p", "Fresh, chef-prepared meals – made for your goals, delivered every week."],
  ["p", "We cook all our meals from scratch in our own kitchen outside Boston. We've been delivering fresh meals (never frozen!) across the Northeast since 2017."],
  ["h2", "Questions"],
  ["h3", "How does it work?"],
  ["p", "Set your goals and pick your menu – and we'll take it from there."],
  ["h3", "When do I order, and when do my meals arrive?"],
  ["p", "Each week's menu opens on Friday morning, and you can order until 11:59 PM Thursday. Your meals arrive together, in one bag, on Monday, at your home (you don't need to be there when they arrive)."],
  ["h3", "Can I change a meal?"],
  ["p", "Yes! Our menus are just a starting point – swap any meal you like. If you need help or have a complex request, please contact us."],
  ["h3", "Can I skip a week, pause or cancel?"],
  ["p", "Yes! You can easily do this yourself – or our customer service team can handle it for you."],
];
/** § 7 item 2: the store site's contact page, opened at the top level; each link's words. */
const CONTACT = "https://fitafnutrition.com/contact";
const LINKS = ["contact us", "our customer service team"];
const PLAN_BUTTON = "Find your plan";

const words = (n) => n.textContent.replace(/\s+/g, " ").trim();

async function whyPages() {
  const pages = {};
  for (const target of ["prod", "dev"]) {
    const out = await mkdtemp(join(tmpdir(), "boston-w5-"));
    try {
      await build({ target, outDir: out });
      pages[target] = await readFile(join(out, "why", "index.html"), "utf8");
    } finally {
      await rm(out, { recursive: true, force: true });
    }
  }
  return pages;
}
const PAGES = await whyPages();

test("W5: the /why/ page reads § 7 item 1's words, in order, between its top and Find your plan; nothing else (draft 3)", () => {
  for (const [target, html] of Object.entries(PAGES)) {
    const { document } = parseHTML(html);
    const main = document.querySelector("main");
    const read = [...main.querySelectorAll("h1, h2, h3, p")].map((n) => [n.localName, words(n)]);
    assert.deepEqual(read, WORDS, `${target}: the words, element by element`);
    const outside = [...document.body.children].filter((n) => n !== main).map(words).join("");
    assert.equal(outside, "", `${target}: no words outside the page's main (draft 2's draft line gone)`);
    const rest = [...main.children].filter((n) => !["h1", "h2", "h3", "p", "img"].includes(n.localName) && !n.classList.contains("cta")).map((n) => n.localName);
    assert.deepEqual(rest, [], `${target}: no other block (draft 2's sections gone)`);
  }
});

test("W5: the two links go to the store site's contact page, at the top level; Find your plan as § 6 left it (§ 7 item 2)", () => {
  for (const [target, html] of Object.entries(PAGES)) {
    const { document } = parseHTML(html);
    const links = [...document.querySelectorAll("main a:not(.cta)")];
    assert.deepEqual(links.map(words), LINKS, `${target}: the two links' words`);
    for (const a of links) {
      assert.equal(a.getAttribute("href"), CONTACT, `${target}: "${words(a)}" goes to ${CONTACT}`);
      assert.equal(a.getAttribute("target"), "_top", `${target}: "${words(a)}" opens at the top level`);
    }
    const plan = document.querySelector("main a.cta");
    assert.deepEqual([words(plan), plan.getAttribute("href"), plan.getAttribute("target")], [PLAN_BUTTON, "/", null], `${target}: Find your plan, the plan page`);
  }
});
