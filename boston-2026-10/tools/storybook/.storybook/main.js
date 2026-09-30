// Storybook for the microsite's UI (SPEC-storybook.md), first the deep-carting progress screen. Its own package: the
// site's install never gets any of this. Nothing here ships: a story renders the screen's own module
// (src/storefront/progress-screen.js), imported, never copied.
//
// The screen's words and the page's colours reach the stories through the build's own readers (screenWords and
// screenTokens, scripts/screen-inputs.mjs: the functions scripts/build-storefront.mjs inlines into the Footer block),
// run here in Node when Storybook builds, and handed to the stories as a virtual module, virtual:fitaf-screen-inputs.
// No second parser, no copied value (§ 3 item 2).
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { screenTokens, screenWords } from "../../../scripts/screen-inputs.mjs";

const TOOL = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(TOOL, "..", "..");
const TEMPLATE = join(SITE, "src", "template.html");
const MESSAGES = join(SITE, "data", "messages.json");
const INPUTS = "virtual:fitaf-screen-inputs";

/** The virtual module the stories import their words and colours from: the build's readers' output, as JSON. */
function screenInputs() {
  return {
    name: "fitaf-screen-inputs",
    resolveId: (id) => (id === INPUTS ? `\0${INPUTS}` : null),
    async load(id) {
      if (id !== `\0${INPUTS}`) return null;
      this.addWatchFile(TEMPLATE);
      this.addWatchFile(MESSAGES);
      const tokens = screenTokens(await readFile(TEMPLATE, "utf8"));
      const words = screenWords(JSON.parse(await readFile(MESSAGES, "utf8")));
      return `export const tokens = ${JSON.stringify(tokens)};\nexport const words = ${JSON.stringify(words)};\n`;
    },
  };
}

export default {
  stories: ["../stories/**/*.stories.js"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: { name: "@storybook/html-vite", options: {} },
  // No request of Storybook's own leaves this machine: no telemetry, no "what's new".
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  async viteFinal(config) {
    config.plugins = [...(config.plugins ?? []), screenInputs()];
    // The screen's module lives in the site, outside this package: the development server may read this package (its
    // stories and its install, Vite's own default) and that one directory of the site, nothing else of it.
    const allow = config.server?.fs?.allow ?? [];
    config.server = { ...config.server, fs: { ...config.server?.fs, allow: [...allow, TOOL, join(SITE, "src", "storefront")] } };
    return config;
  },
};
