// The Hand-off stories' store (SPEC-storybook-microsite.md § 8.1), built when Storybook starts (and builds), as
// microsite/pages.mjs builds the pages. Nothing of the block or the store is written here:
//
// 1. THE BLOCK is scripts/build-storefront.mjs's own build: its buildStorefront(), the function `npm run
//    build:storefront` runs, imported by path and given an output directory of its own (the command line has no --out,
//    and its own dist-storefront/ is what is pasted, so it is never written here). Its Footer file, fitaf-handoff.html,
//    is `<script>`, the text, `</script>`; the store's Custom Scripts Footer holds that block and its app re-creates the
//    script with the text inside (the store's injectSlot, the fixture's `footer`), so the text inside is what each
//    store page carries, byte for byte (SM-9).
// 2. THE STORE is the watch's synthetic store, tools/storefront-watch/test/browser-store.mjs, imported by path and
//    started on 127.0.0.1 for the build only: for each store a story opens (one set of the fixture's OWN options, below),
//    its page is fetched from the fixture and written as it came (SM-9: the store's files are browser-store.mjs's). The
//    fixture serves one page for /order and /checkout; it draws one or the other by the path.
// 3. THE LINKS are scripts/handoff-link.mjs's (handoffLink), the meals the fixture's own MEALS, for each count the
//    microsite links to (data/plans.json's shown_counts), on the first individual plan with that count. A link's total
//    must be its plan's count (the block refuses any other), so a count above the fixture's nine meals repeats meals,
//    one more each from the first, as a link's quantities do.
// 4. THE IMAGES: the store's logo as the fixture serves it (a generated rectangle), and each meal's tile
//    (handoff/tiles.mjs): generated, never a photograph.
// Beside them, store.json: the block's version line, the counts, the links and their meals, the stores.
//
//   node handoff/store.mjs      (npm run pages runs it too: rebuild while Storybook runs; a story's reload shows it)
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CHECKOUT_PATH, ORDER_PATH, screenBStore, STORE, STORE_MANIFEST } from "./layout.js";
import { BUILD_STOREFRONT, FIXTURE, FLOW_THEME, HANDOFF_LINK, SITE_BUILD, STORE_DIR } from "./paths.mjs";
import { tileFile, tileSvg } from "./tiles.mjs";

/** The Footer file build-storefront.mjs writes, and the block inside it: the build's own wrapper, exactly. */
const FOOTER_FILE = "fitaf-handoff.html";
const FOOTER_BLOCK = /^<script>([\s\S]*)<\/script>\n$/;
/** The fixture's own image paths the stories serve (its logo; the tiles answer at its meal images' paths). */
const LOGO = "logo.svg";
const imported = (path) => import(pathToFileURL(path).href);

/** The text the store's Footer slot runs: inside the Footer file's own <script> and </script>. */
export function footerText(footerFile) {
  const m = FOOTER_BLOCK.exec(footerFile);
  if (!m) throw new Error(`${FOOTER_FILE} is not one <script> block`);
  return m[1];
}

/** `t` meals of `meals`, in order: one each, then one more each from the first, until the total is `t`. */
export function linkItems(meals, t) {
  const qty = meals.map((_, i) => Math.floor(t / meals.length) + (i < t % meals.length ? 1 : 0));
  return meals.map((name, i) => ({ name, qty: qty[i] })).filter((it) => it.qty > 0);
}

/**
 * Each store a story opens: its id, the path the story opens it at, the count of its link (null: no link), and the
 * fixture's own options for it (every store has the store's line markup, § 19, and every card's image loaded, so a
 * slide can show its meal's tile).
 */
