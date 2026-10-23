// Shared by the pv-*.test.mjs files (SPEC-preview-sites.md: a fixed copy of a planned week's page, staff only, ordering
// off). Not a test file itself. No request leaves the machine and no file in the repository is written:
//
// - A preview's data is read from a TEMPORARY copy of test/fixtures/previews/ (invented weeks; the directory itself is
//   inside this repository's tree, which the content command refuses as --from: PV7), with the one photo sheet its
//   week's sheet entry names written beside the entry, a byte copy of the flat-colour fixture sheet (no image is
//   committed for it: P1).
// - The preview Worker runs in Miniflare (local workerd: HTMLRewriter is the platform's own), bundled from a package's
//   src/worker/preview.js by esbuild, under a thin wrapper that only RECORDS each read of the bucket (PREVIEW's get, head
//   and list, passed through unchanged); it answers one path of its own, /__pv/log, which no case of the contract names.
//   A fake ASSETS (a service binding to a function here, answering from a table) and a fake PREVIEW (Miniflare's
//   in-memory R2 bucket, filled by the case).
// - A mirror is NESTED (<tmp>/boston-2026-10/), as the package sits in the repository (one directory below its top
//   level), so a mirror's "repository" is its own temporary directory and a --from elsewhere in tmp is outside it.
import { spawnSync } from "node:child_process";
import { copyFile, cp, mkdir, mkdtemp, readFile, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build as esbuild } from "esbuild";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import { ROOT } from "../build.mjs";

/** The fixture: two invented preview files and one week's sheet entry (test/fixtures/previews/README.md). */
export const FIXTURE_DIR = join(ROOT, "test", "fixtures", "previews");
/** § 4's deliveries: 2026-11-01 (not approved) and 2026-10-25 (approved, its names suffixed " (week two)"); 2026-11-08
 *  has no preview. */
export const WEEK = "2026-11-01";
export const OTHER_WEEK = "2026-10-25";
export const ABSENT_WEEK = "2026-11-08";
/** The sheet WEEK's entry names, and the committed flat-colour bytes it is a copy of. § 2 (ruled 2026-10-20): the week's
 *  sheet entry is <from>/photo-sheets/chefs-choice-<delivery>.json, one file per week, the sheet beside it. */
export const SHEET = "chefs-choice-2026-11-01.jpg";
export const FLAT_SHEET = join(ROOT, "test", "fixtures", "photo-sheets", "chefs-choice-2026-10-04.jpg");
export const sheetEntryOf = (delivery) => join("photo-sheets", `chefs-choice-${delivery}.json`);

/** § 2's object keys under the content's --out (and the preview bucket), written here from the contract. */
export const dataKey = (delivery) => `previews/${delivery}/picks-data.json`;
export const sheetKey = (delivery, file) => `previews/${delivery}/week/${file}`;
/** § 3's addresses. */
export const pagePath = (delivery) => `/${delivery}/`;
export const sheetPath = (delivery, file) => `/${delivery}/week/${file}`;

export const readFixture = async (delivery) => JSON.parse(await readFile(join(FIXTURE_DIR, `${delivery}.json`), "utf8"));

/** A temporary directory: `{ dir, done }`, `dir` its real path (the system's tmp is reached through /var -> /private/var). */
export async function tempDir(label) {
  const dir = await realpath(await mkdtemp(join(tmpdir(), `boston-pv-${label}-`)));
  return { dir, done: () => rm(dir, { recursive: true, force: true }) };
}

/** A --from for the cases: a temporary copy of the fixture, with WEEK's sheet written into photo-sheets/. */
export async function previewFrom() {
  const t = await tempDir("from");
  await cp(FIXTURE_DIR, t.dir, { recursive: true });
  await mkdir(join(t.dir, "photo-sheets"), { recursive: true });
  await copyFile(FLAT_SHEET, join(t.dir, "photo-sheets", SHEET));
  return t;
}

/** A NESTED mirror of the package at `from` (build.mjs, package.json, wrangler.jsonc, data/, scripts/, src/; the
 *  development build reads wrangler.jsonc), this package's node_modules linked; `edit(pkg)` changes it before use.
 *  `{ pkg, done }`. */
export async function pvMirror(edit = async () => {}, from = ROOT) {
  const t = await tempDir("mirror");
  const pkg = join(t.dir, "boston-2026-10");
  await mkdir(pkg);
  for (const name of ["build.mjs", "package.json", "wrangler.jsonc"]) await copyFile(join(from, name), join(pkg, name));
  for (const name of ["data", "scripts", "src"]) await cp(join(from, name), join(pkg, name), { recursive: true });
  await symlink(join(ROOT, "node_modules"), join(pkg, "node_modules"));
  await edit(pkg);
  return { pkg, done: t.done };
}

