// W22–W25 (SPEC-storefront-watch § 12, F6: the week's cutover). On Fridays in New York (data/save.json's
// send_time_zone) until a switch is seen that Friday, and on a dispatch, one headless visit of /order?mpid=21 reads the
// page's OWN /catalog/products response; the `all-meals` products' names, each reduced to its key
// (src/storefront/meal-key.js), are the week's menu. F6 flags when fewer than half of the baseline's keys are still
// listed (a new week); a smaller change is reported and not flagged. A flagged F6 opens its own issue, "storefront-watch:
// the menu switched (N of M keys new)", which is how later Friday runs know to stop. `accept --menu` writes the live
// menu's keys into the baseline.
// The cases on RECORDED visit outcomes (no browser; § 6's synthetic store for every request the watch's own code makes):
// W22 menu A against baseline A: green; menu B (a new week): flagged, the title counting the new keys. W23 one meal
// added (and one renamed): not flagged, reported. W24 a Tuesday: F6 not run, and the run's requests are W1's. W25 a
// "menu switched" issue for this Friday: F6 not run. ⭐ Mutants, each a copy of lib/ in a temporary directory (no file
// in the repository is edited): the half-rule inverted fails W22 and W23; the day gate removed fails W24.
// Then W22 and W23 again in headless Chrome, against test/browser-store.mjs on 127.0.0.1 whose page requests its
// catalog from a synthetic backend (W26 and W27, in their own file, are about that request).
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mealKey } from "../../../src/storefront/meal-key.js";
import { chromePath } from "../lib/browser.mjs";
import { storeFetcher } from "../lib/store-fetch.mjs";
import { MEALS, startBackend, startStore } from "./browser-store.mjs";
import { baselineText, DEPENDENCIES, fakeFetch, ORIGIN, PAGE, syntheticStore, w1Baseline } from "./synthetic-store.mjs";

const LIB = new URL("../lib/", import.meta.url);
const TZ = "America/New_York";
/** Friday 2026-10-09, 00:00 in New York (EDT, UTC−4): the first minute F6 runs. */
const FRIDAY_START = new Date("2026-10-09T04:00:00Z");
const FRIDAY_NOON = new Date("2026-10-09T16:00:00Z");
/** Thursday 2026-10-08, 23:59 in New York: already Friday in UTC, not yet in New York. */
const THURSDAY_LAST = new Date("2026-10-09T03:59:00Z");
const TUESDAY = new Date("2026-10-06T15:00:00Z");
/** Saturday 2026-10-10, 00:00 in New York. */
const SATURDAY_START = new Date("2026-10-10T04:00:00Z");

/** Menu A, the accepted week: the synthetic store's own nine meals. Menu B, a new week: two of A's, then seven new. */
const MENU_A = MEALS;
const NEW_IN_B = ["Lemon Herb Chicken", "Pork Carnitas Bowl", "Teriyaki Salmon", "Mediterranean Quinoa", "BBQ Brisket", "Garlic Shrimp Pasta", "Thai Basil Beef"];
const MENU_B = [NEW_IN_B[0], MEALS[3], NEW_IN_B[1], NEW_IN_B[2], MEALS[7], ...NEW_IN_B.slice(3)];
const keysOf = (names) => [...new Set(names.map(mealKey))].sort();
const baselineWithMenu = (names = MENU_A) => ({ ...w1Baseline(), menu: keysOf(names) });

/** What lib/visit.mjs records of one visit, the menu read from the page's own catalog response (§ 12 item 1). */
const recorded = (names) => ({
  rendered: true,
  cards: names.length,
  scripts: [],
  console: [],
  errors: [],
  menu: {
    responses: [{ at: "backend.synthetic/api/v1/tenant/catalog/products", params: ["paginate", "meal_plan_id", "store_api_key"] }],
    products: names.length + 2,
    meals: names.map((name) => ({ name, key: mealKey(name) })),
  },
});

/** A visit that records what it was asked for and returns `outcome`. */
function spyVisit(outcome) {
  const calls = [];
  const visit = async (opts = {}) => {
    calls.push(opts);
    return typeof outcome === "function" ? outcome(opts) : outcome;
  };
  return { visit, calls };
}

