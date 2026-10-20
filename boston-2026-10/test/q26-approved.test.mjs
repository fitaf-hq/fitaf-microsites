// Q26 (SPEC-print-pieces.md § 12 item 4, § 4's rule): until the Advisor marks the words approved (`<!-- approved -->` as
// the file's last line) the back is a proof. The rule, no Chrome, over the committed file (qb-checks.mjs
// approvalProblems, which the mutant "the approval mark ignored" runs on a mirror). Built with fixture photos and a named
// offer, so that the back's words are the one placeholder left, from words that fit (print-fixtures.mjs; whether the
// committed ones fit is Q23's): without the mark the flyer is flyer-PROOF.pdf, its back flyer-back-PROOF.png, and the
// report's last line names the back's words; with the mark, flyer.pdf, flyer.png, flyer-back.png, and the last line says
// none remain.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { OFFERS_PATH } from "../mockups/build-mockups.mjs";
import { lockedBuild, NO_CHROME, photoSet } from "./print-fixtures.mjs";
import { approvalProblems, approved, backFile, fittingBack, ON } from "./qb-checks.mjs";

const set = await photoSet();
const marked = await backFile(approved(await fittingBack()));
after(() => Promise.all([set.dir, marked.dir].map((d) => rm(d, { recursive: true, force: true }))));
const offers = JSON.parse(await readFile(OFFERS_PATH, "utf8"));
const namedOffersPath = join(set.dir, "offers-named.json");
await writeFile(namedOffersPath, JSON.stringify({ ...offers, status: "approved", offers: offers.offers.map((o) => ({ ...o, label: "Q26 NAMED OFFER" })) }));

test("Q26: the rule: the committed back is unapproved and a proof; with the mark, approved and not", async () => {
  assert.deepEqual(await approvalProblems(ROOT), []);
});

test("Q26: built, without the mark the flyer and its back are proofs, named on the last line; with it, not", { skip: NO_CHROME }, async () => {
  const proof = join(set.dir, "dist-proof");
  const built = await lockedBuild({ outDir: proof, ...set.photos, offersPath: namedOffersPath, today: ON, fourFlyers: false });
  assert.deepEqual((await readdir(proof)).sort(), ["assignment.json", "flyer-PROOF.pdf", "flyer-PROOF.png", "flyer-back-PROOF.png", "tent-card.pdf", "tent-card.png"]);
  assert.equal(built.lines.at(-1), "placeholders remain: flyer-PROOF.pdf (the back's words, data/flyer-back.md not marked approved)");

  const final = join(set.dir, "dist-final");
  const done = await lockedBuild({ outDir: final, ...set.photos, offersPath: namedOffersPath, backPath: marked.path, today: ON, fourFlyers: false });
  assert.deepEqual((await readdir(final)).sort(), ["assignment.json", "flyer-back.png", "flyer.pdf", "flyer.png", "tent-card.pdf", "tent-card.png"]);
  assert.equal(done.lines.at(-1), "placeholders remain: none (tent-card.pdf, flyer.pdf)");
});
