// UC11 (SPEC-ui-and-copy-pass.md § 4 A, the Advisor 2026-10-26: "The questions should progressively reveal … Once they're
// all revealed they should stay revealed, even as the user taps around … If *any* question sequence has started and the
// user flips to the other individual/family choice, consider *all* questions revealed. … count the meal size as the
// final "question""): on both builds that carry the page (D item 1), run as a browser runs it:
//   the start (item 2): a link with no answer and no size shows *Who is this for?*, its default pressed, and the first
//   question below it with neither answer pressed, nothing else of the panel's questions and no result;
//   one tap reveals one question (item 3), the meal size the result card; the newest question has no answer pressed and
//   every one above it shows its answer (item 4); a shown question stays shown through a re-tap above it and through
//   back and forward (item 3); a link carrying answers or a size reveals every question at load (item 5); the fallback
//   (item 6), and a switch before any answer that does not reveal; Family's one question (item 1); hidden questions
//   `hidden`, revealing moving neither focus nor the scroll (item 8); the fragment the answers' alone (item 7); and
//   (D item 5) every answer sent as today, a reveal sending nothing.
// ⚠ Q4 (snacks): while snacks are carted (data/plans.json, as committed) the Chef's Choice card shows Q4 beside a result
// only (SPEC-snacks-in-the-cart § 4), so the sequence is uc11-harness CARTED (the builder's reading, § 4.1); with snacks
// shown and not carted (ms-harness SNACKS_SHOWN) Q4 is in the sequence, between breakfast and the meal size.
// ⚠ AMENDED by § 4.2 (the Advisor's rulings on § 4 E, 2026-10-26: "Yes, let's start with just the question"): the start (a
// link carrying no answer) is *Who is this for?* alone, neither answer pressed, nothing of either panel (no meal question,
// no Family card, no result), the foot shown (*Why Fit AF?*, *See all plans*, the footnote); *Just me* shows the first
// meal question, *Me and my family* Family's card and its one question; `#individual` and `#family` press their answer
// and show their panel's first step, as if tapped. Every walk below so starts with a tap on *Just me*, and the first
// question's answer event is sent on its tap.
import test from "node:test";
import assert from "node:assert/strict";
import { hiddenInTree } from "./cc-harness.mjs";
import { openVisit, pageChoices } from "./a-harness.mjs";
import { pageOf, V2_DIR } from "./ms-harness.mjs";
import { pages as uqPages } from "./uq-harness.mjs";
import { browserParts, CARTED, FAMILY, INDIVIDUAL, open, pages, pressedOf, revealed, tap, view, WALK, WHO } from "./uc11-harness.mjs";

const { development, production } = await pages();
const BUILDS = { development, production };
/** Both builds with snacks shown and not carted (the version-2 fixture week): Q4 in the sequence. */
const NOT_CARTED = await uqPages();
/** Both builds as committed (snacks carted) with the version-2 fixture week, whose every-day carts have a snack list. */
const CARTED_V2 = { development: await pageOf({ target: "dev", picks: V2_DIR }), production: await pageOf({ picks: V2_DIR }) };

/** § 4.2 item 1's start: links carrying no answer. `#from-email` is the emails' /o link back (src/worker/redeem.js), which
 *  carries none either (§ 4.1, Found 1); `#nope` a fragment the page does not know. */
const STARTS = ["", "#from-email", "#nope"];
/** § 4.2 item 2: the links carrying the first question's answer, and its panel's first step. */
const FIRST_STEPS = { "#individual": ["individual", "q-lunch_dinner"], "#family": ["family", "q-family"] };
/** What of the page a visitor sees at the start but the questions: each panel, Family's card, and the foot's three. */
const PARTS = { panels: ["panel-individual", "panel-family"], foot: ["why-link", "all-link"] };

/** The walk (items 1, 3, 4): from the start, each question of `sequence` tapped in turn (uc11-harness WALK's answers);
 *  before each tap the questions shown are exactly the first question and the sequence up to the newest, the newest
 *  with no answer pressed, every one above it its tapped answer, and no result; after the last, the result. */
