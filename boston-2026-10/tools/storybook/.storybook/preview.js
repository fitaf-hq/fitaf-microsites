// The preview's defaults (SPEC-storybook.md § 4): the smoke's two widths as viewports, the canvas full-bleed, and on
// the docs page every story in its own frame, since the screen is a manual popover over the whole viewport and one
// story's screen would otherwise cover the page.
export default {
  parameters: {
    layout: "fullscreen",
    viewport: {
      options: {
        w1280: { name: "1280 × 900 (the smoke's desktop)", styles: { width: "1280px", height: "900px" }, type: "desktop" },
        w390: { name: "390 × 844 (the smoke's phone)", styles: { width: "390px", height: "844px" }, type: "mobile" },
      },
    },
    docs: { story: { inline: false, iframeHeight: 640 } },
  },
  initialGlobals: { viewport: { value: "w1280", isRotated: false } },
};