export function storesFor({ meals, counts, defaultCount }) {
  const common = { storeLines: true, photos: Object.fromEntries(meals.map((name) => [name, "loaded"])) };
  const order = (id, count, options) => ({ id, path: ORDER_PATH, count, options: { ...common, ...options } });
  return [
    order(STORE.screenA, defaultCount, { hangAtStart: true }),
    ...counts.flatMap((t) => Array.from({ length: t }, (_, i) => order(screenBStore(i + 1, t), t, { hangAfter: i + 1 }))),
    order(STORE.screenC, defaultCount, { routeHeld: true }),
    order(STORE.checkout, defaultCount, {}),
    // An ordinary visit opens /checkout itself, with no link: the store draws the meals a plan holds (its
    // checkoutNames), the default link's, as R2-83's ordinary visit does.
    { id: STORE.ordinary, path: CHECKOUT_PATH, count: null, options: { ...common, checkoutNames: meals.slice(0, defaultCount) } },
  ];
}

/** Build the block, the links, every store's page and the images into `outDir` (emptied first); returns the manifest. */
export async function buildStore({ outDir = STORE_DIR } = {}) {
  const [fixture, storefront, link, site, theme] = await Promise.all([FIXTURE, BUILD_STOREFRONT, HANDOFF_LINK, SITE_BUILD, FLOW_THEME].map(imported));
  await rm(outDir, { recursive: true, force: true });
  await mkdir(join(outDir, "img"), { recursive: true });

  const blockDir = join(outDir, "block");
  const built = await storefront.buildStorefront({ outDir: blockDir });
  const footer = footerText(await readFile(join(blockDir, FOOTER_FILE), "utf8"));

  const plans = await site.loadJson(site.PLANS_PATH);
  const planCounts = new Map(Object.entries(storefront.countTable(plans)).map(([mpid, n]) => [Number(mpid), n]));
  const counts = plans.shown_counts.map((c) => c.meals_per_week);
  const links = {};
  for (const t of counts) {
    const { mpid } = plans.individual[0].counts.find((c) => c.meals_per_week === t);
    const items = linkItems(fixture.MEALS, t);
    const args = ["--mpid", String(mpid), ...items.flatMap((it) => ["--item", `${it.name}:${it.qty}`])];
    const url = new URL(link.handoffLink(plans, link.payloadFromArgs(args, planCounts)));
    links[t] = { mpid, path: url.pathname, search: url.search, hash: url.hash, items };
  }

  const stores = storesFor({ meals: fixture.MEALS, counts, defaultCount: counts[0] });
  const server = await fixture.startStore();
  try {
    for (const s of stores) {
      server.set({ ...s.options, footer });
      const page = await fetch(`${server.origin}${s.path}`);
      if (!page.ok) throw new Error(`the synthetic store answered ${page.status} for ${s.path} (${s.id})`);
      await mkdir(join(outDir, s.id), { recursive: true });
      await writeFile(join(outDir, s.id, "index.html"), await page.text());
    }
    const logo = await fetch(`${server.origin}${fixture.LOGO_PATH}`);
    await writeFile(join(outDir, "img", LOGO), Buffer.from(await logo.arrayBuffer()));
  } finally {
    await server.close();
  }
  const tokens = theme.pageTokens(await readFile(theme.TEMPLATE_PATH, "utf8"));
  for (const [i, name] of fixture.MEALS.entries()) await writeFile(join(outDir, "img", tileFile(i)), tileSvg(name, i, tokens));

  const manifest = {
    block: { file: built.files.find((f) => f.name === FOOTER_FILE) },
    counts,
    defaultCount: counts[0],
    links,
    meals: fixture.MEALS,
    stores: stores.map(({ id, path, count, options }) => ({ id, path, count, options: { ...options, photos: undefined } })),
  };
  await writeFile(join(outDir, STORE_MANIFEST), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

/** What `node handoff/store.mjs` prints: the block and the stores. */
export function report(manifest, outDir = STORE_DIR) {
  console.log(`${join(outDir, "block", FOOTER_FILE)}  ${manifest.block.file.bytes} bytes  /* ${manifest.block.file.versionLine} */`);
  console.log(`${manifest.stores.length} stores under ${outDir}/ (links of ${manifest.counts.join(" and ")} meals)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  buildStore().then(report, (err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