function assertWalk(html, sequence, where) {
  const page = open(html);
  tap(page, WHO, "individual");
  for (let i = 0; i < sequence.length; i++) {
    const v = view(page);
    assert.deepEqual(v.shown, [WHO, ...sequence.slice(0, i + 1)], `${where}: before tapping ${sequence[i]}: the questions shown`);
    const pressed = { [WHO]: "individual" };
    for (const id of sequence.slice(0, i)) pressed[id] = WALK[id];
    pressed[sequence[i]] = null;
    assert.deepEqual(v.pressed, pressed, `${where}: before tapping ${sequence[i]}: the newest (${sequence[i]}) with no answer pressed, each above it its answer`);
    assert.equal(v.result, false, `${where}: before tapping ${sequence[i]}: no result`);
    tap(page, sequence[i], WALK[sequence[i]]);
  }
  const end = view(page);
  assert.equal(end.result, true, `${where}: the meal size answered, the last: the result card`);
  assert.deepEqual(end.shown.filter((id) => id !== "q-snacks"), [WHO, ...sequence].filter((id) => id !== "q-snacks"), `${where}: every question shown`);
  for (const id of sequence) assert.equal(end.pressed[id], WALK[id], `${where}: all answered: #${id} shows its answer`);
  return page;
}

test("UC11: the start — Who is this for? alone, neither answer pressed, nothing of either panel; the foot shown (§ 4.2 items 1, 4)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    for (const hash of STARTS) {
      const where = `${build}, ${hash || "(no fragment)"}`;
      const page = open(html, hash);
      const v = view(page);
      assert.deepEqual(v.shown, [WHO], `${where}: the first question alone`);
      assert.deepEqual(v.pressed, { [WHO]: null }, `${where}: neither answer pressed`);
      assert.equal(v.result, false, `${where}: no result`);
      for (const id of PARTS.panels) assert.equal(hiddenInTree(page.el(id)), true, `${where}: #${id} not shown`);
      assert.equal(hiddenInTree(page.document.querySelector(".family-card")), true, `${where}: no Family card`);
      for (const id of PARTS.foot) assert.equal(hiddenInTree(page.el(id)), false, `${where}: the foot's #${id} shown`);
      assert.equal(hiddenInTree(page.document.querySelector("footer .footnote")), false, `${where}: the footnote shown`);
      assert.equal(page.hash(), hash, `${where}: no fragment written on opening`);
    }
  }
});

test("UC11: #individual and #family press their answer and show their panel's first step, as if tapped (§ 4.2 item 2)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    for (const [hash, [who, first]] of Object.entries(FIRST_STEPS)) {
      const page = open(html, hash);
      const v = view(page);
      assert.deepEqual(v.shown, [WHO, first], `${build}, ${hash}: the first question and its panel's first step`);
      assert.deepEqual(v.pressed, { [WHO]: who, [first]: null }, `${build}, ${hash}: its answer pressed, the step neither`);
      assert.equal(v.result, false, `${build}, ${hash}: no result`);
      assert.equal(hiddenInTree(page.el(`panel-${who}`)), false, `${build}, ${hash}: its panel shown`);
    }
    assert.equal(hiddenInTree(open(html, "#family").document.querySelector(".family-card")), false, `${build}, #family: Family's card shown`);
  }
});

test("UC11: from the start, Just me shows the first meal question; Me and my family Family's card and its question (§ 4.2 item 1)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    for (const [, [who, first]] of Object.entries(FIRST_STEPS)) {
      const page = open(html);
      tap(page, WHO, who);
      const v = view(page);
      assert.deepEqual([v.shown, v.pressed], [[WHO, first], { [WHO]: who, [first]: null }], `${build}: ${who} tapped at the start`);
      assert.equal(page.hash(), `#${who}`, `${build}: ${who}'s fragment, as a press has always written it`);
      if (who === "family") assert.equal(hiddenInTree(page.document.querySelector(".family-card")), false, `${build}: Family's card shown`);
    }
  }
});

