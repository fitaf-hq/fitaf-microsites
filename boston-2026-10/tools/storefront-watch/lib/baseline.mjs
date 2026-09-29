// SPEC-storefront-watch § 5, accepting a release: storefront/watch-baseline.json rewritten from the live store's
// public files (the page's script list, the entry, its imports, every reachable JS file's SHA-256). The expected
// Footer block is not read from the store: it is what is KEPT (a build's version line), set with --footer <built
// block>, cleared with --footer null, and otherwise carried over, so F3 compares what is live with what is kept.
import { readFile, writeFile } from "node:fs/promises";
import { parseBlock } from "./footer-check.mjs";
import { fileHashes, readEntry, readRelease } from "./read-store.mjs";

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

export async function captureBaseline({ fetcher, page, expectedFooter }) {
  const { entryUrl, entryText, live } = await readEntry({ fetcher, page });
  if (!entryUrl) throw new Error(`${page} names no entry bundle (one module script main-*.js): nothing to accept`);
  const texts = await readRelease({ fetcher, entryUrl, entryText });
  return { about: ABOUT, page, html: live.html, entry: live.entry, imports: live.imports, files: fileHashes(texts), expectedFooter };
}

/** `footer`: undefined keeps the file's expectedFooter; null clears it; a string is a built block's text. */
export async function acceptBaseline({ fetcher, path, page, footer }) {
  const expectedFooter = footer === undefined ? ((await existing(path))?.expectedFooter ?? null) : footer === null ? null : footerFromBlock(footer);
  const baseline = await captureBaseline({ fetcher, page, expectedFooter });
  await writeFile(path, baselineText(baseline));
  return baseline;
}
