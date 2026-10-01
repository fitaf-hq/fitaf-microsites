// Storybook for the microsite (SPEC-storybook-microsite.md). Its own package: the site's install never gets any of this.
// A story shows the page the site's own build writes, in a frame; nothing of the page is written here (§ 2).
//
// When Storybook starts (or builds), microsite/pages.mjs runs the site's build for each build and date, once, into the
// package's node_modules/.cache/fitaf-microsite/ (MICROSITE_PAGES_DIR overrides it), and Storybook serves those files
// as static files under /microsite/. The development page asks for its fonts and logo from the site's root
// (/fonts/, /assets/), so those two directories of its build are served there too: the same files the production
// page finds beside itself. What the stories offer (the dates, the goals, the counts) reaches them as the virtual
// module virtual:microsite-pages, the pages' own manifest.
import { join } from "node:path";
import { buildPages, report } from "../microsite/pages.mjs";
import { PAGES_ROUTE, ROOT_STATIC } from "../microsite/layout.js";
import { PAGES_DIR } from "../microsite/paths.mjs";

const PAGES_MODULE = "virtual:microsite-pages";
/** The development build whose root-relative files are served at the root (any date's are the same files). */
const ROOT_FILES_FROM = join(PAGES_DIR, "development", "today");

let built;
/** The site's build for the stories: once per Storybook process, however often Storybook asks. */
const pages = () =>
  (built ??= buildPages().then((manifest) => {
    report(manifest);
    return manifest;
  }));

/** The virtual module the stories import what they offer from: the pages' manifest, as JSON. */
function pagesModule() {
  return {
    name: "microsite-pages",
    resolveId: (id) => (id === PAGES_MODULE ? `\0${PAGES_MODULE}` : null),
    async load(id) {
      return id === `\0${PAGES_MODULE}` ? `export default ${JSON.stringify(await pages())};\n` : null;
    },
  };
}

export default {
  stories: ["../stories/**/*.mdx", "../stories/**/*.stories.js"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: { name: "@storybook/html-vite", options: {} },
  // No request of Storybook's own leaves this machine: no telemetry, no "what's new" (§ 2 item 5); the development
  // server's update check is off on its command line (--no-version-updates).
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  async staticDirs(dirs = []) {
    await pages();
    return [
      ...dirs,
      { from: PAGES_DIR, to: `/${PAGES_ROUTE}` },
      ...ROOT_STATIC.map((dir) => ({ from: join(ROOT_FILES_FROM, dir), to: `/${dir}` })),
    ];
  },
  async viteFinal(config) {
    config.plugins = [...(config.plugins ?? []), pagesModule()];
    return config;
  },
};
