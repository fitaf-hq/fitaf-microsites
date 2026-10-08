// SM-9 (SPEC-storybook-microsite.md § 8.4, ⭐ one source): the block a Hand-off story's store page carries is
// byte-identical to scripts/build-storefront.mjs's output, and the store's pages are browser-store.mjs's. Both are read:
// every store page as the static build serves it, at the address a story opens it at (/order or /checkout, ?store=, by
// handoff/serve.mjs's rule), against
//   - the block: a fresh build made here by the site's own buildStorefront() into a directory of its own, whose Footer
//     file must be exactly `<script>`, the page's Footer text (the fixture's `footer`, read from the page's own options
//     block), `</script>`;
//   - the page: the watch's synthetic store, started here and given the page's own options, which must serve exactly
//     the served page.
//
// ⭐ Mutant (in the suite, in a mirror): a copy of the served store with one rule of one page's block changed fails the
// first check, for that page only (the second still holds: the fixture serves whatever block it is given).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { STORE, STORE_ROUTE, storeUrl } from "../handoff/layout.js";
import { SITE } from "./paths.mjs";
import { serveStatic } from "./serve-static.mjs";
import { readStoreManifest, removeStorybookStatic, storybookStatic } from "./storybook-static.mjs";

const BUILD_TIMEOUT_MS = 900_000;
const FOOTER_FILE = "fitaf-handoff.html";
/** The fixture's own options block in its page (browser-store.mjs's appHtml), its JSON with `<` escaped. */
const OPTIONS = /<script type="application\/json" id="cfg">([\s\S]*?)<\/script>/;
/** SM-9's mutant: one rule of the block (the screen's title), changed, in one store's page. */
const RULE = "#fitaf-screen h2{margin:0 0 16px";
const RULE_CHANGED = "#fitaf-screen h2{margin:0 0 17px";
const MUTANT_STORE = STORE.checkout;
/** Every store page carries the whole block: a Footer text shorter than this was not read. */
const MIN_BLOCK_BYTES = 10_000;

after(removeStorybookStatic);

const imported = (...parts) => import(pathToFileURL(join(SITE, ...parts)).href);

/** The site's own build of the block, now, into a fresh directory: its Footer file's text. */
async function freshFooterFile() {
  const { buildStorefront } = await imported("scripts", "build-storefront.mjs");
  const dir = await mkdtemp(join(tmpdir(), "fitaf-storybook-sm-9-"));
  try {
    await buildStorefront({ outDir: dir });
    return await readFile(join(dir, FOOTER_FILE), "utf8");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** SM-9's check over a static build: one line per store page that is not of one source; [] when every one is. */
async function oneSource(staticDir) {
  const manifest = await readStoreManifest(staticDir);
  const footerFile = await freshFooterFile();
  const { startStore } = await imported("tools", "storefront-watch", "test", "browser-store.mjs");
  const server = await serveStatic(staticDir);
  const fixture = await startStore();
  const problems = [];
  let checked = 0;
  try {
    for (const { id, path } of manifest.stores) {
      const served = await (await fetch(`${server.base}${storeUrl({ path, store: id })}`)).text();
      const options = OPTIONS.exec(served);
      if (!options) {
        problems.push(`${id}: no options block of the fixture's in the served page`);
        continue;
      }
      const cfg = JSON.parse(options[1]);
      checked++;
      assert.ok(cfg.footer?.length > MIN_BLOCK_BYTES, `fixture control: ${id} carries a whole block (${cfg.footer?.length})`);
      if (`<script>${cfg.footer}</script>\n` !== footerFile) problems.push(`${id}: the block is not build-storefront.mjs's (${cfg.footer.length} and ${footerFile.length} characters)`);
      fixture.set(cfg);
      const own = await (await fetch(`${fixture.origin}${path}`)).text();
      if (own !== served) problems.push(`${id}: the page is not browser-store.mjs's for its own options (${served.length} and ${own.length} characters)`);
    }
  } finally {
    await fixture.close();
    await server.close();
  }
  assert.ok(checked === manifest.stores.length && checked > 20, `fixture control: every store's page was read (${checked} of ${manifest.stores.length})`);
  return problems;
}

test("SM-9: every Hand-off store page carries build-storefront.mjs's block, byte for byte, in browser-store.mjs's own page", { timeout: BUILD_TIMEOUT_MS }, async () => {
  const { dir } = await storybookStatic();
  assert.deepEqual(await oneSource(dir), []);
});

test("SM-9 (mutant): a store page whose block has one rule changed fails", { timeout: BUILD_TIMEOUT_MS }, async (t) => {
  const { dir } = await storybookStatic();
  const mirror = await mkdtemp(join(tmpdir(), "fitaf-storybook-sm-9-mutant-"));
  t.after(() => rm(mirror, { recursive: true, force: true }));
  await cp(join(dir, STORE_ROUTE), join(mirror, STORE_ROUTE), { recursive: true });
  const page = join(mirror, STORE_ROUTE, MUTANT_STORE, "index.html");
  const html = await readFile(page, "utf8");
  assert.equal(html.split(RULE).length, 2, `fixture control: the page's block carries "${RULE}" once`);
  await writeFile(page, html.replace(RULE, RULE_CHANGED));
  const problems = await oneSource(mirror);
  for (const line of problems) t.diagnostic(line);
  assert.equal(problems.length, 1, problems.join("\n"));
  assert.match(problems[0], new RegExp(`^${MUTANT_STORE}: the block is not build-storefront\\.mjs's`));
});