test("UC11: one tap reveals one question, the meal size the result; the newest with no answer pressed (A items 1, 3, 4)", () => {
  for (const [build, html] of Object.entries(BUILDS)) assertWalk(html, CARTED, `${build} (snacks carted)`);
  for (const [build, html] of Object.entries(NOT_CARTED)) assertWalk(html, INDIVIDUAL, `${build} (snacks shown, not carted: Q4 in the sequence)`);
});

test("UC11: while snacks are carted, Q4 is the card's — after breakfast the meal size; Q4 beside the result where the week has a list", () => {
  for (const [build, html] of Object.entries(CARTED_V2)) {
    const page = open(html);
    tap(page, WHO, "individual");
    tap(page, "q-lunch_dinner", "or");
    tap(page, "q-weekends", "yes");
    tap(page, "q-breakfast", "no");
    assert.deepEqual(view(page).shown, [WHO, ...CARTED], `${build}: breakfast answered, the meal size next (Q4 not before a result)`);
    tap(page, "q-goal", "lean");
    const v = view(page);
    assert.equal(v.result, true, `${build}: the result`);
    assert.deepEqual(v.shown, [WHO, "q-lunch_dinner", "q-weekends", "q-breakfast", "q-snacks", "q-goal"], `${build}: every day has a snack list: Q4 shown above the meal size`);
    assert.equal(v.pressed["q-snacks"], "no", `${build}: all answered: Q4 shows its default`);
  }
});

test("UC11: the fragment is the answers' alone — the revealed point is not in it (A item 7)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = open(html);
    const hashes = [];
    for (const [id, a] of [[WHO, "individual"], ...CARTED.map((id) => [id, WALK[id]])]) {
      tap(page, id, a);
      hashes.push(page.hash());
    }
    assert.deepEqual(hashes, ["#individual", "#meals-or-5d", "#meals-or-5d", "#meals-or-5d-b", "#lean-or-5d-b"], `${build}: each tap's fragment, as before § 4 (§ 4.2: Just me first)`);
  }
});

test("UC11: a shown question stays shown — a re-tap above it, back and forward (A item 3)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = open(html);
    tap(page, WHO, "individual");
    for (const id of CARTED.slice(0, 3)) tap(page, id, WALK[id]);
    const shown = [WHO, ...CARTED];
    assert.deepEqual(view(page).shown, shown, `${build}: control: three answered, the meal size the newest`);
    tap(page, "q-lunch_dinner", "and");
    assert.deepEqual(view(page).shown, shown, `${build}: Q1 answered again (the other answer): nothing hidden`);
    assert.equal(view(page).pressed["q-goal"], null, `${build}: the meal size still the newest`);
    page.go("#individual");
    assert.deepEqual(view(page).shown, shown, `${build}: back to Just me's fragment: nothing hidden`);
    page.go("#meals-and-5d-b");
    assert.deepEqual(view(page).shown, shown, `${build}: forward: nothing hidden`);
    tap(page, "q-goal", "signature");
    assert.equal(view(page).result, true, `${build}: the meal size: the result`);
    page.go("#individual");
    assert.deepEqual([view(page).shown, view(page).result], [shown, false], `${build}: back past every answer: every question still shown (no answers, no result)`);
    page.go("#signature-and-5d-b");
    assert.equal(view(page).result, true, `${build}: forward: the result again`);
  }
});