/** `gh` faked: `issue list` answers `issues` (filtered by --state, as gh does); every call is recorded. */
function fakeGh(issues = []) {
  const calls = [];
  const gh = async (args, input) => {
    calls.push({ args, input });
    if (args[0] === "issue" && args[1] === "list") {
      const state = args[args.indexOf("--state") + 1];
      return JSON.stringify(issues.filter((i) => state === "all" || i.state === state.toUpperCase()));
    }
    return "";
  };
  return { gh, calls };
}

/** One run of `lib`'s watch on § 6's synthetic store, on `when`, with the cutover wired as bin/watch.mjs wires it. */
async function run(lib, { when, visit, seen = null, baseline = baselineWithMenu(), full = false, files = syntheticStore() }) {
  const { runWatch } = await import(new URL("watch.mjs", lib).href);
  const store = fakeFetch(files);
  const result = await runWatch({
    fetcher: storeFetcher({ fetchImpl: store.fetchImpl, origin: ORIGIN }),
    baseline,
    dependencies: DEPENDENCIES,
    page: PAGE,
    full,
    visit,
    now: () => when,
    cutover: { timeZone: TZ, seen },
  });
  return { result, calls: store.calls };
}

const HOURLY_CALLS = [PAGE, `${ORIGIN}/main-SYNTH001.js`];

// ── W22: menu A green; menu B flagged, the title counting the new keys ──────────────────────────────────────────────

async function w22Case(lib) {
  const { menuIssueTitle } = await import(new URL("menu-issue.mjs", lib).href);
  const a = await run(lib, { when: FRIDAY_NOON, visit: spyVisit(recorded(MENU_A)).visit });
  assert.equal(a.result.f6?.ran, true, "F6 runs on a Friday");
  assert.equal(a.result.f6.flag, false, `menu A against baseline A: ${a.result.f6.summary}`);
  assert.deepEqual(a.result.flags, []);

  const b = await run(lib, { when: FRIDAY_NOON, visit: spyVisit(recorded(MENU_B)).visit });
  assert.deepEqual(b.result.flags, ["F6"], `menu B: ${b.result.f6?.summary}`);
  assert.deepEqual(b.result.f6.added.map((m) => m.name), NEW_IN_B, "the new names, in the page's order");
  assert.equal(b.result.f6.kept, 2);
  assert.equal(menuIssueTitle(b.result.f6), "storefront-watch: the menu switched (7 of 9 keys new)");

  // The rule's edge: exactly half still listed is not a switch; one fewer is.
  const ten = [...MENU_A, "Turkey Meatballs"];
  const half = [...ten.slice(0, 5), ...NEW_IN_B.slice(0, 5)];
  const lessThanHalf = [...ten.slice(0, 4), ...NEW_IN_B.slice(0, 6)];
  const h = await run(lib, { when: FRIDAY_NOON, baseline: baselineWithMenu(ten), visit: spyVisit(recorded(half)).visit });
  assert.equal(h.result.f6.flag, false, `5 of 10 still listed: not a switch (${h.result.f6.summary})`);
  const l = await run(lib, { when: FRIDAY_NOON, baseline: baselineWithMenu(ten), visit: spyVisit(recorded(lessThanHalf)).visit });
  assert.equal(l.result.f6.flag, true, `4 of 10 still listed: a switch (${l.result.f6.summary})`);
}

test("W22: menu A against baseline A: F6 green; menu B (a new week): F6 flags, the title counting the new keys", async () => {
  await w22Case(LIB);
});

test("W22: the flagged F6 opens its own issue (titled, the new names in its body in the page's order), never a release issue", async () => {
  const { renderReport } = await import(new URL("report.mjs", LIB).href);
  const { fileRunIssues } = await import(new URL("run-issues.mjs", LIB).href);
  const { menuMarker } = await import(new URL("menu-issue.mjs", LIB).href);
  const { result } = await run(LIB, { when: FRIDAY_NOON, visit: spyVisit(recorded(MENU_B)).visit });
  const report = renderReport(result);
  const { gh, calls } = fakeGh([]);
  await fileRunIssues({ gh, result, report });
  const creates = calls.filter((c) => c.args[0] === "issue" && c.args[1] === "create");
  assert.equal(creates.length, 1, "one issue: the menu's, and no release issue for F6 alone");
  const title = creates[0].args[creates[0].args.indexOf("--title") + 1];
  assert.equal(title, "storefront-watch: the menu switched (7 of 9 keys new)");
  assert.equal(creates[0].args[creates[0].args.indexOf("--label") + 1], "storefront-watch");
  const body = creates[0].input;
  const at = NEW_IN_B.map((n) => body.indexOf(n));
  assert.ok(at.every((i) => i >= 0), "every new name in the body");
  assert.deepEqual([...at].sort((x, y) => x - y), at, "in the page's order");
  assert.ok(at[0] < body.indexOf("# storefront-watch:"), "the new names lead; the run's report follows");
  assert.ok(body.includes(menuMarker("menu-switched", "2026-10-09")), "the marker later Friday runs read");
});