/** A package's module, imported from `root` (a mirror's own code when `root` is one). */
export const moduleOf = (root, ...parts) => import(pathToFileURL(join(root, ...parts)).href);

/** The page `npm run build -- --env preview` writes (dist-preview/index.html), built by `root`'s build() into a
 *  temporary directory; with the other files it wrote, by path under the directory. */
export async function previewBuild(root = ROOT) {
  const { build } = await moduleOf(root, "build.mjs");
  const t = await tempDir("dist");
  try {
    const result = await build({ target: "preview", outDir: t.dir });
    return { html: await readFile(join(t.dir, "index.html"), "utf8"), result };
  } finally {
    await t.done();
  }
}

/** The preview content for `week` from `from` (§ 2), made by `root`'s own previewContent(): `{ files, text, data }`,
 *  `files` each object key -> its bytes, `text` the data object's text, `data` it parsed. */
export async function previewContentOf({ root = ROOT, week = WEEK, from }) {
  const { previewContent } = await moduleOf(root, "scripts", "week-content.mjs");
  const out = await previewContent({ week, from });
  const files = Object.fromEntries(out.files.map((f) => [f.key, Buffer.from(f.bytes)]));
  const text = files[dataKey(week)]?.toString("utf8") ?? null;
  return { files, text, data: text === null ? null : JSON.parse(text) };
}

/** `npm run content -- …args` as the program, in `root`: `{ status, stdout, stderr }`. */
export function runContent(root, args) {
  const r = spawnSync(process.execPath, [join(root, "scripts", "week-content.mjs"), ...args], { encoding: "utf8", timeout: 120_000 });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", error: r.error };
}

const WRAPPER = (entry) => `
import worker from ${JSON.stringify(entry)};
const log = { reads: [] };
const counted = (bucket) => ({
  get(key, options) { log.reads.push("get " + key); return bucket.get(key, options); },
  head(key) { log.reads.push("head " + key); return bucket.head(key); },
  list(options) { log.reads.push("list " + ((options && options.prefix) || "")); return bucket.list(options); },
});
export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname === "/__pv/log") {
      const out = JSON.stringify(log);
      log.reads = [];
      return new Response(out, { headers: { "content-type": "application/json" } });
    }
    return worker.fetch(request, env.PREVIEW ? { ...env, PREVIEW: counted(env.PREVIEW) } : env, ctx);
  },
};
`;

async function bundle(entry) {
  const out = await esbuild({ stdin: { contents: WRAPPER(entry), resolveDir: ROOT, loader: "js" }, bundle: true, format: "esm", write: false, logLevel: "silent" });
  return out.outputFiles[0].text;
}

async function readResponse(res) {
  const body = Buffer.from(await res.arrayBuffer());
  return { status: res.status, headers: Object.fromEntries(res.headers), body, text: body.toString("utf8") };
}

/**
 * The preview Worker of the package at `root` (src/worker/preview.js), with a fake ASSETS answering from `assets` (a
 * path -> { status, headers, body } table) and a PREVIEW bucket holding `objects` (key -> bytes or text). Returns
 * `get(path, init)`, `reads()` (the bucket's reads since the last call), the fake ASSETS' requests, and `dispose()`.
 */
export async function startPreview({ root = ROOT, assets = {}, objects = {} } = {}) {
  const assetRequests = [];
  const answer = async (request) => {
    const { pathname } = new URL(request.url);
    assetRequests.push({ method: request.method, path: pathname, headers: Object.fromEntries(request.headers) });
    const hit = assets[pathname];
    if (!hit) return new Response(null, { status: 404 });
    return new Response(request.method === "HEAD" ? null : hit.body, { status: hit.status ?? 200, headers: hit.headers ?? {} });
  };
  // cf: false: Miniflare's own placeholder request.cf, never https://workers.cloudflare.com/cf.json (SPEC-analytics § 10.1).
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      cf: false,
      workers: [
        {
          name: "pv-preview",
          modules: true,
          script: await bundle(join(root, "src", "worker", "preview.js")),
          compatibilityDate: "2026-09-26",
          serviceBindings: { ASSETS: answer },
          r2Buckets: { PREVIEW: "pv-preview" },
        },
      ],
    }),
  );
  try {
    const bucket = await mf.getR2Bucket("PREVIEW");
    for (const [key, value] of Object.entries(objects)) await bucket.put(key, typeof value === "string" ? value : new Uint8Array(value));
  } catch (err) {
    await mf.dispose(); // a workerd left running keeps the test file's process from ever exiting
    throw err;
  }
  return {
    assetRequests,
    async get(path, init = {}) {
      return readResponse(await mf.dispatchFetch(`http://localhost${path}`, { redirect: "manual", ...init }));
    },
    async reads() {
      return JSON.parse(await (await mf.dispatchFetch("http://localhost/__pv/log")).text()).reads;
    },
    dispose: () => mf.dispose(),
  };
}
