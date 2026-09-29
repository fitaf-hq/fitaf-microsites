// SPEC-storefront-watch § 3, F3 and F4: one headless visit of the order page with no fragment, in a fresh profile,
// as any visitor. It presses nothing and types nothing. It records: whether the page rendered its meal cards (the
// app has then loaded the store's settings, and injected the Footer), the text of every script that starts with our
// version line, the console, and each uncaught page error with whether it came from our block (the error's script,
// read back through the DevTools protocol, starts with the version line).
import { STORE_PAGE, VERSION_PREFIX, VIEWPORTS } from "./config.mjs";
import { freshBrowser, poll, sleep } from "./browser.mjs";

const NAV_MS = 60_000;

export async function ordinaryVisit({ page: url = STORE_PAGE, executablePath, renderMs = 30_000, settleMs = 3_000 } = {}) {
  const { browser, close } = await freshBrowser({ executablePath });
  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORTS[1280]);
    const consoleLines = [];
    page.on("console", (m) => consoleLines.push(m.text()));
    const cdp = await page.createCDPSession();
    await cdp.send("Runtime.enable");
    await cdp.send("Debugger.enable");
    await cdp.send("Debugger.setSkipAllPauses", { skip: true });
    const exceptions = [];
    cdp.on("Runtime.exceptionThrown", (e) => exceptions.push(e.exceptionDetails));

    await page.goto(url, { waitUntil: "load", timeout: NAV_MS });
    const cards = await poll(page, () => document.querySelectorAll("app-product-card").length, null, (n) => n > 0, { timeoutMs: renderMs });
    await sleep(settleMs);
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
    return { rendered: cards > 0, cards: cards ?? 0, scripts, console: consoleLines, errors };
  } finally {
    await close();
  }
}
