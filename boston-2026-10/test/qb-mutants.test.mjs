// SPEC-print-pieces.md § 12 item 8's four mutants, each of which must turn its case red: the back's rule allowing a photo
// used elsewhere (Q22); the overflow check off (Q23); the back's page dropped (Q18); the approval mark ignored (Q26).
// Each change is made to a MIRROR of the package (qe-checks.mjs printMirror: never the tree,
// protocols/mutate-in-a-mirror) and checked by THE SAME function its case runs on this package (qb-checks.mjs). The
// unchanged mirror runs every check first, as the control, and passes. Each mutant's problems are written to the run's
// output (t.diagnostic): the red, as the check reports it. The builds make the tent card and the flyer alone (no four
// flyers), to keep Chrome's runs down; the cases on the package build all six pages.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NO_CHROME } from "./print-fixtures.mjs";
import { approvalProblems, BACK_GRAPHICS_FIXTURE, backFile, backGraphicsProblems, backRuleProblems, fitProblems, FRONT_FIXTURE, frontFile, frontWordsProblems, NO_POPPLER, pdfCarriesProblems, PLANS_FIXTURE, PLANS_RUNS, twoSidesProblems } from "./qb-checks.mjs";
import { printMirror } from "./qe-checks.mjs";

/** Replace `from` (present exactly once) with `to` in the mirror's file `rel`. */
async function edit(dir, rel, from, to) {
  const path = join(dir, rel);
  const text = await readFile(path, "utf8");
  assert.equal(text.split(from).length - 1, 1, `the mutation anchor is in ${rel} once: ${from}`);
  await writeFile(path, text.replace(from, () => to));
}

async function withMirror(change, fn) {
  const dir = await printMirror(change);
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const MUTANTS = {
  /** Q22: the back's array no longer checked against the photos placed elsewhere. */
  rule: [join("print", "assign.mjs"), "!array.some((id) => placed.has(id))", "true"],
  /** Q23: the overflow refusal never made. */
  overflow: [join("print", "checks.mjs"), "if (spacePx < -FIT_TOLERANCE_PX) refusals.push(", "if (false) refusals.push("],
  /** Q18: the flyer one-sided again, so its PDFs lose the back's page. */
  back: [join("print", "sizes.mjs"), "sides: 2", "sides: 1"],
  /** Q26: the approval mark read and dropped, but the words never approved. */
  approval: [join("print", "back.mjs"), "approved: marked,", "approved: false,"],
  /** Q27 (§ 12.1 item 5): the sheet no longer contained, so printing fragments the front and its lower parts are lost. */
  contained: [join("print", "print.css"), ".print-sheet { contain: strict; }", ".print-sheet { }"],
  /** Q28 (§ 13): front B's words read and ignored, so every flyer prints front A. */
  frontB: [join("print", "pages.mjs"), 'const b = !words && front && piece.id === "flyer" ? { front } : {};', "const b = {};"],
  // § 14 item 3: the bar drawn with none of its items
  barItems: [join("mockups", "pieces.mjs"), '<ul>${p.items.map((it) => `<li ${cite(it.line)}>${icon(it.icon, "fbk-icon")}<span>${esc(it.label)}</span></li>`).join("")}</ul>', "<ul></ul>"],
  // § 15 item 3: the plans drawn with none of their cards
  plansItems: [join("mockups", "pieces.mjs"), '<ul>${p.items.map((it) => `<li data-accent="${esc(it.plan)}" ${cite(it.line)}><b class="fbk-plan-name">${esc(it.name)}</b><span class="fbk-plan-line">${esc(it.text)}</span></li>`).join("")}</ul>', "<ul></ul>"],
};

test("§ 12 mutants (control): the unchanged mirror passes Q22's rule and Q26's", async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await backRuleProblems(dir), [], "Q22's rule");
    assert.deepEqual(await approvalProblems(dir), [], "Q26's rule");
  });
});

test("§ 12 mutants (control): the unchanged mirror passes Q18 and Q23", { skip: NO_CHROME }, async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await twoSidesProblems(dir, { fourFlyers: false }), [], "Q18");
    assert.deepEqual(await fitProblems(dir), [], "Q23");
  });
});

test("§ 12 mutant: the back's rule allowing a photo used elsewhere fails Q22", async (t) => {
  await withMirror((dir) => edit(dir, ...MUTANTS.rule), async (dir) => {
    const problems = await backRuleProblems(dir);
    t.diagnostic(`Q22 on the mutant: ${problems.length} problems: ${JSON.stringify(problems)}`);
    assert.ok(problems.some((p) => p.includes("the back holds a photo placed elsewhere")), problems.join("\n"));
  });
});

test("§ 12 mutant: the overflow check off fails Q23", { skip: NO_CHROME }, async (t) => {
  await withMirror((dir) => edit(dir, ...MUTANTS.overflow), async (dir) => {
    const problems = await fitProblems(dir);
    t.diagnostic(`Q23 on the mutant: ${problems.length} problems: ${JSON.stringify(problems)}`);
    // Q23 is red either way: the words are not refused at all, or (as the safe-margin check on the back still catches
    // words that run past the bottom edge) they are refused without the overflow being named. The second is what the
    // build does with the check off (2026-10-20): the safe margin is a second guard, not the one item 5 names.
    assert.ok(problems.some((p) => p.startsWith("too many words were not refused") || p.startsWith("too many words, refused as:")), problems.join("\n"));
  });
});

