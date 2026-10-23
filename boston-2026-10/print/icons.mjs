// SPEC-print-pieces.md § 14 item 3: the icons the back's graphics may name, `{<name>}` in data/flyer-back.md. Plain line
// drawings made here (no outside icon set), on a 24-unit square, drawn in the colour around them (`currentColor`), so
// the print's colours stay the template's. A name not in this list is refused by print/back.mjs, naming its line.

const SHAPES = {
  // a grain stalk in a circle, struck through: the usual gluten-free mark
  "gluten-free":
    '<circle cx="12" cy="12" r="10"/><path d="M12 19V7M12 9c-2.2 0-3.2-1.6-3.2-3 1.8 0 3.2 1 3.2 3zM12 9c2.2 0 3.2-1.6 3.2-3-1.8 0-3.2 1-3.2 3zM12 13c-2.2 0-3.2-1.6-3.2-3 1.8 0 3.2 1 3.2 3zM12 13c2.2 0 3.2-1.6 3.2-3-1.8 0-3.2 1-3.2 3zM12 17c-2.2 0-3.2-1.6-3.2-3 1.8 0 3.2 1 3.2 3zM12 17c2.2 0 3.2-1.6 3.2-3-1.8 0-3.2 1-3.2 3zM5 5l14 14"/>',
  // a ring: the circle that stands for diabetes
  diabetic: '<circle cx="12" cy="12" r="8" stroke-width="3.2"/>',
  // a slice of bread with a minus sign
  "low-carb": '<path d="M6 20v-9a4 4 0 0 1-.5-7.5C7 2 9 2 12 2s5 0 6.5 1.5A4 4 0 0 1 18 11v9zM9 13h6"/>',
  // a leaf with its vein
  vegetarian: '<path d="M4 20c0-9 6-15 16-15 0 10-6 15-16 15zM4 20 15 9"/>',
  // a sprout: two leaves on a stem
  vegan: '<path d="M12 21v-9M12 12c0-4-3-6.5-8-6.5 0 4.5 3 6.5 8 6.5zM12 10c0-4 3-6.5 8-6.5 0 4.5-3 6.5-8 6.5z"/>',
  // § 16: a dumbbell, its handle between two large plates and two small ones
  "high-protein":
    '<rect x="4.5" y="4" width="4.5" height="16" rx="1.2"/><rect x="15" y="4" width="4.5" height="16" rx="1.2"/><path d="M9 12h6M4.5 7.5H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h1.5M19.5 7.5H21a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-1.5"/>',
  // § 16: an avocado halved, its stone showing
  keto: '<path d="M12 2.5c-2.6 0-4 2.4-4.6 5.2-.4 1.9-2.4 3.6-2.4 7.3a7 7 0 0 0 14 0c0-3.7-2-5.4-2.4-7.3C16 4.9 14.6 2.5 12 2.5z"/><circle cx="12" cy="15" r="3"/>',
  // § 16: a milk carton (its gable top and fin) in a circle, struck through, as gluten-free's grain stalk is
  "dairy-free": '<circle cx="12" cy="12" r="10"/><path d="M10.5 7V4.5h3V7M10.5 7 8 10.5h8L13.5 7zM8 10.5v8h8v-8M5 5l14 14"/>',
  // a phone with a tick on its screen
  order: '<rect x="6.5" y="2" width="11" height="20" rx="2"/><path d="M10.5 18h3M9.5 10l2 2 3.5-3.5"/>',
  // a pot with its steam
  cook: '<path d="M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM2 11h2M20 11h2M9.5 7c0-1.2 1.2-1.2 1.2-2.4M13.3 7c0-1.2 1.2-1.2 1.2-2.4"/>',
  // a van
  deliver: '<path d="M2 6h11v10H2zM13 9h4l4 4v3h-8"/><circle cx="6" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  // a fork and a knife
  eat: '<path d="M5 3v5a2.5 2.5 0 0 0 5 0V3M7.5 10.5V21M17.5 21V3c-2.2 2-3.5 5-3.5 9h3.5"/>',
};

/** The icon names a words file may give, `{<name>}`. */
export const ICON_NAMES = Object.keys(SHAPES);

/** The icon `name` as an inline SVG of class `cls`, drawn in the text colour around it. */
export function icon(name, cls) {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SHAPES[name]}</svg>`;
}
