// `npm run render:flows` (in boston-2026-10, which delegates to this package's `render`): draws every
// mermaid block in flows/*.md to flows/rendered/<name>.svg (committed, stamped with its source's hash)
// and <name>.png (at 2×, for screen sharing; git-ignored).
//
// The theme comes from the page's :root tokens and @font-face rules (../../scripts/flow-theme.mjs),
// read at render time. Mermaid measures every label in the page's own fonts, loaded before it draws,
// and each SVG carries the faces it uses, so it looks the same wherever it is opened.
//
// Chrome is the one already installed (.puppeteerrc.cjs, or PUPPETEER_EXECUTABLE_PATH); nothing is
// downloaded. A block mermaid refuses is reported and the run exits 1 after drawing the others.
import { createRequire } from "node:module";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderMermaid } from "@mermaid-js/mermaid-cli";
import puppeteer from "puppeteer";
import { flowBlocks, RENDERED_DIR, stamp } from "../../scripts/flow-sources.mjs";
import { facesFor, flowTheme, fontFaceCss } from "../../scripts/flow-theme.mjs";

const require = createRequire(import.meta.url);
const PUPPETEER_RC = require("./.puppeteerrc.cjs");
const PACKAGE = require("./package.json");

/** Device pixels per CSS pixel in the PNG. */
const PNG_SCALE = 2;
/** Wide enough that no diagram is scaled down to fit (mermaid caps the SVG at its natural width). */
const VIEWPORT = { width: 4000, height: 1000 };
/** Files the render owns in flows/rendered/; anything else there (its README) is left alone. */
const OUTPUT = /\.(svg|png)$/;

const RENDERER = `@mermaid-js/mermaid-cli ${PACKAGE.devDependencies["@mermaid-js/mermaid-cli"]}`;

function launchOptions() {
  return { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? PUPPETEER_RC.executablePath, headless: true };
}

/**
 * The SVG as committed: its natural size in place of mermaid's `width="100%"` (which leaves an image
 * viewer nothing to size it by, so it shows as a 300px thumbnail), and its faces right after the
 * opening tag, ahead of mermaid's own <style>.
 */
function finishSvg(svg, faceCss) {
  return svg.replace(/^<svg\b[^>]*>/, (open) => {
    const [, w, h] = open.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/);
    const sized = open.replace(/\swidth="100%"/, ` width="${w}" height="${h}"`);
    if (sized === open) throw new Error('mermaid\'s <svg> no longer carries width="100%"; check the sizing');
    return `${sized}<style>${faceCss}</style>`;
  });
}

async function renderBlock(browser, block, theme, pageCss) {
  const options = {
    backgroundColor: theme.background,
    mermaidConfig: theme.config,
    customFontCSS: [{ cssUrl: new URL(`data:text/css;base64,${Buffer.from(pageCss).toString("base64")}`) }],
    fontEmbed: false,
    svgId: `flow-${block.name}`,
  };
  const svg = await renderMermaid(browser, block.source, "svg", options);
  const png = await renderMermaid(browser, block.source, "png", {
    ...options,
    viewport: { ...VIEWPORT, deviceScaleFactor: PNG_SCALE },
  });
  const svgFaces = await fontFaceCss(facesFor(block.source, theme.faces));
  const svgText = stamp(block, theme.hash, RENDERER) + finishSvg(new TextDecoder().decode(svg.data), svgFaces);
  await writeFile(join(RENDERED_DIR, `${block.name}.svg`), svgText);
  await writeFile(join(RENDERED_DIR, `${block.name}.png`), png.data);
}

/** Outputs no block draws any more (a block removed, or a file renamed). */
async function removeOrphans(names) {
  const keep = new Set(names.flatMap((n) => [`${n}.svg`, `${n}.png`]));
  const orphans = (await readdir(RENDERED_DIR)).filter((f) => OUTPUT.test(f) && !keep.has(f));
  await Promise.all(orphans.map((f) => rm(join(RENDERED_DIR, f))));
  return orphans;
}

async function main() {
  const theme = await flowTheme();
  // Every face the theme uses is loaded before mermaid measures anything; each SVG then carries its own.
  const pageCss = await fontFaceCss([...new Set(Object.values(theme.faces))]);
  const blocks = await flowBlocks();
  await mkdir(RENDERED_DIR, { recursive: true });

  const browser = await puppeteer.launch(launchOptions());
  const failures = [];
  try {
    for (const block of blocks) {
      try {
        await renderBlock(browser, block, theme, pageCss);
        const sizes = await Promise.all(["svg", "png"].map(async (ext) => (await stat(join(RENDERED_DIR, `${block.name}.${ext}`))).size));
        console.log(`ok   ${block.file} block ${block.index + 1} → rendered/${block.name}.svg (${sizes[0]} B) + .png (${sizes[1]} B)`);
      } catch (error) {
        failures.push({ block, error });
        console.error(`FAIL ${block.file} block ${block.index + 1} (${block.name}): ${error.message}`);
      }
    }
  } finally {
    await browser.close();
  }
  for (const orphan of await removeOrphans(blocks.map((b) => b.name))) console.log(`removed rendered/${orphan}`);
  console.log(`${blocks.length - failures.length} of ${blocks.length} blocks rendered (theme ${theme.hash.slice(0, 12)})`);
  return failures.length ? 1 : 0;
}

// Exit explicitly once stdout has drained: the first run on 2026-09-29 wrote every output, closed the
// browser, printed its summary and then stayed alive for 7 minutes (not reproduced in the runs after).
const code = await main();
process.stdout.write("", () => process.exit(code));