test("W22: on a run where F3 runs (a release), F6 reads the same visit: one visit, asked for the menu", async () => {
  const files = syntheticStore((f) => {
    f.set("/order?mpid=21", f.get("/order?mpid=21").replace("main-SYNTH001.js", "main-SYNTH002.js"));
    f.set("/main-SYNTH002.js", f.get("/main-SYNTH001.js"));
  });
  const spy = spyVisit(recorded(MENU_A));
  const { result } = await run(LIB, { when: FRIDAY_NOON, visit: spy.visit, files });
  assert.equal(result.f3.ran, true);
  assert.equal(result.f6.ran, true);
  assert.equal(spy.calls.length, 1, "one visit for F3, F4 and F6");
  assert.equal(spy.calls[0].menu, true);
});

test("W22: the menu not read is a flag, never a switch: no catalog response; none in all-meals; the visit failing", async () => {
  const { menuIssueTitle } = await import(new URL("menu-issue.mjs", LIB).href);
  const none = recorded(MENU_A);
  none.menu = null;
  const empty = recorded([]);
  for (const visit of [spyVisit(none).visit, spyVisit(empty).visit, async () => { throw new Error("Failed to launch the browser process"); }]) {
    const { result } = await run(LIB, { when: FRIDAY_NOON, visit });
    assert.deepEqual(result.flags, ["F6"]);
    assert.equal(result.f6.unread, true, result.f6.summary);
    assert.match(menuIssueTitle(result.f6), /^storefront-watch: the menu could not be read \(Friday 2026-10-09\)$/);
  }
});

test("W22: a baseline with no menu yet: F6 informational (not flagged), the page's menu listed", async () => {
  const { renderReport } = await import(new URL("report.mjs", LIB).href);
  const { result } = await run(LIB, { when: FRIDAY_NOON, baseline: w1Baseline(), visit: spyVisit(recorded(MENU_B)).visit });
  assert.deepEqual(result.flags, []);
  assert.equal(result.f6.informational, true);
  assert.match(renderReport(result), /no menu accepted yet/);
});

// ── W23: one meal added (or renamed): not flagged, reported ─────────────────────────────────────────────────────────

async function w23Case(lib) {
  const { renderReport } = await import(new URL("report.mjs", lib).href);
  const added = await run(lib, { when: FRIDAY_NOON, visit: spyVisit(recorded([...MENU_A, "Thai Basil Beef"])).visit });
  assert.equal(added.result.f6.flag, false, `one meal added: ${added.result.f6.summary}`);
  assert.deepEqual(added.result.flags, []);
  assert.deepEqual(added.result.f6.added.map((m) => m.name), ["Thai Basil Beef"]);
  const report = renderReport(added.result);
  const f6 = report.slice(report.indexOf("## F6"));
  assert.ok(f6.includes("Thai Basil Beef"), "reported in the run's text");

  const renamed = MENU_A.map((n) => (n === "Turkey Chili" ? "Turkey Chili Verde" : n));
  const r = await run(lib, { when: FRIDAY_NOON, visit: spyVisit(recorded(renamed)).visit });
  assert.equal(r.result.f6.flag, false, `one meal renamed: ${r.result.f6.summary}`);
  assert.deepEqual(r.result.f6.added.map((m) => m.name), ["Turkey Chili Verde"]);
  assert.deepEqual(r.result.f6.removed, [mealKey("Turkey Chili")]);
  assert.ok(renderReport(r.result).includes(mealKey("Turkey Chili")), "the gone key reported");
}

test("W23: one meal added to A, or one renamed: not flagged, reported in the run's text", async () => {
  await w23Case(LIB);
});

// ── W24: a Tuesday: F6 not run, and the run's requests are today's ──────────────────────────────────────────────────

