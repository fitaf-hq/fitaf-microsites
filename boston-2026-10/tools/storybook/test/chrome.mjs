// The browser SM-5 and SM-8 drive (SPEC-storybook-microsite.md § 5 ⚠): the Chrome the storefront watch drives, found by
// the watch's own chromePath() (tools/storefront-watch/lib/browser.mjs: CHROME_PATH, else the platform's usual place),
// with this package's own puppeteer-core, the watch's exact version (25.12.0), which downloads nothing. A fresh profile
// per launch, deleted on close. Not a test file itself.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { chromePath } from "../../storefront-watch/lib/browser.mjs";

export async function freshChrome() {
  const profile = await mkdtemp(join(tmpdir(), "fitaf-storybook-profile-"));
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath(),
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
