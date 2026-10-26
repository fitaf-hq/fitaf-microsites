// SPEC-rung2-progress-and-checkout § 31.2 item 1, as a transform for the cases that compare a week's content with an
// earlier commit's (MS-20, EM5c, WC-9a). Not a test file itself. Since § 31.2 the link tool writes a cell for every item
// of a link, meals then snacks, where it wrote the meals' alone (SPEC-snacks-in-the-cart § 2, amended); so the earlier
// content is read with that one change made to it, and every other byte compares as before:
// each link with snack items (`_<key>`) AND a photo part gains, after its last cell, one cell per snack in the link's
// order: the week's sheet's cell for the snack (found by its key, src/storefront/meal-key.js over the sheet's names), as
// the tool writes a cell ("x,y,w,h" in base 36), or "" where the sheet has none. A link without a photo part, or without
// snacks, is left as it was. Written from the contract, not from scripts/handoff-link.mjs: the tool under test is not
// asked how it encodes.
import { mealKey } from "../src/storefront/meal-key.js";

const cellText = (c) => [c.x, c.y, c.w, c.h].map((n) => n.toString(36)).join(",");

/**
 * `bytes` (a week's content, or any text holding its links) with § 31.2 item 1 made to each link, the sheet `sheet`
 * ({ cells: { name: { x, y, w, h } } }). Returns { bytes, links, cells }: how many links gained cells, and how many of
 * the cells added were the sheet's (not "").
 */
export function withSnackCells(bytes, sheet) {
  const byKey = new Map(Object.entries(sheet?.cells ?? {}).map(([name, c]) => [mealKey(name), cellText(c)]));
  let links = 0;
  let cells = 0;
  const text = bytes.toString("utf8").replace(/#fitaf=([0-9a-z.*_~-]+)(![^"]*)"/g, (whole, meal, photo) => {
    const snacks = meal
      .split(".")
      .filter((part) => part.startsWith("_"))
      .map((part) => part.slice(1, 6));
    if (!snacks.length) return whole;
    links++;
    const added = snacks.map((key) => byKey.get(key) ?? "");
    cells += added.filter(Boolean).length;
    return `#fitaf=${meal}${photo}${added.map((c) => `!${c}`).join("")}"`;
  });
  return { bytes: Buffer.from(text, "utf8"), links, cells };
}

/**
 * The inverse, for the cases whose "before" is a hash (U4, WC-9c): `text` (a page, its visible text, or a week's
 * content) with each link's photo part cut back to its MEALS' cells, the cells § 31.2 item 1 added after them removed:
 * the host, the path, the width, then as many cells as the link has meal items (its `<key>` items, not `_<key>` or
 * `~<code>`). A link whose photo part already holds no more is left as it was. Returns { text, links }: how many links
 * were cut.
 */
export function withoutSnackCells(text) {
  let links = 0;
  const out = String(text).replace(/#fitaf=([0-9a-z.*_~-]+)(![^"&<\s]*)/g, (whole, meal, photo) => {
    const meals = meal.split(".").slice(1).filter((part) => !part.startsWith("_") && !part.startsWith("~")).length;
    const fields = photo.split("!"); // "", host, path, width, the cells
    if (fields.length <= 4 + meals) return whole;
    links++;
    return `#fitaf=${meal}${fields.slice(0, 4 + meals).join("!")}`;
  });
  return { text: out, links };
}