async function w24Case(lib) {
  for (const when of [TUESDAY, THURSDAY_LAST, SATURDAY_START]) {
    const spy = spyVisit(recorded(MENU_B));
    const seen = [];
    const { result, calls } = await run(lib, { when, visit: spy.visit, seen: async (friday) => (seen.push(friday), null) });
    assert.equal(result.f6?.ran, false, `${when.toISOString()}: F6 not run`);
    assert.match(result.f6.note, /not a Friday in America\/New_York/);
    assert.deepEqual(calls, HOURLY_CALLS, "the run's requests are W1's: the page and its entry");
    assert.equal(spy.calls.length, 0, "no visit");
    assert.deepEqual(seen, [], "no issue record read");
    assert.deepEqual(result.flags, []);
  }
}

test("W24: a Tuesday (and Thursday 23:59, Saturday 00:00 in New York): F6 not run; the run's requests are today's", async () => {
  await w24Case(LIB);
});

test("W24 control: Friday 00:00 in New York (04:00 UTC): F6 runs, its one visit asked for the menu", async () => {
  const spy = spyVisit(recorded(MENU_A));
  const { result, calls } = await run(LIB, { when: FRIDAY_START, visit: spy.visit });
  assert.equal(result.f6.ran, true);
  assert.equal(result.f6.friday, "2026-10-09");
  assert.deepEqual(calls, HOURLY_CALLS, "the watch's own requests are still the page and its entry");
  assert.deepEqual(spy.calls, [{ menu: true }]);
  assert.equal(result.f3.ran, false, "F3 and F4 keep their own schedule");
});

test("W24: a dispatch runs F6 on any day", async () => {
  const spy = spyVisit(recorded(MENU_A));
  const { result } = await run(LIB, { when: TUESDAY, visit: spy.visit, full: true });
  assert.equal(result.f6.ran, true);
  assert.equal(spy.calls.length, 1, "one visit for F3, F4 and F6");
});

// ── W25: a "menu switched" issue for this Friday: F6 not run ────────────────────────────────────────────────────────

const menuIssue = (number, friday, state = "OPEN") => ({
  number,
  state,
  title: "storefront-watch: the menu switched (7 of 9 keys new)",
  body: `the new names\n\n<!-- storefront-watch menu-switched friday=${friday} -->\n`,
});

