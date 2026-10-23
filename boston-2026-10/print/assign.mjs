// SPEC-print-pieces.md § 3 and § 7: which photo goes where, by rule, from Image Gauge's rungs file for the glam set
// (`pools.<pool>.rungs`; rung k holds arrays of k photo IDs that work together, and any array of a rung may be used: they
// are not ranked). The flyer takes the first photo of rung 1 that is LANDSCAPE (its pixel width above its height: the
// flyer's window is landscape), the photos before it skipped and named; the tent card's three positions take, in its
// order, the first array of rung 3 that does not contain the flyer's photo, so no photo is on both pieces. A pool, rung or
// array missing is refused, naming it. IDs only: no path, and an ID that is not a plain name (it becomes a file name) is
// refused. Which FILE each position prints (§ 7 item 2, § 10 item 3): each of the tent's windows, square since § 10,
// Image Gauge's first good square for the photo (`<id>-sq-<key>.jpg`, the first key the glam deliverable lists), or the
// photo as composed when the deliverable has no square for it; the flyer, the photo as composed. § 12 (2026-10-20): the
// flyer's back takes three more, the first array of rung 3 holding none of the photos placed elsewhere, each its square.
export const POOL = "glam";
export const FLYER_POSITION = "flyer";
export const TENT_POSITIONS = ["tent-large", "tent-top", "tent-bottom"];
/**
 * § 12 item 6: the flyer's back's three photos, left to right. Print-only positions: they are in no mock-up and not in
 * mockups/photos.json (its nine are the mock-ups'); each is staged, as the manifest's are, under its own name (`<position>.jpg`).
 */
export const BACK_POSITIONS = ["flyer-back-1", "flyer-back-2", "flyer-back-3"];
/**
 * § 17: the giveaway tout's one photo, a print-only position as the back's are (staged as `tout.jpg`): since § 17.3 item 2
 * the flyer's photo (print/build-print.mjs stagePhotos), at the tout's own window.
 */
export const TOUT_POSITION = "tout";
/**
 * The positions printed from a square (§ 7 item 2 the two tiles, SPEC-photo-slots.md § 2's `square`; § 10 item 3 the
 * large photo too, its window square since § 10). § 12 item 6 put the back's three here too; § 15 item 8 (2026-10-21)
 * makes their windows the glam photos' own 3:2 under the names band, so they print as composed, as the flyer's does.
 */
export const SQUARE_POSITIONS = [...TENT_POSITIONS];
const PHOTO_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const PLAIN_KEY = PHOTO_ID;

function checkId(id, where) {
  if (typeof id !== "string" || !PHOTO_ID.test(id)) throw new Error(`${where}: ${JSON.stringify(id)} is not a photo ID`);
  return id;
}

/**
 * Rung 1's photos in the file's order. Image Gauge publishes rung 1 as `strongest` then `also_good` (both good; the
 * first is what he singled out), so that is the order; a rung 1 given as `arrays` of one ID is read the same way.
 */
function rungOnePhotos(rung, where) {
  if (Array.isArray(rung.arrays)) {
    return rung.arrays.map((a, i) => {
      if (!Array.isArray(a) || a.length !== 1) throw new Error(`${where}, array ${i + 1}: not one photo ID`);
      return a[0];
    });
  }
  const lists = [rung.strongest ?? [], rung.also_good ?? []];
  if (!lists.every(Array.isArray)) throw new Error(`${where}: "strongest" and "also_good" must be lists of photo IDs`);
  return lists.flat();
}

/**
 * The flyer's photo (§ 7 item 3): rung 1's first whose width exceeds its height, by `sizeOf(id)` ({ width, height },
 * upright, of the photo as composed; it throws when it cannot read one). The ones before it are skipped.
 */
