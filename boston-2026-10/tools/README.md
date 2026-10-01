# tools — helpers the site does not ship

**The rule of this directory**: each subdirectory is its **own npm package**, with its own
`package.json` and lockfile, so its dependencies never enter `boston-2026-10/`'s install (the one the
deploy runs). A tool whose dependencies the site or its tests need does not belong here.

| directory | what |
|---|---|
| [`render-flows/`](render-flows/README.md) | `npm run render:flows`: the flow diagrams as SVG + PNG (mermaid-cli, puppeteer) |
| [`storefront-watch/`](storefront-watch/README.md) | the storefront watch (SPEC-storefront-watch.md): an hourly check of the store's public bundle, and a headless smoke test of the cart hand-off on each release (puppeteer-core), with rung 2's two faces checked live (W10–W13: the progress screen, the payment untouched by the checkout's style, the hide list found, the order one-time; W14–W16: the rest of the hide list and the Total, the extras pop-up, the Fit AF logo); `accept --release main-<name>.js` takes a checked release into the baseline, and refuses if another is live (§ 8). It also holds the site's rung 2 cases that need Chrome (R2-45–R2-52's browser half), since the site never installs a browser driver |
| [`storybook/`](storybook/README.md) | Storybook 10 (`@storybook/html-vite`, a11y, docs; SPEC-storybook-microsite.md): every state of the microsite's page a visitor can reach, at 390 and 1280, production or development, for the Advisor's styling feedback. A story shows the page the site's own build writes (run when Storybook starts, into the package's git-ignored `node_modules/.cache/`), in a frame, at a fragment, pressing the page's own controls; the Date control's fixed clock is the one script it adds. `npm run storybook` (localhost:6016) and `build-storybook` (git-ignored `storybook-static/`); nothing is published. Its cases drive Chrome with its own `puppeteer-core` (the watch's version) and the watch's `chromePath` |