test("§ 12 mutant: the back's page dropped fails Q18", { skip: NO_CHROME }, async (t) => {
  await withMirror((dir) => edit(dir, ...MUTANTS.back), async (dir) => {
    const problems = await twoSidesProblems(dir, { fourFlyers: false });
    t.diagnostic(`Q18 on the mutant: ${problems.length} problems: ${JSON.stringify(problems)}`);
    assert.ok(problems.some((p) => /^flyer-PROOF\.pdf has 1 page\(s\), not 2$/.test(p)), problems.join("\n"));
  });
});

test("§ 12 mutant: the approval mark ignored fails Q26", async (t) => {
  await withMirror((dir) => edit(dir, ...MUTANTS.approval), async (dir) => {
    const problems = await approvalProblems(dir);
    t.diagnostic(`Q26 on the mutant: ${problems.length} problems: ${JSON.stringify(problems)}`);
    assert.ok(problems.includes("the words with the approval mark read as unapproved"), problems.join("\n"));
    assert.ok(problems.includes("the approved back still made the flyer a proof"), problems.join("\n"));
  });
});

test("§ 12.1 mutant (control): the unchanged mirror passes Q27", { skip: NO_CHROME || NO_POPPLER }, async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await pdfCarriesProblems(dir), []);
  });
});

test("§ 12.1 mutant: the sheet not contained fails Q27", { skip: NO_CHROME || NO_POPPLER }, async (t) => {
  await withMirror((dir) => edit(dir, ...MUTANTS.contained), async (dir) => {
    const problems = await pdfCarriesProblems(dir);
    t.diagnostic(`Q27 on the mutant: ${problems.length} problems: ${JSON.stringify(problems)}`);
    assert.ok(problems.some((p) => /^flyer-PROOF\.pdf page 1 lacks the text "eatfitaf\.com"$/.test(p)), problems.join("\n"));
    assert.ok(problems.some((p) => /^flyer-PROOF\.pdf page 1: the QR code's box is \d+% dark/.test(p)), problems.join("\n"));
  });
});

test("§ 13 mutant: front B's words ignored fails Q28 (the unchanged mirror, its control, passes)", { skip: NO_CHROME || NO_POPPLER }, async (t) => {
  const { dir: wordsDir, path } = await frontFile(FRONT_FIXTURE);
  try {
    await withMirror(async () => {}, async (dir) => assert.deepEqual(await frontWordsProblems(dir, path, FRONT_FIXTURE), [], "control"));
    await withMirror((dir) => edit(dir, ...MUTANTS.frontB), async (dir) => {
      const problems = await frontWordsProblems(dir, path, FRONT_FIXTURE);
      t.diagnostic(`Q28 on the mutant: ${problems.length} problems: ${JSON.stringify(problems)}`);
      assert.ok(problems.some((p) => p === 'flyer-PROOF.pdf page 1 lacks front B\'s "[A HEADLINE]"'), problems.join("\n"));
    });
  } finally {
    await rm(wordsDir, { recursive: true, force: true });
  }
});

test("§ 15 mutant: the plans' items dropped fails Q30 (the unchanged mirror, its control, passes)", { skip: NO_CHROME || NO_POPPLER }, async (t) => {
  const { dir: backDir, path } = await backFile(PLANS_FIXTURE);
  try {
    await withMirror(async () => {}, async (dir) => assert.deepEqual(await backGraphicsProblems(dir, path, PLANS_RUNS), [], "control"));
    await withMirror((dir) => edit(dir, ...MUTANTS.plansItems), async (dir) => {
      const problems = await backGraphicsProblems(dir, path, PLANS_RUNS);
      t.diagnostic(`Q30 on the mutant: ${problems.length} problems: ${JSON.stringify(problems)}`);
      assert.ok(problems.some((p) => p === 'flyer-PROOF.pdf page 2 lacks the back\'s "Plan one" in order'), problems.join("\n"));
    });
  } finally {
    await rm(backDir, { recursive: true, force: true });
  }
});

test("§ 14 mutant: the bar's items dropped fails Q29 (the unchanged mirror, its control, passes)", { skip: NO_CHROME || NO_POPPLER }, async (t) => {
  const { dir: backDir, path } = await backFile(BACK_GRAPHICS_FIXTURE);
  try {
    await withMirror(async () => {}, async (dir) => assert.deepEqual(await backGraphicsProblems(dir, path), [], "control"));
    await withMirror((dir) => edit(dir, ...MUTANTS.barItems), async (dir) => {
      const problems = await backGraphicsProblems(dir, path);
      t.diagnostic(`Q29 on the mutant: ${problems.length} problems: ${JSON.stringify(problems)}`);
      assert.ok(problems.some((p) => p === 'flyer-PROOF.pdf page 2 lacks the back\'s "Label one" in order'), problems.join("\n"));
    });
  } finally {
    await rm(backDir, { recursive: true, force: true });
  }
});
