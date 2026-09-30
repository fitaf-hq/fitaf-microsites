// W7b–W7f (SPEC-storefront-watch § 8): `accept` names the release it accepts, and refuses any other. On 2026-09-29 an
// accept run ~35 minutes after issue #2's checks passed recorded whatever was live, which was already the NEXT release
// (349adcb reverted it). Each case runs at both doors: the library (lib/baseline.mjs, acceptBaseline, which writes the
// file) and the command (lib/accept-command.mjs, which bin/accept.mjs runs: its printed lines and its exit code). The
// synthetic store serves every request through an injected fetch: no network, and bin/accept.mjs is never run here.
// ⭐ W7f, the mutant: a copy of lib/ in a temporary directory whose name check always passes; no file in the repository
// is edited. W7c fails on it.
import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { storeFetcher } from "../lib/store-fetch.mjs";
import { baselineText, fakeFetch, ORIGIN, PAGE, syntheticStore, w1Baseline } from "./synthetic-store.mjs";

const LIB = new URL("../lib/", import.meta.url);
/** The synthetic store's entry: the release that is live. */
const ENTRY = "main-SYNTH001.js";
/** The baseline file as it stood: an earlier release's. A refused accept leaves it byte for byte. */
const BEFORE = baselineText({ ...w1Baseline(), entry: "main-OLDER001.js" });
/** § 8 item 2's words, after the two names. */
const WHY = ": a newer release has landed; its own checks run on the next flag";
/** The name check W7f makes always pass (lib/baseline.mjs). */
const CHECK = "live !== release";

