// QG33 (SPEC-print-pieces.md § 17 item 5's Q33; test/qg-checks.mjs): the -PROOF rule. A `[bracket]` in either words file
// keeps its piece a proof and is named, each once; none does not (with the words approved and every photo present); words
// not yet approved keep it a proof too (§ 13 item 3, which § 17 cites). Built, the report's last line names each bracket.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { bracketsOf } from "../print/pages.mjs";
import { lockedBuild, NO_CHROME } from "./print-fixtures.mjs";
import { ENTRY_FIXTURE, proofRuleProblems, wordsFile } from "./qg-checks.mjs";

test("QG33: a bracket proofs, none does not; each bracket named once", async () => {
  assert.deepEqual(await proofRuleProblems(ROOT), []);
  assert.deepEqual(bracketsOf(["about $[value], [a] and [value]", "no bracket", "[b]"]), ["[value]", "[a]", "[b]"]);
  assert.deepEqual(bracketsOf(["no bracket here", "nor ] here ["]), []);
});

test("QG33: built, the entry card with brackets is a proof and the report's last line names each", { skip: NO_CHROME }, async () => {
  const text = ENTRY_FIXTURE.replace("A second paragraph of fine print, its words plain.", "A second paragraph, about $[value], from [the sponsor].");
  assert.notEqual(text, ENTRY_FIXTURE, "the fixture holds the sentence the case puts its brackets in");
  const file = await wordsFile(text, "entry-words.md");
  const dir = await mkdtemp(join(tmpdir(), "boston-qg33-"));
  try {
    const built = await lockedBuild({ outDir: join(dir, "out"), fourFlyers: false, entryPath: file.path });
    const card = built.planned.find((p) => p.page.base === "entry-card");
    assert.equal(card.stem, "entry-card-PROOF");
    const last = built.lines.at(-1);
    assert.match(last, /^placeholders remain: /);
    for (const b of ["[value] in entry-words.md", "[the sponsor] in entry-words.md"]) assert.ok(last.includes(b), `the last line names ${b}: ${last}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(file.dir, { recursive: true, force: true });
  }
});
