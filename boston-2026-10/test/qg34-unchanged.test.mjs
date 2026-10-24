// QG34 (SPEC-print-pieces.md § 17 item 5's Q34; test/qg-checks.mjs): the build without the flags unchanged. Built without
// photos (every piece a proof) from this package and from the package as it was before § 17's code (git archive of
// BEFORE_GIVEAWAY, the committed files, never a working tree): the same files, each byte-identical (a PDF's two dates
// aside). Built with both words files (a fixture's), the same files again, but assignment.json (the two new pages' entries
// and the tout's photo, alone) and exactly the new pieces' five files.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { ROOT } from "../build.mjs";
import { NO_CHROME } from "./print-fixtures.mjs";
import { BEFORE_GIVEAWAY, ENTRY_FIXTURE, NO_GIT_BASE, packageAt, TOUT_FIXTURE, unchangedProblems, wordsFile } from "./qg-checks.mjs";

const cleanup = [];
after(() => Promise.all(cleanup.map((dir) => rm(dir, { recursive: true, force: true }))));

test(`QG34: without the flags the build writes what ${BEFORE_GIVEAWAY}'s did, byte for byte; with them, those files and the giveaway's`, { skip: NO_CHROME || NO_GIT_BASE }, async () => {
  const before = await packageAt(ROOT, BEFORE_GIVEAWAY);
  const tout = await wordsFile(TOUT_FIXTURE, "tout-words.json");
  const entry = await wordsFile(ENTRY_FIXTURE, "entry-words.md");
  cleanup.push(before, tout.dir, entry.dir);
  assert.deepEqual(await unchangedProblems(ROOT, before, { toutPath: tout.path, entryPath: entry.path }), []);
});
