// SPEC-storefront-watch §§ 2–3: one run of the watch. Pure orchestration: the requests go through `fetcher` (every
// one to the store's origin), and the browser checks are functions the caller passes in (`visit` for F3 and F4,
// `smoke` for F5), so the tests run it with no network and no browser.
//
//   hourly            the cheap check (two requests); a change flags F1 and runs F1 in depth, then F2 to F5
//   full (dispatch)   F1 in depth and F2 to F5, whatever the cheap check found
//   daily             also F3 and F4, because the Footer can change without a release
import { checkDependencies } from "./dependencies-check.mjs";
import { footerVerdict, quietVerdict } from "./footer-check.mjs";
import { fileHashes, readEntry, readRelease } from "./read-store.mjs";

const NOT_RUN = (note) => ({ ran: false, flag: false, note });

function setDiff(before, after) {
  const b = new Set(before);
  const a = new Set(after);
  return { added: [...a].filter((x) => !b.has(x)).sort(), removed: [...b].filter((x) => !a.has(x)).sort() };
}

/** § 2.3: the entry's name and the import list (and the page's own script list), against the baseline. */
function compareCheap(baseline, live) {
  const html = setDiff(baseline.html, live.html);
  const imports = setDiff(baseline.imports, live.imports);
  const entry = { baseline: baseline.entry, live: live.entry };
  const changed = Boolean(html.added.length || html.removed.length || imports.added.length || imports.removed.length || entry.baseline !== entry.live);
  return { changed, html, entry, imports };
}

/** F1 in depth: the file set and each file's SHA-256, against the baseline's. */
function compareFiles(baselineFiles, files) {
  const { added, removed } = setDiff(Object.keys(baselineFiles), Object.keys(files));
  const changed = Object.keys(files).filter((n) => n in baselineFiles && baselineFiles[n] !== files[n]).sort();
  return { added, removed, changed, count: Object.keys(files).length };
}

export async function runWatch({ fetcher, baseline, dependencies, page, full = false, daily = false, visit = null, smoke = null, now = () => new Date() }) {
  if (baseline.page !== page) throw new Error(`the baseline is for ${baseline.page}, not ${page}`);
  const at = now().toISOString();
  const flags = new Set();

  const { entryUrl, entryText, entryLastModified, live } = await readEntry({ fetcher, page });
  const cheap = compareCheap(baseline, live);
  // § 7 item 1: a NEW entry bundle is a release; its Last-Modified, read while the file is live (the store deletes a
  // release's files at the next one), is the release's publish time, for the report and the issue's body.
  const release = live.entry && live.entry !== baseline.entry ? { entry: live.entry, lastModified: entryLastModified } : null;
  if (cheap.changed) flags.add("F1");
  const inDepth = cheap.changed || full;

  let f1 = NOT_RUN("no change: the entry and its imports are the baseline's");
  let f2 = NOT_RUN("runs on F1 or a dispatch");
  if (inDepth) {
    const texts = entryUrl ? await readRelease({ fetcher, entryUrl, entryText }) : new Map();
    f1 = { ran: true, ...compareFiles(baseline.files, fileHashes(texts)) };
    f1.flag = cheap.changed || f1.added.length > 0 || f1.removed.length > 0 || f1.changed.length > 0;
    if (f1.flag) flags.add("F1");
    f2 = checkDependencies(dependencies, texts);
    if (f2.flag) flags.add("F2");
  }

  let f3 = NOT_RUN("runs on F1, a dispatch, or the daily run");
  let f4 = NOT_RUN("runs on F1, a dispatch, or the daily run");
  let f5 = NOT_RUN("runs on F1 or a dispatch");
  // A browser check that cannot run is a flag with its error, never an abort: the run must still reach the issue.
  if (inDepth || daily) {
    if (visit) {
      try {
        const v = await visit();
        f3 = { ran: true, ...footerVerdict(v, baseline.expectedFooter ?? null) };
        f4 = { ran: true, ...quietVerdict(v) };
      } catch (err) {
        f3 = { ran: true, flag: true, blocks: [], summary: `could not run: ${err.message}` };
        f4 = { ran: true, flag: true, lines: [], errors: [], otherErrors: [], summary: `could not run: ${err.message}` };
      }
      if (f3.flag) flags.add("F3");
      if (f4.flag) flags.add("F4");
    } else {
      f3 = NOT_RUN("no browser: --no-browser");
      f4 = NOT_RUN("no browser: --no-browser");
    }
  }
  if (inDepth) {
    if (smoke && f3.ran) {
      // § 4: if F3 found our block on the live page, the link alone runs it (the real end to end).
      const liveBlocks = f3.blocks.map((b) => b.versionLine);
      try {
        f5 = { ran: true, ...(await smoke({ liveBlocks })) };
      } catch (err) {
        f5 = { ran: true, flag: true, script: "(none)", runs: [], error: `could not run: ${err.message}` };
      }
      if (f5.flag) flags.add("F5");
    } else {
      f5 = NOT_RUN(smoke ? "F3 did not run" : "no browser: --no-browser");
    }
  }

  return {
    at,
    page,
    mode: { full, daily, browser: Boolean(visit) },
    entry: live.entry,
    fetches: fetcher.calls.length,
    refused: [...fetcher.refused].sort(),
    release,
    live,
    cheap,
    f1,
    f2,
    f3,
    f4,
    f5,
    flags: [...flags].sort(),
  };
}
