// The Hand-off stories' placeholder photographs (SPEC-storybook-microsite.md § 8.1 item 4): GENERATED when the store is
// built, never a photograph file (SM-7). Each meal's tile is a rectangle of one of the page's colour tokens (read from
// src/template.html by the site's own scripts/flow-theme.mjs, never written here) with the meal's initial on it, as SVG
// text. The store's cards and its checkout's order lines ask for /img/meal-<i>.svg (the fixture's image for its i-th
// meal), so the tile answers there: the screen's slide reuses the card's loaded image (SPEC-rung2-progress-and-checkout
// § 2 item 2) and the checkout's line shows the store's own image, each the meal's tile.
//
// ⚠ The block's own photographs (§ 17: a cell of Fit AF's photo sheet, carried by the link) come only from the two
// hosts on its fixed list (src/storefront/photo-hosts.js), which no story may reach (§ 8.1 item 5); so the stories'
// links carry no photo part, and a slide shows its card's image, as on a link without one.

/** The tokens the tiles cycle through, by name; their values are the page's own. */
export const TILE_TOKENS = ["--lean", "--signature", "--performance", "--family", "--teal", "--orange"];
/** The initial's colour, a token too. */
export const INITIAL_TOKEN = "--navy";
/** The fixture's own card image is 320 × 200; a tile has its size, so the store lays it out the same. */
const TILE_WIDTH = 320;
const TILE_HEIGHT = 200;
const INITIAL_SIZE = 120;
const XML = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const HEX = /^#[0-9a-f]{3,8}$/i;

/** The file the store asks for meal `i`'s image at (the fixture's own path, under /img/). */
export const tileFile = (i) => `meal-${i}.svg`;

/** Meal `name`'s tile (the `i`-th of the fixture's meals), as SVG text, from the page's `tokens` (`--navy` → `#1b2360`). */
export function tileSvg(name, i, tokens) {
  const fill = tokens[TILE_TOKENS[i % TILE_TOKENS.length]];
  const ink = tokens[INITIAL_TOKEN];
  for (const [what, value] of [["fill", fill], ["initial", ink]]) {
    if (!HEX.test(value ?? "")) throw new Error(`a tile's ${what} is not one of the page's colour tokens: ${value}`);
  }
  const initial = [...name.trim()][0].toUpperCase().replace(/[&<>"]/g, (c) => XML[c]);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_WIDTH}" height="${TILE_HEIGHT}" viewBox="0 0 ${TILE_WIDTH} ${TILE_HEIGHT}">` +
    `<rect width="${TILE_WIDTH}" height="${TILE_HEIGHT}" fill="${fill}"/>` +
    `<text x="${TILE_WIDTH / 2}" y="${TILE_HEIGHT / 2}" dominant-baseline="central" text-anchor="middle" ` +
    `font-family="system-ui, sans-serif" font-size="${INITIAL_SIZE}" font-weight="700" fill="${ink}">${initial}</text></svg>\n`
  );
}
