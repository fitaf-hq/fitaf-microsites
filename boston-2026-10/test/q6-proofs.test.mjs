// Q6 (SPEC-print-pieces.md § 4, § 5): proofs. A piece carrying any placeholder (a photo position without a photo, or the
// offer while it is a placeholder) is a proof: its files end "-PROOF", and the build's last line says which placeholders
// remain. Only a piece with none is named flyer.pdf / tent-card.pdf. The offers are as committed (every one "[The offer]",
// status placeholder) unless a mirror of data/offers.json names a real one.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadInputs, MOCKUPS_DIR, OFFERS_PATH } from "../mockups/build-mockups.mjs";
import { stemOf } from "../print/build-print.mjs";
import { offerIsPlaceholder, placeholdersOf } from "../print/pages.mjs";
import { PRINT_PIECES } from "../print/sizes.mjs";
import { lockedBuild, NO_CHROME, photoSet } from "./print-fixtures.mjs";

const set = await photoSet();
after(() => rm(set.dir, { recursive: true, force: true }));
const [flyer, tent] = ["flyer", "tent-card"].map((id) => PRINT_PIECES.find((p) => p.id === id));
const committedOffers = JSON.parse(await readFile(OFFERS_PATH, "utf8"));
/** A mirror of data/offers.json whose offers are named (no bracketed stand-in) and whose status is not placeholder. */
const namedOffersPath = join(set.dir, "offers-named.json");
await writeFile(
  namedOffersPath,
  JSON.stringify({ ...committedOffers, status: "approved", offers: committedOffers.offers.map((o) => ({ ...o, label: "Q6 NAMED OFFER" })) }),
);
/** All three ways of placing the photos: none, all present (a folder holding each position's own file), and named offers. */
const noPhotos = join(MOCKUPS_DIR, "no-such-folder");
const allPhotos = join(set.dir, "positions");
await mkdir(allPhotos);
for (const position of PRINT_PIECES.flatMap((p) => p.positions)) await writeFile(join(allPhotos, `${position}.jpg`), "");

test("Q6: the committed offer is a placeholder; a named one is not", async () => {
  assert.equal(offerIsPlaceholder(await loadInputs({ photosDir: noPhotos, today: "2026-10-20" })), true);
  assert.equal(offerIsPlaceholder(await loadInputs({ photosDir: noPhotos, today: "2026-10-20", offersPath: namedOffersPath })), false);
  // Either sign keeps it a placeholder: the file's status, or a bracketed label
  const statusOnly = join(set.dir, "offers-status.json");
  await writeFile(statusOnly, JSON.stringify({ ...committedOffers, offers: committedOffers.offers.map((o) => ({ ...o, label: "Named" })) }));
  assert.equal(offerIsPlaceholder(await loadInputs({ photosDir: noPhotos, today: "2026-10-20", offersPath: statusOnly })), true, "status placeholder");
  const labelOnly = join(set.dir, "offers-label.json");
  await writeFile(labelOnly, JSON.stringify({ ...committedOffers, status: "approved" }));
  assert.equal(offerIsPlaceholder(await loadInputs({ photosDir: noPhotos, today: "2026-10-20", offersPath: labelOnly })), true, "label [The offer]");
});

test("Q6: no photos: every position and the offer remain, and both pieces are proofs", async () => {
  const inputs = await loadInputs({ photosDir: noPhotos, today: "2026-10-20" });
  assert.deepEqual(placeholdersOf(flyer, inputs), ["photo flyer", 'the offer "[The offer]"']);
  assert.deepEqual(placeholdersOf(tent, inputs), ["photo tent-large", "photo tent-top", "photo tent-bottom", 'the offer "[The offer]"']);
  assert.equal(stemOf(flyer, placeholdersOf(flyer, inputs)), "flyer-PROOF");
  assert.equal(stemOf(tent, placeholdersOf(tent, inputs)), "tent-card-PROOF");
});

test("Q6: photos but the offer a placeholder: still proofs, the offer alone remaining", async () => {
  const inputs = await loadInputs({ photosDir: allPhotos, today: "2026-10-20" });
  assert.deepEqual(placeholdersOf(flyer, inputs), ['the offer "[The offer]"']);
  assert.equal(stemOf(tent, placeholdersOf(tent, inputs)), "tent-card-PROOF");
});

test("Q6: photos and a named offer: nothing remains, and the files take the plain names", async () => {
  const inputs = await loadInputs({ photosDir: allPhotos, today: "2026-10-20", offersPath: namedOffersPath });
  assert.deepEqual(placeholdersOf(flyer, inputs), []);
  assert.deepEqual(placeholdersOf(tent, inputs), []);
  assert.deepEqual([stemOf(flyer, []), stemOf(tent, [])], ["flyer", "tent-card"]);
});

test("Q6: built with no photos, the files end -PROOF and the last line lists what remains", { skip: NO_CHROME }, async () => {
  const out = join(set.dir, "dist-placeholders");
  const built = await lockedBuild({ outDir: out, today: "2026-10-20" });
  assert.deepEqual((await readdir(out)).sort(), ["assignment.json", "flyer-PROOF.pdf", "flyer-PROOF.png", "tent-card-PROOF.pdf", "tent-card-PROOF.png"]);
  assert.equal(
    built.lines.at(-1),
    'placeholders remain: flyer-PROOF.pdf (photo flyer, the offer "[The offer]"); tent-card-PROOF.pdf (photo tent-large, photo tent-top, photo tent-bottom, the offer "[The offer]")',
  );
});

test("Q6: built with photos and a named offer, the files take the plain names and the last line says none remain", { skip: NO_CHROME }, async () => {
  const out = join(set.dir, "dist-final");
  const built = await lockedBuild({ outDir: out, ...set.photos, offersPath: namedOffersPath, today: "2026-10-20" });
  assert.deepEqual((await readdir(out)).sort(), ["assignment.json", "flyer.pdf", "flyer.png", "tent-card.pdf", "tent-card.png"]);
  assert.equal(built.lines.at(-1), "placeholders remain: none (flyer.pdf, tent-card.pdf)");
});
