// The preview's defaults (SPEC-storybook-microsite.md § 3): the two widths as viewports, 390 the default, and the canvas
// full-bleed, so a story's frame is exactly the viewport's width.
import { DEFAULT_VIEWPORT, VIEWPORTS } from "../microsite/layout.js";

const options = Object.fromEntries(
  Object.entries(VIEWPORTS).map(([id, v]) => [id, { name: v.name, styles: { width: `${v.width}px`, height: `${v.height}px` }, type: v.type }]),
);

export default {
  parameters: {
    layout: "fullscreen",
    viewport: { options },
  },
  initialGlobals: { viewport: { value: DEFAULT_VIEWPORT, isRotated: false } },
};
