// SPEC-storefront-watch § 3, F3 and F4: one headless visit of the order page with no fragment, in a fresh profile,
// as any visitor. It presses nothing and types nothing. It records: whether the page rendered its meal cards (the
// app has then loaded the store's settings, and injected the Footer), the text of every script that starts with our
// version line, the console, and each uncaught page error with whether it came from our block (the error's script,
// read back through the DevTools protocol, starts with the version line).
// § 12, F6 (`menu: true`): the same visit also reads the page's OWN catalog response(s) as they arrive (the watch
// requests nothing of the backend's; lib/catalog-response.mjs): of each, the request's host, path and parameter names
// (never a value: the storefront's key is one), and the `all-meals` products' names, in the response's order, each
// with its key (src/storefront/meal-key.js, the hand-off's own function, imported here so that lib/watch.mjs and
// lib/baseline.mjs stay free of the site's code). Nothing else of the response is kept: no price, no picture.
// § 13, `npm run catalog` (`capture: true`): the same visit keeps each catalog response AS RECEIVED, for the command to
// save: when it arrived, its status, its content type and its body's bytes, untouched; with the time the page loaded and
// the browser's agent. Of the request, again only catalogRequest's host, path and parameter names: the URL itself is
// never handed over. lib/catalog-command.mjs judges and writes it.
import { mealKey } from "../../../src/storefront/meal-key.js";
import { catalogProducts, catalogRequest, isCatalogResponse, namesIn } from "./catalog-response.mjs";
import { STORE_PAGE, VERSION_PREFIX, VIEWPORTS } from "./config.mjs";
import { freshBrowser, poll, sleep } from "./browser.mjs";

const NAV_MS = 60_000;
/** F6: once the cards are shown, the longest the visit waits for a catalog response it has not yet seen. */
const CATALOG_MS = 10_000;
/** F6: the longest a seen response's body may take to read (Chrome hands it over once the page has consumed it). */
const BODY_MS = 10_000;

/** `promise`'s value, or `{ error }` if it has not settled within `ms`. */
function within(promise, ms, what) {
  let timer;
  const late = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ error: `${what} not read within ${ms / 1000} s` }), ms);
  });
  return Promise.race([promise, late]).finally(() => clearTimeout(timer));
}

/** One catalog response, read: the request as it may be recorded, the products' count, the menu's names. */
async function readCatalog(response) {
  const request = catalogRequest(response.url());
  try {
    const products = catalogProducts(await response.json());
    return { ...request, products: products.length, meals: namesIn(products).map((name) => ({ name, key: mealKey(name) })) };
  } catch {
    return { ...request, error: `its body could not be read (HTTP ${response.status()})` };
  }
}

/** § 13: one catalog response as received, its body's bytes untouched (Chrome's own, decoded as the page reads them). */
async function captureCatalog(response) {
  const head = { status: response.status(), contentType: response.headers()["content-type"] ?? null };
  try {
    return { ...head, body: await response.buffer() };
  } catch {
    return { ...head, error: `its body could not be read (HTTP ${response.status()})` };
  }
}

/** The record lib/catalog-command.mjs judges: every catalog response the visit saw, as received. */
async function captureRecord(captured, { page, loadedAt, userAgent }) {
  const responses = await Promise.all(
    captured.map((c) => within(c.read, BODY_MS, "its body").then((x) => ({ request: c.request, receivedAt: c.receivedAt, ...x }))),
  );
  return { page, loadedAt, userAgent, responses };
}

/** The record F6 judges (lib/menu-check.mjs), or null when no catalog response was seen. */
async function menuRecord(reads) {
  if (!reads.length) return null;
  const got = await Promise.all(reads.map((r) => within(r.read, BODY_MS, "its body").then((x) => ({ ...r.request, ...x }))));
  return {
    responses: got.map(({ at, params, error }) => ({ at, params, ...(error ? { error } : {}) })),
    products: got.reduce((n, g) => n + (g.products ?? 0), 0),
    meals: got.flatMap((g) => g.meals ?? []),
  };
}

export async function ordinaryVisit({ page: url = STORE_PAGE, executablePath, renderMs = 30_000, settleMs = 3_000, menu = false, capture = false } = {}) {
  const { browser, close } = await freshBrowser({ executablePath });
  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORTS[1280]);
    const consoleLines = [];
    page.on("console", (m) => consoleLines.push(m.text()));
    const reads = [];
    const captured = [];
    if (menu || capture) {
      page.on("response", (r) => {
        if (!isCatalogResponse(r)) return;
        const request = catalogRequest(r.url());
        if (menu) reads.push({ request, read: readCatalog(r) });
        if (capture) captured.push({ request, receivedAt: new Date().toISOString(), read: captureCatalog(r) });
      });
    }
    const cdp = await page.createCDPSession();
    await cdp.send("Runtime.enable");
    await cdp.send("Debugger.enable");
    await cdp.send("Debugger.setSkipAllPauses", { skip: true });
    const exceptions = [];
    cdp.on("Runtime.exceptionThrown", (e) => exceptions.push(e.exceptionDetails));

    await page.goto(url, { waitUntil: "load", timeout: NAV_MS });
    const loadedAt = new Date().toISOString();
    const cards = await poll(page, () => document.querySelectorAll("app-product-card").length, null, (n) => n > 0, { timeoutMs: renderMs });
    await sleep(settleMs);
    if (menu || capture) for (let waited = 0; !reads.length && !captured.length && waited < CATALOG_MS; waited += 200) await sleep(200);
    const scripts = await page.evaluate(
      (prefix) => [...document.querySelectorAll("script")].map((s) => s.text).filter((t) => t.replace(/^\s+/, "").startsWith(prefix)),
      VERSION_PREFIX,
    );
    const errors = [];
    for (const d of exceptions) {
      const scriptId = d.scriptId ?? d.stackTrace?.callFrames?.[0]?.scriptId;
      let fromOurBlock = false;
      if (scriptId) {
        try {
          const { scriptSource } = await cdp.send("Debugger.getScriptSource", { scriptId });
          fromOurBlock = scriptSource.replace(/^\s+/, "").startsWith(VERSION_PREFIX);
        } catch {
          // The script is gone (a navigation): it cannot be attributed, so it is reported as the store's.
        }
      }
      errors.push({ message: d.exception?.description ?? d.text, fromOurBlock });
    }
    const out = { rendered: cards > 0, cards: cards ?? 0, scripts, console: consoleLines, errors };
    if (menu) out.menu = await menuRecord(reads);
    if (capture) out.capture = await captureRecord(captured, { page: url, loadedAt, userAgent: await browser.userAgent() });
    return out;
  } finally {
    await close();
  }
}
