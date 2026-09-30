// Stand-ins for the store's page (SPEC-storybook.md § 3 items 3 and 4): meal names kept here (never the live menu), and
// stand-in meal cards, each an element holding an img and a .product__content-title, as the screen reads a card. Their
// photos are PLACEHOLDERS made at run time (an inline SVG: a tile in the page's navy with the meal's initial), never a
// photograph and never an image file: this repository is public and the photos are the Owner's.

export const MEALS = [
  "Birria de Res Bowl",
  "Chicken Pesto Pasta",
  "Jalapeño Lime Chicken",
  "Turkey Chili",
  "Salmon Rice Bowl",
  "Beef Bulgogi",
  "Chicken Tikka",
  "Shrimp Tacos",
  "Veggie Curry",
  "Lemon Herb Chicken",
  "Steak Fajita Bowl",
  "Teriyaki Chicken",
  "Pork Carnitas",
  "Mediterranean Bowl",
  "Buffalo Chicken Mac",
  "Korean BBQ Beef",
  "Thai Peanut Chicken",
  "Garlic Butter Salmon",
  "Chipotle Chicken Bowl",
  "Beef Stroganoff",
  "Cajun Shrimp Pasta",
];

/** The page's colours by name, from the build's reader's output ("--navy:#…;--cta:#…;…"). */
export const colours = (tokens) => Object.fromEntries(tokens.split(";").map((d) => d.split(":")));

/** A placeholder photo: a generated SVG tile with the meal's initial, as a data: URI. */
export function placeholder(name, tokens) {
  const c = colours(tokens);
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">',
    `<rect width="640" height="400" fill="${c["--navy"]}"/>`,
    `<text x="320" y="258" text-anchor="middle" font-family="system-ui, sans-serif" font-size="180" font-weight="700" fill="${c["--white"]}">`,
    `${name.trim()[0]}</text></svg>`,
  ].join("");
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Which meals get a photo: "none", "some" (every other one, as a page that has loaded only some), or "all". */
export const withPhoto = (photos, i) => photos === "all" || (photos === "some" && i % 2 === 0);

/**
 * `count` stand-in cards (detached: the screen only reads them), each photo loaded before it is returned, so the screen
 * sees it as the store's page would a photo it has already loaded (complete, with a width).
 */
export async function standInCards(count, photos, tokens) {
  const cards = MEALS.slice(0, count).map((name, i) => {
    const card = document.createElement("div");
    if (withPhoto(photos, i)) {
      const img = document.createElement("img");
      img.alt = "";
      img.src = placeholder(name, tokens);
      card.appendChild(img);
    }
    const title = document.createElement("div");
    title.className = "product__content-title";
    title.textContent = name;
    card.appendChild(title);
    return { name, card };
  });
  await Promise.all(cards.map(({ card }) => card.querySelector("img")?.decode().catch(() => null)));
  return cards;
}
