// A static build of the stories for the cases that read one (SM-2, SM-3, SM-5, SM-8, SM-9, SM-10, SM-11). Not a test
// file itself.
//
// Each build is the package's own `build-storybook` script, into a temporary directory, with its pages (the site's
// build, § 2 item 1) and its store (the Hand-off stories' block and synthetic store, § 8.1) in temporary directories
// of their own, so no two test files share a directory and the tree is never written while a case runs. STORYBOOK_STATIC=<dir> reads an existing build instead (its pages beside it, under
// microsite/), for a quick local run; the suite as committed builds its own.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { MANIFEST, PAGES_ROUTE } from "../microsite/layout.js";
import { STORE_MANIFEST, STORE_ROUTE } from "../handoff/layout.js";
import { TOOL } from "./paths.mjs";

const run = promisify(execFile);
const OUTPUT_LIMIT_BYTES = 64 * 1024 * 1024;

/**
 * Run `npm run build-storybook` in `toolDir` into `outDir`; the pages go to `pagesDir`, the store to `storeDir` (by
 * default beside the pages: never the package's own cache, which the development server reads). Rejects on a failed build.
 */
export async function buildStorybook({ toolDir = TOOL, outDir, pagesDir, storeDir = `${pagesDir}-store`, env = {} }) {
  return run("npm", ["--prefix", toolDir, "run", "build-storybook", "--", "--output-dir", outDir, "--quiet"], {
    env: { ...process.env, STORYBOOK_DISABLE_TELEMETRY: "1", MICROSITE_PAGES_DIR: pagesDir, STOREFRONT_PAGES_DIR: storeDir, ...env },
    maxBuffer: OUTPUT_LIMIT_BYTES,
  });
}

let built;
let work = null;

/** This process's static build: { dir }. Built once, on first use. */
export function storybookStatic() {
  built ??= (async () => {
    const reuse = process.env.STORYBOOK_STATIC;
    if (!reuse) work = await mkdtemp(join(tmpdir(), "fitaf-storybook-microsite-"));
    const dir = reuse ?? join(work, "storybook-static");
    if (!reuse) await buildStorybook({ outDir: dir, pagesDir: join(work, "pages") });
    return { dir };
  })();
  return built;
}

/** Remove this process's static build, if it made one: each test file runs it in its top-level after(). */
export async function removeStorybookStatic() {
  if (work) await rm(work, { recursive: true, force: true });
}

/** The pages' manifest as the static build serves it. */
export async function readManifest(staticDir) {
  const path = join(staticDir, PAGES_ROUTE, MANIFEST);
  if (!existsSync(path)) throw new Error(`the static build serves no ${PAGES_ROUTE}/${MANIFEST}: the site's build did not run for it (§ 2 item 1)`);
  return JSON.parse(await readFile(path, "utf8"));
}

/** The Hand-off store's manifest as the static build keeps it (§ 8.1). */
export async function readStoreManifest(staticDir) {
  const path = join(staticDir, STORE_ROUTE, STORE_MANIFEST);
  if (!existsSync(path)) throw new Error(`the static build keeps no ${STORE_ROUTE}/${STORE_MANIFEST}: the store was not built for it (§ 8.1)`);
  return JSON.parse(await readFile(path, "utf8"));
}
