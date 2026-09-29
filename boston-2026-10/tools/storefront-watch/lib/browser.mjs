// The browser the headless checks drive: the Chrome already installed (in CI, the runner's), never a download
// (puppeteer-core downloads nothing). Each launch gets a fresh profile in a temporary directory, deleted on close.
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CANDIDATES = {
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
  linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
  win32: ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"],
};

/** CHROME_PATH (or PUPPETEER_EXECUTABLE_PATH, or the runner's CHROME_BIN), else the platform's usual place. */
export function chromePath(env = process.env) {
  for (const key of ["CHROME_PATH", "PUPPETEER_EXECUTABLE_PATH", "CHROME_BIN"]) if (env[key]) return env[key];
  const found = (CANDIDATES[process.platform] ?? []).find((p) => existsSync(p));
  if (!found) throw new Error("no Chrome found: set CHROME_PATH to the Chrome executable");
  return found;
}

export async function freshBrowser({ executablePath = chromePath() } = {}) {
  const { default: puppeteer } = await import("puppeteer-core");
  const profile = await mkdtemp(join(tmpdir(), "storefront-watch-profile-"));
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      userDataDir: profile,
      args: ["--no-first-run", "--no-default-browser-check"],
    });
  } catch (err) {
    await rm(profile, { recursive: true, force: true });
    throw err;
  }
  return {
    browser,
    async close() {
      try {
        await browser.close();
      } finally {
        await rm(profile, { recursive: true, force: true });
      }
    },
  };
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Evaluate `fn(arg)` in the page every `everyMs` until `done(result)` or `timeoutMs`; the last result either way. */
export async function poll(page, fn, arg, done, { timeoutMs, everyMs = 250 }) {
  const until = Date.now() + timeoutMs;
  for (;;) {
    let result;
    try {
      result = await page.evaluate(fn, arg);
    } catch (err) {
      // A navigation inside the app can destroy the context mid-evaluate; the next poll reads the new one.
      if (!/context was destroyed|navigat/i.test(String(err?.message))) throw err;
    }
    if (result !== undefined && done(result)) return result;
    if (Date.now() >= until) return result;
    await sleep(everyMs);
  }
}
