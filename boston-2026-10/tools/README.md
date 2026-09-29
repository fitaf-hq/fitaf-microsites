# tools — helpers the site does not ship

**The rule of this directory**: each subdirectory is its **own npm package**, with its own
`package.json` and lockfile, so its dependencies never enter `boston-2026-10/`'s install (the one the
deploy runs). A tool whose dependencies the site or its tests need does not belong here.

| directory | what |
|---|---|
| [`render-flows/`](render-flows/README.md) | `npm run render:flows`: the flow diagrams as SVG + PNG (mermaid-cli, puppeteer) |
