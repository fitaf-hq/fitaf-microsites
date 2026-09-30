# tools — helpers the site does not ship

**The rule of this directory**: each subdirectory is its **own npm package**, with its own
`package.json` and lockfile, so its dependencies never enter `boston-2026-10/`'s install (the one the
deploy runs). A tool whose dependencies the site or its tests need does not belong here.

| directory | what |
|---|---|
| [`render-flows/`](render-flows/README.md) | `npm run render:flows`: the flow diagrams as SVG + PNG (mermaid-cli, puppeteer) |
| [`storybook/`](storybook/README.md) | Storybook 10 (`@storybook/html-vite`, a11y, docs; SPEC-storybook.md): where the microsite's UI is designed, first the deep-carting progress screen, rendered by its own module (`src/storefront/progress-screen.js`) with the build's own words and colours; `npm run storybook` (localhost:6016) and `build-storybook` (git-ignored `storybook-static/`); stand-in cards with generated placeholder photos, never a photograph |
| [`storefront-watch/`](storefront-watch/README.md) | the storefront watch (SPEC-storefront-watch.md): an hourly check of the store's public bundle, and a headless smoke test of the cart hand-off on each release (puppeteer-core), with rung 2's two faces checked live (W10–W13: the progress screen, the payment untouched by the checkout's style, the hide list found, the order one-time); `accept --release main-<name>.js` takes a checked release into the baseline, and refuses if another is live (§ 8). It also holds the site's rung 2 cases that need Chrome (R2-45–R2-52's browser half), since the site never installs a browser driver |