test("UC11: a link carrying answers or a size reveals every question at load, its answers pressed, the rest at their defaults (A item 5)", () => {
  // Each link's answers, written from § 3's fragment rule (SPEC-meal-selection) and data/plans.json's defaults (no
  // weekends, no breakfast); `#lean-7` is today's count (7: or, every day).
  const LINKS = {
    "#lean": { "q-lunch_dinner": null, "q-weekends": "no", "q-breakfast": "no", "q-goal": "lean", result: false },
    "#lean-or-5d-b": { "q-lunch_dinner": "or", "q-weekends": "no", "q-breakfast": "yes", "q-goal": "lean", result: true },
    "#meals-and-7d": { "q-lunch_dinner": "and", "q-weekends": "yes", "q-breakfast": "no", "q-goal": null, result: false },
    "#lean-7": { "q-lunch_dinner": "or", "q-weekends": "yes", "q-breakfast": "no", "q-goal": "lean", result: true },
  };
  for (const [build, html] of Object.entries(BUILDS)) {
    for (const [hash, { result, ...pressed }] of Object.entries(LINKS)) {
      const page = open(html, hash);
      const v = view(page);
      assert.deepEqual(v.shown, [WHO, ...CARTED], `${build}, ${hash}: every question shown`);
      assert.deepEqual(v.pressed, { [WHO]: "individual", ...pressed }, `${build}, ${hash}: its answers pressed, the rest at their defaults`);
      assert.equal(v.result, result, `${build}, ${hash}: the result card ${result ? "" : "not "}shown`);
      assert.ok(FAMILY.every((id) => revealed(page, id)), `${build}, ${hash}: Family's question revealed too (its panel hidden)`);
    }
    const family = open(html, "#family-or");
    assert.deepEqual(view(family).shown, [WHO, ...FAMILY], `${build}, #family-or: the Family panel`);
    assert.deepEqual([view(family).pressed["q-family"], view(family).result], ["or", true], `${build}, #family-or: its answer pressed, the result`);
    assert.ok(CARTED.every((id) => revealed(family, id)), `${build}, #family-or: every individual question revealed too (its panel hidden)`);
  }
});

// ⚠ Added with the code (the builder's reading, stated in § 4.1): a fragment this page view never wrote nor opened at (a
// link followed within the page, the address bar) is a link too; back and forward land on fragments the view has been at.
test("UC11: a fragment the page view never wrote, carrying answers or a size, reveals every question, as a link does (A item 5)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = open(html);
    page.go("#lean-or-7d");
    assert.deepEqual([view(page).shown, view(page).result], [[WHO, ...CARTED], true], `${build}: every question and the result`);
    const plain = open(html);
    plain.go("#family");
    assert.deepEqual(view(plain).shown, [WHO, ...FAMILY], `${build}: a fragment carrying neither changes the panel alone`);
    plain.go("#individual");
    assert.deepEqual(view(plain).shown, [WHO, "q-lunch_dinner"], `${build}: and back`);
  }
});

test("UC11: the fallback — an answer given, then the other answer to Who is this for? reveals every question of both panels (A item 6)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = open(html);
    tap(page, WHO, "individual");
    tap(page, "q-lunch_dinner", "or");
    tap(page, WHO, "family");
    assert.deepEqual(view(page).shown, [WHO, ...FAMILY], `${build}: on Family, its question`);
    assert.ok(CARTED.every((id) => revealed(page, id)), `${build}: every individual question revealed (its panel hidden)`);
    tap(page, WHO, "individual");
    const v = view(page);
    assert.deepEqual(v.shown, [WHO, ...CARTED], `${build}: back to Just me: every question shown`);
    assert.deepEqual(v.pressed, { [WHO]: "individual", "q-lunch_dinner": "or", "q-weekends": "no", "q-breakfast": "no", "q-goal": null }, `${build}: every question its answer, defaults included`);

    const family = open(html, "#family");
    tap(family, "q-family", "and");
    assert.equal(view(family).result, true, `${build}: control: Family answered`);
    tap(family, WHO, "individual");
    assert.deepEqual(view(family).shown, [WHO, ...CARTED], `${build}: Family's question answered, then Just me: every question shown`);
  }
});