async function withDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-w7-release-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function readIfAny(path) {
  try {
    return await readFile(path, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

const synthetic = () => fakeFetch(syntheticStore());

/** The library door: acceptBaseline from `lib`, over a baseline file holding BEFORE. Its error (or null), the file after. */
async function library(lib, { release, footer, store = synthetic() }) {
  const { acceptBaseline } = await import(new URL("baseline.mjs", lib).href);
  return withDir(async (dir) => {
    const path = join(dir, "watch-baseline.json");
    await writeFile(path, BEFORE);
    let error = null;
    try {
      await acceptBaseline({ fetcher: storeFetcher({ fetchImpl: store.fetchImpl, origin: ORIGIN }), path, page: PAGE, footer, release });
    } catch (err) {
      error = err;
    }
    return { error, after: await readIfAny(path), calls: store.calls };
  });
}

/** The command door, as bin/accept.mjs runs it: its exit code, what it printed (out, err), the file after. */
async function command(lib, argv, { store = synthetic() } = {}) {
  const { acceptCommand } = await import(new URL("accept-command.mjs", lib).href);
  return withDir(async (dir) => {
    const path = join(dir, "watch-baseline.json");
    await writeFile(path, BEFORE);
    const out = [];
    const err = [];
    const code = await acceptCommand(argv, {
      fetcher: storeFetcher({ fetchImpl: store.fetchImpl, origin: ORIGIN }),
      path,
      page: PAGE,
      out: (line) => out.push(line),
      err: (line) => err.push(line),
    });
    return { code, out, err, path, after: await readIfAny(path), calls: store.calls };
  });
}

/** A refusal at the command: non-zero, nothing printed as accepted, `words` said, the file as it was. */
function assertRefused(r, words) {
  assert.equal(r.after, BEFORE, "the baseline file byte-identical to before");
  assert.notEqual(r.code, 0, "exit non-zero");
  assert.deepEqual(r.out, [], "nothing printed as accepted");
  assert.ok(r.err.some((line) => line.includes(words)), `said ${JSON.stringify(words)}; got ${JSON.stringify(r.err)}`);
}

test("W7b: accept --release <the synthetic entry> writes exactly W7's baseline and prints `accepted <entry>`", async () => {
  const l = await library(LIB, { release: ENTRY });
  assert.equal(l.error, null, String(l.error));
  assert.equal(l.after, baselineText(w1Baseline()), "the library: exactly W7's baseline");

  const r = await command(LIB, ["--release", ENTRY]);
  assert.equal(r.code, 0, r.err.join("\n"));
  assert.equal(r.after, baselineText(w1Baseline()), "exactly W7's baseline");
  assert.equal(r.out[0], `accepted ${ENTRY}`, "the first line names the release, in the issue's own words");
  assert.equal(r.out[1], `wrote ${r.path}`, "then as before");
  assert.deepEqual(r.err, []);
  // § 8 item 2: the entry read again AFTER the release's files: the page is fetched twice, the second time last.
  assert.equal(r.calls.filter((url) => url === PAGE).length, 2, JSON.stringify(r.calls));
  assert.equal(r.calls.at(-1), PAGE);
  assert.ok(r.calls.indexOf(`${ORIGIN}/chunk-DDDD0004.js`) < r.calls.length - 1, "the release's files read before it");
});

/** W7c, shared with W7f's mutant. */
async function w7cCase(lib) {
  const other = "main-OTHER.js";
  const refusal = `the live entry is ${ENTRY}, not ${other}${WHY}`;
  const l = await library(lib, { release: other });
  assert.equal(l.after, BEFORE, "the library: the baseline file byte-identical to before");
  assert.ok(String(l.error?.message).includes(refusal), `the library refuses, naming both: ${l.error}`);
  assert.deepEqual(l.calls, [PAGE, `${ORIGIN}/${ENTRY}`], "refused at the first read: the release's files never fetched");
  // § 8 item 4: --footer is refused like everything else when the release does not match.
  for (const footer of [[], ["--footer", "null"]]) assertRefused(await command(lib, ["--release", other, ...footer]), refusal);
}

test("W7c: accept --release main-OTHER.js on the synthetic store: refused, naming both; the file as it was; exit non-zero", async () => {
  await w7cCase(LIB);
});

for (const [label, argv] of [
  ["with no --release", []],
  ["with --footer null and no --release", ["--footer", "null"]],
  ["with --release chunk-X.js", ["--release", "chunk-X.js"]],
  ["with --release and no name", ["--release"]],
  ["with --release given the entry's URL, not its name", ["--release", `${ORIGIN}/${ENTRY}`]],
]) {
  test(`W7d: accept ${label}: usage; nothing written; no request; exit non-zero`, async () => {
    const r = await command(LIB, argv);
    assertRefused(r, "usage: npm run accept -- --release main-<name>.js");
    assert.deepEqual(r.calls, [], "no request at all");
  });
}

test("W7d: the library, too, refuses to accept without an entry's name: nothing written, no request", async () => {
  for (const release of [undefined, "chunk-X.js"]) {
    const l = await library(LIB, { release });
    assert.equal(l.after, BEFORE, `release ${release}: the file as it was`);
    assert.match(String(l.error?.message), /--release main-<name>\.js/, `release ${release}: ${l.error}`);
    assert.deepEqual(l.calls, [], `release ${release}: no request`);
  }
});

/** The synthetic store, releasing main-SYNTH002.js between accept's first read of the page and its second. */
function releasedDuring(next) {
  const first = synthetic();
  const later = fakeFetch(
    syntheticStore((f) => {
      f.set("/order?mpid=21", f.get("/order?mpid=21").replace(ENTRY, next));
      f.set(`/${next}`, f.get(`/${ENTRY}`));
    }),
  );
  const calls = [];
  let pageReads = 0;
  const fetchImpl = (url, init) => {
    calls.push(String(url));
    if (String(url) === PAGE) pageReads += 1;
    return (pageReads > 1 ? later : first).fetchImpl(url, init);
  };
  return { fetchImpl, calls };
}

test("W7e: the synthetic store's entry changes between the first read and the second: refused; nothing written", async () => {
  const next = "main-SYNTH002.js";
  const refusal = `the live entry is ${next}, not ${ENTRY}${WHY}`;
  const l = await library(LIB, { release: ENTRY, store: releasedDuring(next) });
  assert.equal(l.after, BEFORE, "the library: nothing written");
  assert.ok(String(l.error?.message).includes(refusal), `the library refuses, naming both: ${l.error}`);
  assert.ok(l.calls.includes(`${ORIGIN}/chunk-DDDD0004.js`), "the release's files were read: the SECOND read refused it");
  assert.equal(l.calls.at(-1), PAGE, "the page, read again, last");

  assertRefused(await command(LIB, ["--release", ENTRY], { store: releasedDuring(next) }), refusal);
});

test("W7f mutant: a name check that always passes is caught (W7c fails on it)", async () => {
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-w7f-"));
  try {
    await cp(fileURLToPath(LIB), join(dir, "lib"), { recursive: true });
    const target = join(dir, "lib", "baseline.mjs");
    const source = await readFile(target, "utf8");
    assert.equal(source.split(CHECK).length, 2, "the check appears exactly once");
    await writeFile(target, source.replace(CHECK, "false"));
    await assert.rejects(w7cCase(pathToFileURL(join(dir, "lib", "/"))), (err) => {
      assert.ok(err instanceof assert.AssertionError, String(err));
      return true;
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
