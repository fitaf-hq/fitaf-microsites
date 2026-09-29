# tools/render-flows — the flow-diagram renderer

**Why this is its own package**: the renderer needs `@mermaid-js/mermaid-cli` and `puppeteer`, about
two hundred packages, and the site never does. The deploy runs `npm ci` in `boston-2026-10/` inside a
job that holds infrastructure credentials, where every install script in that tree runs; so the
renderer's dependencies live here, in a lockfile the deploy never installs.

| file | what |
|---|---|
| `package.json`, `package-lock.json` | the two pinned devDependencies (`@mermaid-js/mermaid-cli` 12.0.0, `puppeteer` 25.12.0) and their tree |
| `render-flows.mjs` | the renderer: every ` ```mermaid ` block in `../../flows/*.md` → `../../flows/rendered/<name>.svg` + `.png` |
| `.puppeteerrc.cjs` | the browser it drives: the installed Chrome, never a download (at install or at launch) |

## Run

```sh
npm --prefix boston-2026-10/tools/render-flows ci      # once, and after this lockfile changes
npm --prefix boston-2026-10 run render:flows           # delegates to this package's `render`
```

Set `PUPPETEER_EXECUTABLE_PATH` where Chrome is not at the path in `.puppeteerrc.cjs`.

## What a reader would misread

- **The browser-free half is not here.** The block extraction, the stamps and the theme
  (`../../scripts/flow-sources.mjs`, `../../scripts/flow-theme.mjs`) stay in the site package, because
  its test F1 uses them on every `npm test` to fail a stale render. They import only `node:` modules, so
  this package runs on its own install alone.
- **Nothing in `boston-2026-10/package.json` installs this package.** The root's `render:flows` only
  delegates; without the `ci` above it fails on a missing `@mermaid-js/mermaid-cli`.