test("UC11: a switch before any answer only changes the panel, its first question shown; re-pressing the same answer is no switch (A item 6)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = open(html);
    tap(page, WHO, "family");
    assert.deepEqual(view(page).shown, [WHO, ...FAMILY], `${build}: Family before any answer: its question alone`);
    assert.equal(revealed(page, "q-weekends"), false, `${build}: nothing more of the individual plan revealed`);
    tap(page, WHO, "individual");
    assert.deepEqual(view(page).shown, [WHO, "q-lunch_dinner"], `${build}: back: the first meal question alone`);
    tap(page, "q-lunch_dinner", "and");
    tap(page, WHO, "individual");
    assert.deepEqual(view(page).shown, [WHO, "q-lunch_dinner", "q-weekends"], `${build}: Just me pressed again after an answer: not a switch`);
    // ⚠ The builder's reading (§ 4.2.1): back to the start (no answer pressed) after an answer, then the other answer is a
    // flip from the answer last chosen, so every question of both panels shows.
    page.go("");
    assert.deepEqual(view(page).shown, [WHO], `${build}: back to the start: the first question alone`);
    tap(page, WHO, "family");
    assert.ok([...CARTED, ...FAMILY].every((id) => revealed(page, id)), `${build}: then Me and my family: every question revealed`);
  }
});

test("UC11: Family's one question, then the result card (A item 1)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = open(html, "#family");
    assert.equal(view(page).result, false, `${build}: control: no result before the answer`);
    tap(page, "q-family", "and");
    const v = view(page);
    assert.deepEqual([v.shown, v.pressed["q-family"], v.result, v.hash], [[WHO, ...FAMILY], "and", true, "#family-and"], `${build}: answered: the result card`);
  }
});

test("UC11: a question not yet revealed is hidden; revealing moves neither focus nor the scroll (A item 8)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    const page = open(html);
    for (const id of CARTED.slice(1)) {
      assert.equal(revealed(page, id), false, `${build}: #${id} carries hidden (its step or a group around it)`);
      for (const b of page.el(id).closest(".step").querySelectorAll("button")) assert.equal(hiddenInTree(b), true, `${build}: #${id}'s answers out of the tab order`);
    }
    const calls = browserParts(page);
    tap(page, WHO, "individual");
    for (const id of CARTED) tap(page, id, WALK[id]);
    assert.equal(view(page).result, true, `${build}: control: the walk reached the result`);
    assert.deepEqual(calls, [], `${build}: no focus moved, nothing scrolled`);
  }
});

test("UC11: every answer is sent as today, a reveal sends nothing; every button.choice read (D item 5)", () => {
  for (const [build, html] of Object.entries(BUILDS)) {
    assert.deepEqual(pageChoices(html).unread, [], `${build}: A3 reads every button.choice`);
    const visit = openVisit(html);
    const sent = () => visit.beacons.map((b) => b.body).filter((b) => b.event !== "open");
    const press = (id, a) =>
      visit.press(visit.document.querySelector(id === WHO ? `[data-who="${a}"]` : id === "q-goal" ? `[data-goal="${a}"]` : `[data-q="${id.slice(2)}"][data-a="${a}"]`));
    const named = (bodies) => bodies.map((b) => (b.event === "answer" ? `answer ${b.question} ${b.answer}` : b.event));
    const steps = [];
    for (const [id, a] of [[WHO, "individual"], ...CARTED.map((id) => [id, WALK[id]])]) {
      const before = sent().length;
      press(id, a);
      steps.push(named(sent().slice(before)));
    }
    assert.deepEqual(
      steps,
      [["answer who individual"], ["answer lunch_dinner or"], ["answer weekends no"], ["answer breakfast yes"], ["answer goal lean", "result"]],
      `${build}: one answer event a tap, the first question's included (§ 4.2 item 4), the result's after the meal size, nothing for a reveal`,
    );
    // § 4.2.1, the builder's reading of "every answer event is sent on its tap as today": a tap on the answer a link
    // already pressed is a tap, and sends its event, as a tap on any pressed answer always has.
    const linked = openVisit(html, { hash: "#individual" });
    const at = linked.beacons.length;
    linked.press(linked.document.querySelector('[data-who="individual"]'));
    assert.deepEqual(named(linked.beacons.slice(at).map((b) => b.body)), ["answer who individual"], `${build}: #individual, Just me tapped: its event`);
    assert.deepEqual(visit.touched, [], `${build}: nothing stored`);
    assert.equal(pressedOf(open(html, "#lean-or-7d"), "q-goal"), "lean", `${build}: control: the page's own reading`);
  }
});
