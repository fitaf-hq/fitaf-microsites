// SPEC-print-pieces.md § 3: which photo goes where, by rule, from Image Gauge's rungs file for the glam set
// (`pools.<pool>.rungs`; rung k holds arrays of k photo IDs that work together, and any array of a rung may be used: they
// are not ranked). The flyer takes the first photo of rung 1; the tent card's three positions take, in its order, the first
// array of rung 3 that does not contain the flyer's photo, so no photo is on both pieces. A pool, rung or array missing is
// refused, naming it. IDs only: no path, and an ID that is not a plain name (it becomes `<id>.jpg`) is refused.
export const POOL = "glam";
export const FLYER_POSITION = "flyer";
export const TENT_POSITIONS = ["tent-large", "tent-top", "tent-bottom"];
const PHOTO_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

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

/** The assignment: each position's photo ID, and which rung and array it came from. */
export function assignPhotos(doc, pool = POOL) {
  const rungs = doc?.pools?.[pool]?.rungs;
  if (!rungs || typeof rungs !== "object") throw new Error(`the rungs file has no pool "${pool}" (pools.${pool}.rungs)`);
  const one = rungs["1"];
  if (!one || typeof one !== "object") throw new Error(`pool "${pool}" has no rung 1`);
  const singles = rungOnePhotos(one, `pool "${pool}", rung 1`);
  if (singles.length === 0) throw new Error(`pool "${pool}", rung 1 names no photo`);
  const flyer = checkId(singles[0], `pool "${pool}", rung 1, photo 1`);

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
    from: {
      [FLYER_POSITION]: "rung 1, photo 1",
      ...Object.fromEntries(TENT_POSITIONS.map((p, j) => [p, `rung 3, array ${index + 1} (the first without the flyer's photo), photo ${j + 1}`])),
    },
  };
}