function landscapeFirst(singles, sizeOf, where) {
  const skipped = [];
  for (const [i, id] of singles.entries()) {
    const from = `rung 1, photo ${i + 1}`;
    checkId(id, `${where}, photo ${i + 1}`);
    let size;
    try {
      size = sizeOf(id);
    } catch (err) {
      throw new Error(`${where}, photo ${i + 1}: ${err.message}`);
    }
    if (size.width > size.height) return { id, from, skipped };
    skipped.push({ id, from, width: size.width, height: size.height });
  }
  throw new Error(`${where}: no photo is landscape (width above height): ${skipped.length} skipped`);
}

/**
 * The assignment: each position's photo ID, which rung and array it came from, and the rung-1 photos the flyer skipped.
 * `sizeOf(id)` gives a photo's upright pixel size as composed (the build reads `<id>.jpg`'s header).
 */
export function assignPhotos(doc, { sizeOf, pool = POOL } = {}) {
  if (typeof sizeOf !== "function") throw new Error("the flyer's rule (§ 7 item 3) needs each photo's size: give sizeOf");
  const rungs = doc?.pools?.[pool]?.rungs;
  if (!rungs || typeof rungs !== "object") throw new Error(`the rungs file has no pool "${pool}" (pools.${pool}.rungs)`);
  const one = rungs["1"];
  if (!one || typeof one !== "object") throw new Error(`pool "${pool}" has no rung 1`);
  const singles = rungOnePhotos(one, `pool "${pool}", rung 1`);
  if (singles.length === 0) throw new Error(`pool "${pool}", rung 1 names no photo`);
  const chosen = landscapeFirst(singles, sizeOf, `pool "${pool}", rung 1`);
  const flyer = chosen.id;

  const three = rungs["3"];
  if (!three || !Array.isArray(three.arrays)) throw new Error(`pool "${pool}" has no rung 3 (its "arrays")`);
  if (three.arrays.length === 0) throw new Error(`pool "${pool}", rung 3 has no array`);
  three.arrays.forEach((array, i) => {
    const where = `pool "${pool}", rung 3, array ${i + 1}`;
    if (!Array.isArray(array) || array.length !== TENT_POSITIONS.length) throw new Error(`${where}: not ${TENT_POSITIONS.length} photo IDs`);
    array.forEach((id, j) => checkId(id, `${where}, photo ${j + 1}`));
  });
  const index = three.arrays.findIndex((array) => !array.includes(flyer));
  if (index === -1) throw new Error(`pool "${pool}", rung 3: every array contains the flyer's photo (rung 1's first)`);

  return {
    pool,
    positions: Object.fromEntries([[FLYER_POSITION, flyer], ...TENT_POSITIONS.map((p, j) => [p, three.arrays[index][j]])]),
    skipped: chosen.skipped,
    from: {
      [FLYER_POSITION]: chosen.from,
      ...Object.fromEntries(TENT_POSITIONS.map((p, j) => [p, `rung 3, array ${index + 1} (the first without the flyer's photo), photo ${j + 1}`])),
    },
  };
}

/** The report's lines for the rung-1 photos the flyer skipped, by their place in the rung (their IDs are in assignment.json). */
export const skippedLines = (assignment) =>
  assignment.skipped.map((s) => `flyer: skipped ${s.from} (${s.width} × ${s.height} px, not landscape)`);

/**
 * §§ 7 and 10: the file each position prints, by name in --photos-dir. A tent window is the photo's first good square, by
 * the first key the glam deliverable lists for it (`photos.<id>.squares[].key`); § 10 item 3: a photo with no square in
 * the deliverable (not listed, or listed with none) prints as composed, `<id>.jpg`, covered to its square window, and the
 * build's report names it. The flyer, the photo as composed. Only the tent's photos are looked up in the deliverable.
 */
