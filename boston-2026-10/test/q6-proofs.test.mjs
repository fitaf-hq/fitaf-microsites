// Q6 (SPEC-print-pieces.md § 4, § 5): proofs. A piece carrying any placeholder (a photo position without a photo, or the
// offer while it is a placeholder) is a proof: its files end "-PROOF", and the build's last line says which placeholders
// remain. Only a piece with none is named flyer.pdf / tent-card.pdf (§ 8 named a tent card by its logo variant's letter;
// §§ 9–10 withdrew the variants). The offers are as committed (status placeholder) unless a mirror of data/offers.json
// names a real one. Since SPEC-save-offer-production § 10.2 (2026-10-22) the Boston event offer's label is approved; this
// line's print build still lists the offer while the file's status is placeholder, so what remains is that label.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadInputs, MOCKUPS_DIR, OFFERS_PATH } from "../mockups/build-mockups.mjs";
import { stemOf } from "../print/build-print.mjs";
import { offerIsPlaceholder, pagesToPrint, placeholdersOf } from "../print/pages.mjs";
import { PRINT_PIECES } from "../print/sizes.mjs";
import { lockedBuild, NO_CHROME, photoSet } from "./print-fixtures.mjs";

const set = await photoSet();
after(() => rm(set.dir, { recursive: true, force: true }));
const [flyer, tent] = ["flyer", "tent-card"].map((id) => PRINT_PIECES.find((p) => p.id === id));
/** Since §§ 9–10 no page carries a variant's letter (Q14). -PROOF after its name. */
const page = (base) => pagesToPrint().find((p) => p.base === base);
const committedOffers = JSON.parse(await readFile(OFFERS_PATH, "utf8"));
/** The offer on the pieces' date (2026-10-20, the Boston event's), as the build lists it while it remains. */
const REMAINS = `the offer "${committedOffers.offers.find((o) => o.id === "event-boston-2026-10-placeholder").label}"`;
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
  await writeFile(labelOnly, JSON.stringify({ ...committedOffers, status: "approved", offers: committedOffers.offers.map((o) => ({ ...o, label: "[The offer]" })) }));
  assert.equal(offerIsPlaceholder(await loadInputs({ photosDir: noPhotos, today: "2026-10-20", offersPath: labelOnly })), true, "label [The offer]");
});

test("Q6: no photos: every position and the offer remain, and both pieces are proofs", async () => {
  const inputs = await loadInputs({ photosDir: noPhotos, today: "2026-10-20" });
  assert.deepEqual(placeholdersOf(flyer, inputs), ["photo flyer", REMAINS]);
  assert.deepEqual(placeholdersOf(tent, inputs), ["photo tent-large", "photo tent-top", "photo tent-bottom", REMAINS]);
  assert.equal(stemOf(page("flyer"), placeholdersOf(flyer, inputs)), "flyer-PROOF");
  assert.equal(stemOf(page("flyer-3"), placeholdersOf(flyer, inputs)), "flyer-3-PROOF");
  assert.equal(stemOf(page("tent-card"), placeholdersOf(tent, inputs)), "tent-card-PROOF");
});

test("Q6: photos but the offer a placeholder: still proofs, the offer alone remaining", async () => {
  const inputs = await loadInputs({ photosDir: allPhotos, today: "2026-10-20" });
  assert.deepEqual(placeholdersOf(flyer, inputs), [REMAINS]);
  assert.equal(stemOf(page("tent-card"), placeholdersOf(tent, inputs)), "tent-card-PROOF");
});

test("Q6: photos and a named offer: nothing remains, and the files take the plain names", async () => {
  const inputs = await loadInputs({ photosDir: allPhotos, today: "2026-10-20", offersPath: namedOffersPath });
  assert.deepEqual(placeholdersOf(flyer, inputs), []);
  assert.deepEqual(placeholdersOf(tent, inputs), []);
  assert.deepEqual([stemOf(page("flyer"), []), stemOf(page("tent-card"), [])], ["flyer", "tent-card"]);
});

test("Q6: built with no photos, the files end -PROOF and the last line lists what remains", { skip: NO_CHROME }, async () => {
  const out = join(set.dir, "dist-placeholders");
  const built = await lockedBuild({ outDir: out, today: "2026-10-20" });
  const four = [1, 2, 3, 4].flatMap((k) => [`flyer-${k}-PROOF.pdf`, `flyer-${k}-PROOF.png`]);
  const files = ["assignment.json", ...four, "flyer-1-4-PROOF.png", "flyer-PROOF.pdf", "flyer-PROOF.png", "tent-card-PROOF.pdf", "tent-card-PROOF.png"];
  assert.deepEqual((await readdir(out)).sort(), files.sort());
  // The pages grouped by what remains on them, in the build's order
  assert.equal(
    built.lines.at(-1),
    `placeholders remain: tent-card-PROOF.pdf (photo tent-large, photo tent-top, photo tent-bottom, ${REMAINS}); ` +
      `flyer-PROOF.pdf, flyer-1-PROOF.pdf, flyer-2-PROOF.pdf, flyer-3-PROOF.pdf, flyer-4-PROOF.pdf (photo flyer, ${REMAINS})`,
  );
});

test("Q6: built with photos and a named offer, the files take the plain names and the last line says none remain", { skip: NO_CHROME }, async () => {
  const out = join(set.dir, "dist-final");
  const built = await lockedBuild({ outDir: out, ...set.photos, offersPath: namedOffersPath, today: "2026-10-20", fourFlyers: false });
  assert.deepEqual((await readdir(out)).sort(), ["assignment.json", "flyer.pdf", "flyer.png", "tent-card.pdf", "tent-card.png"]);
  assert.equal(built.lines.at(-1), "placeholders remain: none (tent-card.pdf, flyer.pdf)");
});
