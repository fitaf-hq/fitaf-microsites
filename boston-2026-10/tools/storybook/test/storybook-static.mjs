// A static build of the stories for the cases that read one (SM-2, SM-3, SM-5, SM-8). Not a test file itself.
//
// Each build is the package's own `build-storybook` script, into a temporary directory, with its pages (the site's
// build, § 2 item 1) in a temporary directory of their own, so no two test files share a directory and the tree is
// never written while a case runs. STORYBOOK_STATIC=<dir> reads an existing build instead (its pages beside it, under
// microsite/), for a quick local run; the suite as committed builds its own.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { MANIFEST, PAGES_ROUTE } from "../microsite/layout.js";
import { TOOL } from "./paths.mjs";

const run = promisify(execFile);
const OUTPUT_LIMIT_BYTES = 64 * 1024 * 1024;

/** Run `npm run build-storybook` in `toolDir` into `outDir`; the pages go to `pagesDir`. Rejects on a failed build. */
export async function buildStorybook({ toolDir = TOOL, outDir, pagesDir, env = {} }) {
  return run("npm", ["--prefix", toolDir, "run", "build-storybook", "--", "--output-dir", outDir, "--quiet"], {
    env: { ...process.env, STORYBOOK_DISABLE_TELEMETRY: "1", MICROSITE_PAGES_DIR: pagesDir, ...env },
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
