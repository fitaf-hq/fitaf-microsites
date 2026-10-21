// Q28 (SPEC-print-pieces.md § 13): front B. Its words file is refused outside print/front.mjs's keys, naming the key;
// built with a fixture's neutral bracketed words, every flyer's page 1 carries them, the offer and the address as text in
// the PDF and its QR code drawn (Q27's reader), no part is less than the safe margin inside the trim, its back is front
// A's back to the pixel, and the flyers are proofs until the words are approved. The words are a fixture's, never a
// candidate's: the candidates are not approved and this repository is public.
import test from "node:test";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { readFront } from "../print/front.mjs";
import { lockedBuild, NO_CHROME, photoSet } from "./print-fixtures.mjs";
import { FRONT_FIXTURE, frontWordsProblems, NO_POPPLER, pdfCarriesProblems } from "./qb-checks.mjs";

const FIXTURE = FRONT_FIXTURE;

async function withFront(words, fn) {
  const dir = await mkdtemp(join(tmpdir(), "boston-q28-"));
  try {
    const path = join(dir, "front-words.json");
    await writeFile(path, typeof words === "string" ? words : JSON.stringify(words));
    return await fn(path, dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("Q28: a front words file outside its keys is refused, naming the key", async () => {
  const cases = [
    [{ ...FIXTURE, colour: "red" }, /"colour" is not one of/],
    [{ ...FIXTURE, headline: [] }, /"headline" must be one to 3 lines/],
    [{ ...FIXTURE, headline: ["a", "b", "c", "d"] }, /"headline" must be one to 3 lines/],
    [{ ...FIXTURE, accent: 2 }, /"accent" must be the index of one of the headline's 2 lines/],
    [{ ...FIXTURE, lede: "" }, /"lede" must be a line of text/],
    [{ ...FIXTURE, callout: ["a", "b", "c", "d"] }, /"callout" must be one to 3 lines/],
    [{ ...FIXTURE, approved: "yes" }, /"approved" must be true or false/],
  ];
  for (const [words, why] of cases) await withFront(words, (path) => assert.rejects(readFront(path), why));
  await withFront(FIXTURE, async (path) => {
    const read = await readFront(path);
    assert.deepEqual([read.headline, read.accent, read.callout, read.approved], [FIXTURE.headline, 1, FIXTURE.callout, false]);
  });
});

test("Q28: built, front B's every page carries its words and QR code in the PDF", { skip: NO_CHROME || NO_POPPLER }, async () => {
  await withFront(FIXTURE, async (path) => {
    assert.deepEqual(await frontWordsProblems(ROOT, path, FIXTURE), [], "front B's own words");
    assert.deepEqual(await pdfCarriesProblems(ROOT, { frontPath: path }), [], "every run the build measured");
  });
});

test("Q28: front B inside the safe margin, its back front A's, a proof until approved", { skip: NO_CHROME }, async () => {
  const dir = await mkdtemp(join(tmpdir(), "boston-q28-builds-"));
  try {
    const a = await lockedBuild({ outDir: join(dir, "a"), fourFlyers: false });
    await withFront(FIXTURE, async (path) => {
      const b = await lockedBuild({ outDir: join(dir, "b"), fourFlyers: false, frontPath: path });
      assert.deepEqual(b.lines.filter((l) => l.startsWith("safe margin")), []);
      const backOf = (built) => built.planned.find((p) => p.piece.id === "flyer").back.hash;
      assert.equal(backOf(b), backOf(a));
      const flyer = b.planned.find((p) => p.piece.id === "flyer");
      assert.match(flyer.stem, /-PROOF$/);
      assert.ok(flyer.placeholders.includes("front B's words, front-words.json not approved"));
      assert.match(b.lines[0], /^front B: the words of front-words\.json/);
    });
    await withFront({ ...FIXTURE, approved: true }, async (path) => {
      const b = await lockedBuild({ outDir: join(dir, "c"), fourFlyers: false, frontPath: path });
      const flyer = b.planned.find((p) => p.piece.id === "flyer");
      assert.ok(!flyer.placeholders.some((x) => x.startsWith("front B's words")));
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("Q28 (§ 13 item 8): the meals' names on front B's photo and the back's three, read from the PDF; a missing name refused", { skip: NO_CHROME || NO_POPPLER }, async () => {
  const set = await photoSet();
  const dir = await mkdtemp(join(tmpdir(), "boston-q28-names-"));
  try {
    // every fixture photo named, so whichever the rules place carries one; the case reads which they placed
    const names = Object.fromEntries(Object.entries(set.ids).map(([role, id]) => [id, `[Meal ${role}]`]));
    await withFront(FIXTURE, async (path) => {
      const namesPath = join(dir, "names.json");
      await writeFile(namesPath, JSON.stringify(names));
      const out = join(dir, "out");
      const built = await lockedBuild({ outDir: out, fourFlyers: false, frontPath: path, photoNamesPath: namesPath, ...set.photos });
      const flyer = built.planned.find((p) => p.piece.id === "flyer");
      const placed = built.chosen.assignment.positions;
      const page = (n) => execFileSync("pdftotext", ["-raw", "-f", String(n), "-l", String(n), join(out, `${flyer.stem}.pdf`), "-"]).toString("utf8");
      assert.ok(page(1).includes(names[placed.flyer]), "front B carries its photo's name");
      for (const p of ["flyer-back-1", "flyer-back-2", "flyer-back-3"]) assert.ok(page(2).includes(names[placed[p]]), `the back carries ${p}'s name`);
      assert.deepEqual(built.lines.filter((l) => l.startsWith("safe margin")), []);
      // the name of the photo at the back's middle square is missing: refused, naming the position
      const short = { ...names };
      delete short[placed["flyer-back-2"]];
      await writeFile(namesPath, JSON.stringify(short));
      await assert.rejects(lockedBuild({ outDir: join(dir, "out2"), fourFlyers: false, frontPath: path, photoNamesPath: namesPath, ...set.photos }), /names no meal for flyer's photo at flyer-back-2/);
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(set.dir, { recursive: true, force: true });
  }
});
