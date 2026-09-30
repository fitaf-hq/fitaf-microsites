# tools — helpers the site does not ship

**The rule of this directory**: each subdirectory is its **own npm package**, with its own
`package.json` and lockfile, so its dependencies never enter `boston-2026-10/`'s install (the one the
deploy runs). A tool whose dependencies the site or its tests need does not belong here.

| directory | what |
|---|---|
| [`render-flows/`](render-flows/README.md) | `npm run render:flows`: the flow diagrams as SVG + PNG (mermaid-cli, puppeteer) |
| [`storefront-watch/`](storefront-watch/README.md) | the storefront watch (SPEC-storefront-watch.md): an hourly check of the store's public bundle, and a headless smoke test of the cart hand-off on each release (puppeteer-core); `accept --release main-<name>.js` takes a checked release into the baseline, and refuses if another is live (§ 8) |
