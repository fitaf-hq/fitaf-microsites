// Q20 (SPEC-print-pieces.md § 12 items 3–4): the back's words are data/flyer-back.md's, the only source. The back's
// text is exactly the file's words in its order (its text runs against the file read the plain way, whitespace
// normalised: qb-checks.mjs fileWords), then the address of the bottom row, eatfitaf.com; in the markup and as Chrome
// lays the page out (the build's measuring pass). A word changed in a mirror of the file (Q7's way: a changed copy,
// never the file) changes the back, and not the front.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { loadInputs, MOCKUPS_DIR } from "../mockups/build-mockups.mjs";
import { campaign } from "../mockups/parts.mjs";
import { readBack } from "../print/back.mjs";
import { PRINT_DIR } from "../print/build-print.mjs";
import { backPage, printPage } from "../print/pages.mjs";
import { PRINT_PIECES } from "../print/sizes.mjs";
import { pieceRuns } from "./mockup-html.mjs";
import { FITTING_BACK_PATH, lockedBuild, NO_CHROME } from "./print-fixtures.mjs";
import { backFile, committedBack, committedBackPath, fileWords, joined, ON } from "./qb-checks.mjs";

const printCss = await readFile(join(PRINT_DIR, "print.css"), "utf8");
const inputs = await loadInputs({ photosDir: join(MOCKUPS_DIR, "no-such-folder"), today: ON });
const flyer = PRINT_PIECES.find((p) => p.id === "flyer");
const address = campaign(inputs).address.value;
const texts = (html) => pieceRuns(html).map((r) => r.text);
const text = await committedBack();
const WORD = "Q20CHANGEDWORD";
/** The word the mirror replaces: the lede's first. */
const lede = text.split("\n\n")[1];
const OLD = lede.split(/\s+/)[0];
const mirror = await backFile(text.replace(lede, lede.replace(OLD, WORD)));
after(() => rm(mirror.dir, { recursive: true, force: true }));

test("Q20: the back's text is the file's words in its order, then the address", async () => {
  const runs = texts(backPage(inputs, await readBack(committedBackPath()), printCss));
  assert.ok(fileWords(text).split(" ").length >= 50, "the file has its words (control)");
  assert.equal(runs.at(-1), address, "the bottom row's address, last");
  assert.equal(joined(runs.slice(0, -1)), fileWords(text));
});

test("Q20: a word changed in a mirror of the file changes the back, and not the front", async () => {
  assert.ok(OLD.length >= 3 && text.includes(OLD), `the word replaced, "${OLD}" (control)`);
  const before = joined(texts(backPage(inputs, await readBack(committedBackPath()), printCss)));
  const after_ = joined(texts(backPage(inputs, await readBack(mirror.path), printCss)));
  assert.ok(!before.includes(WORD) && after_.includes(WORD), "the back follows the file");
  assert.equal(after_, before.replace(OLD, WORD), "and nothing else on it changed");
  assert.ok(!joined(texts(printPage(flyer, inputs, printCss))).includes(WORD), "the front does not carry the back's words");
});

// Built with the words that fit (print-fixtures.mjs: the committed file less its last paragraph; whether the committed
// file fits is Q23's), against that file
test("Q20: built, the back as Chrome lays it out says the file's words in its order, then the address", { skip: NO_CHROME }, async (t) => {
  const out = join(mirror.dir, "dist-print");
  const fits = await readFile(FITTING_BACK_PATH, "utf8");
  const built = await lockedBuild({ outDir: out, today: ON, fourFlyers: false, backPath: FITTING_BACK_PATH });
  const [p] = built.planned.filter((q) => q.piece.id === "flyer");
  const [face] = p.back.measured.faces;
  const runs = face.texts.map((r) => r.text);
  t.diagnostic(`the back's ${runs.length} text runs`);
  assert.equal(runs.at(-1), address);
  assert.ok(fileWords(fits).split(" ").length >= 40, "the file has its words (control)");
  assert.equal(joined(runs.slice(0, -1)), fileWords(fits));
});
