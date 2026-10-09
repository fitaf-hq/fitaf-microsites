// SPEC-storefront-watch § 5, accepting a release: storefront/watch-baseline.json rewritten from the live store's
// public files (the page's script list, the entry, its imports, every reachable JS file's SHA-256). The expected
// Footer block is not read from the store: it is what is KEPT (a build's version line), set with --footer <built
// block>, cleared with --footer null, and otherwise carried over, so F3 compares what is live with what is kept.
// § 8: accept names the release it accepts (`main-<name>.js`, as the watch's issue title names it), and refuses,
// writing nothing, unless that release is the live entry both before and after its files are read.
// § 12 item 5: `menu`, the accepted week's meal keys, is what is KEPT too: carried over by a release's accept (as
// expectedFooter), and written only by `accept --menu` (acceptMenu), from one headless visit's reading of the page's own
// catalog response, with nothing else in the file changed.
import { readFile, writeFile } from "node:fs/promises";
import { parseBlock } from "./footer-check.mjs";
import { menuKeys, menuVerdict } from "./menu-check.mjs";
import { ENTRY_NAME } from "./page-scripts.mjs";
import { fileHashes, readEntry, readEntryName, readRelease } from "./read-store.mjs";

export const ABOUT =
  "Written by `npm run accept` (tools/storefront-watch; SPEC-storefront-watch.md § 5) from the live store's public files. Do not hand-edit: re-run accept; set expectedFooter with accept --footer.";

export const baselineText = (baseline) => `${JSON.stringify(baseline, null, 2)}\n`;

/** A built Footer block (fitaf-handoff.html, or a console file) -> its version line, checked against its text. */
export function footerFromBlock(text) {
  const script = /^\s*<script\b[^>]*>([\s\S]*)<\/script>\s*$/i.exec(text);
  const block = parseBlock(script ? script[1] : text);
  if (!block || !block.commit) throw new Error("the --footer file does not start with a fitaf-handoff version line");
  if (block.commit.endsWith("-dirty")) throw new Error(`the --footer block was built from a dirty tree (${block.versionLine}): build from a commit`);
  if (!block.intact) throw new Error(`the --footer block's text does not match its version line (${block.versionLine}; text sha256 ${block.actual})`);
  return block.versionLine;
}

async function existing(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

/** § 8 item 2: the release accept was asked for is not the live entry. Nothing is written. */
export class NotTheLiveRelease extends Error {
  constructor(live, release) {
    super(`the live entry is ${live ?? "(none)"}, not ${release}: a newer release has landed; its own checks run on the next flag`);
    this.name = "NotTheLiveRelease";
  }
}

/** § 8 item 2's check, made on the first read of the entry and again after the release's files are read. */
function mustBeLive(live, release) {
  if (live !== release) throw new NotTheLiveRelease(live, release);
}

export async function captureBaseline({ fetcher, page, expectedFooter, release }) {
  const { entryUrl, entryText, live } = await readEntry({ fetcher, page });
  if (!entryUrl) throw new Error(`${page} names no entry bundle (one module script main-*.js): nothing to accept`);
  mustBeLive(live.entry, release);
  const texts = await readRelease({ fetcher, entryUrl, entryText });
  // A release that landed while its files were read (HMP released twice within an hour on 2026-09-29): refused too.
  mustBeLive(await readEntryName({ fetcher, page }), release);
  return { about: ABOUT, page, html: live.html, entry: live.entry, imports: live.imports, files: fileHashes(texts), expectedFooter };
}

/**
 * `release`: the entry bundle's name, `main-<name>.js`, required (§ 8), checked before anything is read or requested.
 * `footer`: undefined keeps the file's expectedFooter; null clears it; a string is a built block's text.
 */
export async function acceptBaseline({ fetcher, path, page, footer, release }) {
  if (!ENTRY_NAME.test(release ?? "")) {
    throw new Error(`accept names the release it accepts, --release main-<name>.js (SPEC-storefront-watch § 8); got ${release}`);
  }
  const prior = await existing(path);
  const expectedFooter = footer === undefined ? (prior?.expectedFooter ?? null) : footer === null ? null : footerFromBlock(footer);
  const baseline = await captureBaseline({ fetcher, page, expectedFooter, release });
  if (prior?.menu) baseline.menu = prior.menu;
  await writeFile(path, baselineText(baseline));
  return baseline;
}

/** § 12 item 5: the live menu could not be read (no catalog response, none in all-meals). Nothing is written. */
export class MenuUnread extends Error {
  constructor(why) {
    super(why);
    this.name = "MenuUnread";
  }
}

/**
 * `accept --menu`: `visit({ menu: true })` (lib/visit.mjs, one headless visit) read, and the baseline file's `menu`
 * replaced by the live menu's keys; every other field as it was. Returns { baseline, live: [{ name, key }] }.
 */
export async function acceptMenu({ path, visit }) {
  const prior = await existing(path);
  if (!prior) throw new Error(`${path} does not exist: accept a release first (--release main-<name>.js)`);
  const verdict = menuVerdict((await visit({ menu: true }))?.menu ?? null, null);
  if (verdict.unread) throw new MenuUnread(verdict.summary);
  const baseline = { ...prior, menu: menuKeys(verdict.live) };
  await writeFile(path, baselineText(baseline));
  return { baseline, live: verdict.live };
}
