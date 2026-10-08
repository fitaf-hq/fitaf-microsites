// MS-8 (SPEC-meal-selection.md § 6, § 1, § 8 item 5, § 9 item 3): words. Every word the meal selection adds is a phrase of
// data/messages.json, by the letterless-marker rule CC-7 uses: with every phrase of `plan_page` and `chefs_choice` a
// marker with no letters (its placeholders kept) and every shown meal and snack name (`display`) another, the four
// questions, the result card's meals a week and rounded line, and the snack block show no letter. And the build refuses a
// missing phrase: each new one removed in a copy fails the build, naming it. Copies only; no file in the repository is
// edited. The two cases that read the four questions and the snack block build from their own data with snacks shown
// (ms-harness SNACKS_SHOWN, § 11), never the committed flags.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MESSAGES, picksDir } from "./cc-harness.mjs";
import { open, pageOf, SNACKS_SHOWN, V2 } from "./ms-harness.mjs";

const LETTER = /\p{L}/u;
const SENTINEL = /⟦\d+⟧/g;

/** A copy of data/messages.json at a temporary path, and its remover. */
async function messagesCopy(messages) {
  const dir = await mkdtemp(join(tmpdir(), "boston-ms-08-"));
  const path = join(dir, "messages.json");
  await writeFile(path, JSON.stringify(messages, null, 2));
  return { path, done: () => rm(dir, { recursive: true, force: true }) };
}

/** Every string under `obj` replaced by a marker that keeps its {placeholders}; the markers made. */
function markAll(obj, markers, skip = ["status"]) {
  for (const [k, v] of Object.entries(obj)) {
    if (skip.includes(k)) continue;
    if (typeof v === "string") {
      const m = `⟦${markers.length}⟧`;
      markers.push(m);
      obj[k] = [m, ...(v.match(/\{[a-z]+\}/g) ?? [])].join(" ");
    } else if (v && typeof v === "object") markAll(v, markers, skip);
  }
}

/** The text of the parts the meal selection adds: the four questions, the meals a week and the rounded line, the snacks. */
function addedText(page) {
  const { document } = page;
  const groups = [...document.querySelectorAll('.step[role="group"]')].filter((g) => g.querySelector("[data-q]"));
  assert.equal(groups.length, 4, "the four questions");
  // The snack block is the week's (the Chef's Choice card): a page without a week has none.
  const parts = [...groups, document.getElementById("result-meals").parentElement, document.getElementById("result-rounded"), document.getElementById("cc-snacks")];
  return parts.filter(Boolean).map((p) => p.textContent).join(" ");
}

test("MS-8: with every phrase and every shown name a letterless marker, the added parts show no letter", async () => {
  const markers = [];
  const messages = structuredClone(MESSAGES);
  markAll(messages.plan_page, markers);
  markAll(messages.chefs_choice, markers);
  const week = structuredClone(V2);
  const list = week.lists["chefs-choice"];
  for (const meal of [...list.carts.flatMap((c) => c.items), ...Object.values(list.snacks).flat()]) {
    meal.display = `⟦${markers.length}⟧`;
    markers.push(meal.display);
  }
  const copy = await messagesCopy(messages);
  const picks = await picksDir({ "2026-10-04.json": week });
  try {
    const html = await pageOf({ picks, messagesPath: copy.path, snacks: SNACKS_SHOWN });
    const seen = new Set();
    for (const hash of ["#lean-and-5d-b-s", "#lean-and-7d-b-s"]) {
      const text = addedText(open(html, hash));
      for (const m of text.match(SENTINEL) ?? []) seen.add(m);
      const left = text.replace(SENTINEL, "");
      assert.doesNotMatch(left, LETTER, `${hash}: letters not from data/: ${JSON.stringify(left.match(/\S*\p{L}\S*/gu))}`);
    }
    const want = [
      ...Object.values(messages.plan_page.questions).flatMap((q) => Object.values(q)),
      messages.plan_page.meals_unit,
      messages.plan_page.rounded.split(" ")[0],
      messages.chefs_choice.snacks_heading,
      messages.chefs_choice.snacks_not_carted,
      ...list.snacks["7"].map((m) => m.display),
    ].map((p) => p.match(SENTINEL)[0]);
    assert.deepEqual(want.filter((m) => !seen.has(m)), [], "every added phrase and every snack name is shown");
  } finally {
    await copy.done();
    await rm(picks, { recursive: true, force: true });
  }
});

test("MS-8 (control): a word typed into the added parts is caught", async () => {
  const markers = [];
  const messages = structuredClone(MESSAGES);
  markAll(messages.plan_page, markers);
  const copy = await messagesCopy(messages);
  try {
    const built = await pageOf({ messagesPath: copy.path, snacks: SNACKS_SHOWN });
    const html = built.replace('id="q-weekends">', 'id="q-weekends">Weekends! ');
    assert.notEqual(html, built, "the mutation anchor is present");
    assert.match(addedText(open(html, "#lean-or-5d")).replace(SENTINEL, ""), /Weekends!/);
  } finally {
    await copy.done();
  }
});

const NEW_PHRASES = [
  ...["lunch_dinner", "weekends", "breakfast", "snacks"].flatMap((q) =>
    ["heading", ...(q === "lunch_dinner" ? ["or", "and"] : ["yes", "no"])].map((a) => ["plan_page", ["questions", q, a]]),
  ),
  ["plan_page", ["meals_unit"]],
  ["plan_page", ["rounded"]],
  ["chefs_choice", ["snacks_heading"]],
  ["chefs_choice", ["snacks_not_carted"]],
];

for (const [key, path] of NEW_PHRASES) {
  test(`MS-8: the build refuses a missing ${key}.${path.join(".")}`, async () => {
    const messages = structuredClone(MESSAGES);
    let at = messages[key];
    for (const p of path.slice(0, -1)) at = at[p];
    assert.ok(typeof at[path.at(-1)] === "string", "fixture control: the phrase is committed");
    delete at[path.at(-1)];
    const copy = await messagesCopy(messages);
    try {
      await assert.rejects(pageOf({ picks: join(import.meta.dirname, "fixtures", "picks-v2"), messagesPath: copy.path }), new RegExp(`data/messages\\.json: ${key}\\.${path.join("\\.")}`));
    } finally {
      await copy.done();
    }
  });
}

test("MS-8: the rounded line keeps both placeholders", async () => {
  for (const drop of ["{meals}", "{plan}"]) {
    const messages = structuredClone(MESSAGES);
    messages.plan_page.rounded = messages.plan_page.rounded.replace(drop, "");
    const copy = await messagesCopy(messages);
    try {
      await assert.rejects(pageOf({ messagesPath: copy.path }), /data\/messages\.json: plan_page\.rounded/);
    } finally {
      await copy.done();
    }
  }
});
