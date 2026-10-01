// Storybook for the microsite (SPEC-storybook-microsite.md). Its own package: the site's install never gets any of this.
// A story shows the page the site's own build writes, in a frame; nothing of the page is written here (§ 2).
//
// NOT BUILT YET (red): the build hook of § 2 item 1 (the site's build, run when Storybook starts and builds, its pages
// served as static files) is not here.
export default {
  stories: ["../stories/**/*.mdx", "../stories/**/*.stories.js"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: { name: "@storybook/html-vite", options: {} },
  // No request of Storybook's own leaves this machine: no telemetry, no "what's new" (§ 2 item 5).
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
};
