// SPEC-storefront-watch §§ 2–3: one run of the watch. Pure orchestration: the requests go through `fetcher` (every
// one to the store's origin), and the browser checks are functions the caller passes in (`visit` for F3 and F4,
// `smoke` for F5), so the tests run it with no network and no browser.
//
//   hourly            the cheap check (two requests); a change flags F1 and runs F1 in depth, then F2 to F5
//   full (dispatch)   F1 in depth and F2 to F5, whatever the cheap check found
//   daily             also F3 and F4, because the Footer can change without a release
//   F6 (§ 12)         the week's menu, from the same visit: on Fridays in New York until a switch is seen, and on a
//                     dispatch (lib/cutover.mjs); `cutover` is { timeZone, seen }, which bin/watch.mjs always passes
import { cutoverDay, cutoverSchedule } from "./cutover.mjs";
import { checkDependencies } from "./dependencies-check.mjs";
import { footerVerdict, quietVerdict } from "./footer-check.mjs";
import { menuVerdict } from "./menu-check.mjs";
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

export async function runWatch({ fetcher, baseline, dependencies, page, full = false, daily = false, visit = null, smoke = null, now = () => new Date(), cutover = null }) {
  if (baseline.page !== page) throw new Error(`the baseline is for ${baseline.page}, not ${page}`);
  const when = now();
  const at = when.toISOString();
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

  // § 12: whether this run reads the week's menu (F6). The issue record is asked only on a Friday (W24, W25).
  const day = cutover ? cutoverDay(when, cutover.timeZone) : null;
  const schedule = cutover ? await cutoverSchedule({ full, day, seen: cutover.seen ?? null }) : { due: false, note: "not wired: no cutover settings" };
  const footerDue = inDepth || daily;

  // ONE ordinary visit serves F3, F4 and F6 (§ 12 item 1: on a run where F3 runs, the same visit).
  let visited = null;
  let visitError = null;
  if (visit && (footerDue || schedule.due)) {
    try {
      visited = await visit({ menu: schedule.due });
    } catch (err) {
      visitError = err;
    }
  }

  let f3 = NOT_RUN("runs on F1, a dispatch, or the daily run");
  let f4 = NOT_RUN("runs on F1, a dispatch, or the daily run");
  let f5 = NOT_RUN("runs on F1 or a dispatch");
  // A browser check that cannot run is a flag with its error, never an abort: the run must still reach the issue.
  if (footerDue) {
    if (visit) {
      if (visitError) {
        f3 = { ran: true, flag: true, blocks: [], summary: `could not run: ${visitError.message}` };
        f4 = { ran: true, flag: true, lines: [], errors: [], otherErrors: [], summary: `could not run: ${visitError.message}` };
      } else {
        f3 = { ran: true, ...footerVerdict(visited, baseline.expectedFooter ?? null) };
        f4 = { ran: true, ...quietVerdict(visited) };
      }
      if (f3.flag) flags.add("F3");
      if (f4.flag) flags.add("F4");
    } else {
      f3 = NOT_RUN("no browser: --no-browser");
      f4 = NOT_RUN("no browser: --no-browser");
    }
  }

  // § 12, F6. A menu that cannot be read is a flag (unread), never a switch.
  let f6 = NOT_RUN(schedule.note);
  if (schedule.due) {
    if (!visit) {
      f6 = NOT_RUN("no browser: --no-browser");
    } else {
      const verdict = visitError
        ? { ...menuVerdict(null, null), summary: `could not read the menu: could not run: ${visitError.message}` }
        : menuVerdict(visited?.menu ?? null, baseline.menu);
      f6 = { ran: true, friday: day.friday, timeZone: day.timeZone, record: schedule.record, ...verdict };
      if (f6.flag) flags.add("F6");
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
    f6,
    flags: [...flags].sort(),
  };
}