test("W25: an open \"menu switched\" issue for this Friday: F6 not run, no visit, the issue named", async () => {
  const { switchSeen } = await import(new URL("menu-issue.mjs", LIB).href);
  const { gh, calls: ghCalls } = fakeGh([menuIssue(31, "2026-10-09")]);
  const spy = spyVisit(recorded(MENU_B));
  const { result, calls } = await run(LIB, { when: FRIDAY_NOON, visit: spy.visit, seen: switchSeen({ gh }) });
  assert.equal(result.f6.ran, false, "F6 not run");
  assert.match(result.f6.note, /#31/);
  assert.equal(spy.calls.length, 0, "no visit");
  assert.deepEqual(calls, HOURLY_CALLS);
  assert.deepEqual(result.flags, []);
  assert.equal(ghCalls.length, 1, "one list of the label's issues");
});

test("W25: a closed one for this Friday also stops it (accepted the same day); last Friday's does not", async () => {
  const { switchSeen } = await import(new URL("menu-issue.mjs", LIB).href);
  const closed = await run(LIB, { when: FRIDAY_NOON, visit: spyVisit(recorded(MENU_B)).visit, seen: switchSeen(fakeGh([menuIssue(31, "2026-10-09", "CLOSED")])) });
  assert.equal(closed.result.f6.ran, false);
  const spy = spyVisit(recorded(MENU_B));
  const last = await run(LIB, { when: FRIDAY_NOON, visit: spy.visit, seen: switchSeen(fakeGh([menuIssue(30, "2026-10-02")])) });
  assert.equal(last.result.f6.ran, true, "last Friday's switch is not this Friday's");
  assert.deepEqual(last.result.flags, ["F6"]);
});

test("W25: the issue record cannot be read: F6 runs (a missed switch costs more than a second issue)", async () => {
  const spy = spyVisit(recorded(MENU_A));
  const { result } = await run(LIB, { when: FRIDAY_NOON, visit: spy.visit, seen: async () => { throw new Error("gh issue list: HTTP 502"); } });
  assert.equal(result.f6.ran, true);
  assert.equal(spy.calls.length, 1);
});

test("W25: filing — an open issue for this Friday's switch: nothing added; a release flag still files its own issue", async () => {
  const { renderReport } = await import(new URL("report.mjs", LIB).href);
  const { fileRunIssues } = await import(new URL("run-issues.mjs", LIB).href);
  const files = syntheticStore((f) => {
    f.set("/order?mpid=21", f.get("/order?mpid=21").replace("main-SYNTH001.js", "main-SYNTH002.js"));
    f.set("/main-SYNTH002.js", f.get("/main-SYNTH001.js"));
  });
  const { result } = await run(LIB, { when: TUESDAY, full: true, files, visit: spyVisit(recorded(MENU_B)).visit });
  assert.deepEqual(result.flags, ["F1", "F6"]);
  const { gh, calls } = fakeGh([menuIssue(31, "2026-10-02")]);
  const done = await fileRunIssues({ gh, result, report: renderReport(result) });
  assert.equal(done.menu.action, "none", "this week's switch already has its open issue");
  const [create] = calls.filter((c) => c.args[0] === "issue" && c.args[1] === "create");
  assert.equal(create.args[create.args.indexOf("--title") + 1], "storefront-watch: F1 on main-SYNTH002.js", "the release issue, without F6");
});

// ── ⭐ Mutants: a copy of lib/ in a temporary directory, the check replaced; no file in the repository is edited ─────

/** A copy of lib/ alone, as W3's and W7f's: the watch, its rule and its issues import nothing of the site's. */
async function mutant(file, check, replacement, fn) {
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-f6-mutant-"));
  try {
    const lib = join(dir, "lib");
    await cp(fileURLToPath(LIB), lib, { recursive: true });
    const source = await readFile(join(lib, file), "utf8");
    assert.equal(source.split(check).length, 2, `${file}: the check appears exactly once`);
    await writeFile(join(lib, file), source.replace(check, replacement));
    await fn(pathToFileURL(join(lib, "/")));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const caught = (err) => {
  assert.ok(err instanceof assert.AssertionError, String(err?.stack ?? err));
  return true;
};

test("mutant: the half-rule inverted (a switch when HALF OR MORE are still listed) fails W22 and W23", async () => {
  await mutant("menu-check.mjs", "kept * 2 < base.size", "kept * 2 >= base.size", async (lib) => {
    await assert.rejects(w22Case(lib), caught);
    await assert.rejects(w23Case(lib), caught);
  });
});

test("mutant: the day gate removed (every day a Friday) fails W24", async () => {
  await mutant("cutover.mjs", "!day.isFriday", "false", async (lib) => {
    await assert.rejects(w24Case(lib), caught);
  });
});

test("mutant control: the unmutated copy passes W22, W23 and W24 (the copy itself is sound)", async () => {
  await mutant("menu-check.mjs", "kept * 2 < base.size", "kept * 2 < base.size", async (lib) => {
    await w22Case(lib);
    await w23Case(lib);
    await w24Case(lib);
  });
});

// ── accept --menu (§ 12 item 5): the live menu's keys into the baseline, and nothing else ──────────────────────────

async function withBaseline(text, fn) {
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-f6-accept-"));
  try {
    const path = join(dir, "watch-baseline.json");
    if (text !== null) await writeFile(path, text);
    return await fn(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function command(argv, path, visit) {
  const { acceptCommand } = await import(new URL("accept-command.mjs", LIB).href);
  const store = fakeFetch(syntheticStore());
  const out = [];
  const err = [];
  const code = await acceptCommand(argv, {
    fetcher: storeFetcher({ fetchImpl: store.fetchImpl, origin: ORIGIN }),
    path,
    page: PAGE,
    visit,
    out: (l) => out.push(l),
    err: (l) => err.push(l),
  });
  return { code, out, err, calls: store.calls };
}

test("accept --menu writes B's keys into the baseline (and nothing else); the next Friday run is then green", async () => {
  await withBaseline(baselineText(baselineWithMenu(MENU_A)), async (path) => {
    const spy = spyVisit(recorded(MENU_B));
    const r = await command(["--menu"], path, spy.visit);
    assert.equal(r.code, 0, r.err.join("\n"));
    assert.equal(await readFile(path, "utf8"), baselineText(baselineWithMenu(MENU_B)), "exactly the baseline, its menu B's keys");
    assert.equal(r.out[0], "accepted the menu: 9 meals");
    assert.deepEqual(spy.calls, [{ menu: true }]);
    assert.deepEqual(r.calls, [], "no request of the watch's own: the menu is the page's");
    const after = await run(LIB, { when: FRIDAY_NOON, baseline: JSON.parse(await readFile(path, "utf8")), visit: spyVisit(recorded(MENU_B)).visit });
    assert.deepEqual(after.result.flags, []);
  });
});

test("accept --menu: a menu that cannot be read is refused, nothing written; --menu with --release or --footer is a usage error", async () => {
  const before = baselineText(baselineWithMenu(MENU_A));
  await withBaseline(before, async (path) => {
    const none = recorded(MENU_A);
    none.menu = null;
    const r = await command(["--menu"], path, spyVisit(none).visit);
    assert.equal(r.code, 1);
    assert.equal(await readFile(path, "utf8"), before, "nothing written");
    assert.ok(r.err.some((l) => l.includes("refused")), r.err.join("\n"));
    for (const argv of [["--menu", "--release", "main-SYNTH001.js"], ["--menu", "--footer", "null"]]) {
      const u = await command(argv, path, spyVisit(recorded(MENU_B)).visit);
      assert.equal(u.code, 2, argv.join(" "));
      assert.ok(u.err.some((l) => l.includes("usage: npm run accept")));
      assert.equal(await readFile(path, "utf8"), before);
    }
  });
});

test("accept --release keeps the baseline's menu, as it keeps expectedFooter", async () => {
  const { acceptBaseline } = await import(new URL("baseline.mjs", LIB).href);
  await withBaseline(baselineText({ ...baselineWithMenu(MENU_A), entry: "main-OLDER001.js" }), async (path) => {
    await acceptBaseline({ fetcher: storeFetcher({ fetchImpl: fakeFetch(syntheticStore()).fetchImpl, origin: ORIGIN }), path, page: PAGE, release: "main-SYNTH001.js" });
    assert.equal(await readFile(path, "utf8"), baselineText(baselineWithMenu(MENU_A)));
  });
});

// ── W22 and W23 in headless Chrome: the page's own catalog response, read by the real visit ────────────────────────

const chrome = (() => {
  try {
    return chromePath();
  } catch {
    return null;
  }
})();
const skip = chrome ? false : "no Chrome found (set CHROME_PATH)";

let store;
let backend;
before(async () => {
  if (skip) return;
  store = await startStore();
  backend = await startBackend();
  store.set({ catalog: backend.url({ paginate: "1", meal_plan_id: "21" }) });
});
after(async () => {
  await store?.close();
  await backend?.close();
});

async function chromeRun(names) {
  const { ordinaryVisit } = await import(new URL("visit.mjs", LIB).href);
  backend.set({ menu: names, snacks: ["Protein Brownie", "Golden Oreo Protein Sand"] });
  const visit = (opts) => ordinaryVisit({ page: `${store.origin}/order?mpid=21`, executablePath: chrome, renderMs: 10_000, settleMs: 300, ...opts });
  return (await run(LIB, { when: FRIDAY_NOON, visit })).result;
}

test("W22 (Chrome): the synthetic store serving menu A: F6 green; serving B: flagged, 7 of 9 keys new", { skip }, async () => {
  const { menuIssueTitle } = await import(new URL("menu-issue.mjs", LIB).href);
  const a = await chromeRun(MENU_A);
  assert.equal(a.f6.ran, true);
  assert.equal(a.f6.flag, false, a.f6.summary);
  assert.deepEqual(a.f6.live.map((m) => m.name), MENU_A, "the all-meals products, in the response's order; no snack");
  const b = await chromeRun(MENU_B);
  assert.deepEqual(b.flags, ["F6"], b.f6.summary);
  assert.equal(menuIssueTitle(b.f6), "storefront-watch: the menu switched (7 of 9 keys new)");
});

test("W23 (Chrome): one meal added: not flagged, reported", { skip }, async () => {
  const r = await chromeRun([...MENU_A, "Thai Basil Beef"]);
  assert.equal(r.f6.flag, false, r.f6.summary);
  assert.deepEqual(r.f6.added.map((m) => m.name), ["Thai Basil Beef"]);
});