export function photoFiles(assignment, deliverable) {
  if (!deliverable?.photos || typeof deliverable.photos !== "object") throw new Error('the deliverable has no "photos"');
  return Object.fromEntries(
    Object.entries(assignment.positions).map(([position, id]) => {
      const composed = `${id}.jpg`;
      if (!SQUARE_POSITIONS.includes(position)) return [position, composed];
      const squares = deliverable.photos[id]?.squares;
      if (squares === undefined || (Array.isArray(squares) && squares.length === 0)) return [position, composed];
      if (!Array.isArray(squares)) throw new Error(`photo position ${position}: the deliverable's squares for ${id} are not a list`);
      const key = squares[0]?.key;
      if (typeof key !== "string" || !PLAIN_KEY.test(key)) throw new Error(`photo position ${position}: ${id}'s first square key ${JSON.stringify(key)} is not a plain name`);
      return [position, `${id}-sq-${key}.jpg`];
    }),
  );
}

/** § 8 item 4: how many flyers, and so how many photos in a rung-4 array. */
export const FOUR = 4;

/**
 * § 8 item 4: the four flyers' photos, flyer-1 to flyer-4 in order: the first array of rung 4 that holds none of the
 * tent's three photos, if one exists, else the first array. A missing rung 4, an empty one, or an array that is not four
 * photo IDs is refused, naming it. Returns { ids, from }.
 */
export function fourFlyerPhotos(doc, tentIds, pool = POOL) {
  const rungs = doc?.pools?.[pool]?.rungs;
  if (!rungs || typeof rungs !== "object") throw new Error(`the rungs file has no pool "${pool}" (pools.${pool}.rungs)`);
  const four = rungs[String(FOUR)];
  if (!four || !Array.isArray(four.arrays)) throw new Error(`pool "${pool}" has no rung ${FOUR} (its "arrays")`);
  if (four.arrays.length === 0) throw new Error(`pool "${pool}", rung ${FOUR} has no array`);
  four.arrays.forEach((array, i) => {
    const where = `pool "${pool}", rung ${FOUR}, array ${i + 1}`;
    if (!Array.isArray(array) || array.length !== FOUR) throw new Error(`${where}: not ${FOUR} photo IDs`);
    array.forEach((id, j) => checkId(id, `${where}, photo ${j + 1}`));
  });
  const index = four.arrays.findIndex((array) => !array.some((id) => tentIds.includes(id)));
  const why = index === -1 ? "every array holds one of the tent's photos" : "the first without the tent's photos";
  const chosen = index === -1 ? 0 : index;
  return { ids: [...four.arrays[chosen]], from: `rung ${FOUR}, array ${chosen + 1} (${why})` };
}

/**
 * § 12 item 6: the back's three photos, flyer-back-1 to flyer-back-3, left to right: the first array of rung 3 that holds
 * none of `placedIds` (the photos the build places elsewhere: the flyer's, the four flyers', the tent's three), in its
 * order. A missing rung 3, an empty one, or an array that is not three photo IDs is refused, naming it; and so is a rung
 * 3 whose every array holds a photo placed elsewhere. Returns { ids, from }.
 */
export function backPhotoIds(doc, placedIds, pool = POOL) {
  const rungs = doc?.pools?.[pool]?.rungs;
  if (!rungs || typeof rungs !== "object") throw new Error(`the rungs file has no pool "${pool}" (pools.${pool}.rungs)`);
  const three = rungs["3"];
  if (!three || !Array.isArray(three.arrays)) throw new Error(`pool "${pool}" has no rung 3 (its "arrays")`);
  if (three.arrays.length === 0) throw new Error(`pool "${pool}", rung 3 has no array`);
  three.arrays.forEach((array, i) => {
    const where = `pool "${pool}", rung 3, array ${i + 1}`;
    if (!Array.isArray(array) || array.length !== BACK_POSITIONS.length) throw new Error(`${where}: not ${BACK_POSITIONS.length} photo IDs`);
    array.forEach((id, j) => checkId(id, `${where}, photo ${j + 1}`));
  });
  const placed = new Set(placedIds);
  const index = three.arrays.findIndex((array) => !array.some((id) => placed.has(id)));
  if (index === -1) throw new Error(`pool "${pool}", rung 3: every array holds a photo placed elsewhere (the flyer's, the four flyers' or the tent's)`);
  return { ids: [...three.arrays[index]], from: `rung 3, array ${index + 1} (the first holding no photo placed elsewhere)` };
}
