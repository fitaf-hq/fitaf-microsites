// The mutants of SPEC-the-redirect.md § 7, each red on its own case. Each is a change to a MIRROR of the package's
// inputs (cc-harness mirror(): build.mjs, package.json, wrangler.jsonc, data/, scripts/, src/ and consent/ copied to a
// temporary directory, this package's node_modules linked; never the tree: protocols/mutate-in-a-mirror.md), checked by
// THE SAME function its case runs on this package (test/rd-checks.mjs). The unchanged mirror runs first as the control
// and passes RD1, RD2, RD4, RD5 and RD9.
//
//   a 301                                     (redirect.js: the answer's status)                     fails RD1
//   the visitor's query passed through        (site.js: the request's query appended to the Location) fails RD1 and RD5
//   /assets/ redirected                       (site.js: a path under /assets/ redirected as / is)    fails RD2
//   the cookie ignored                        (site.js: § 12's cookie no longer keeps a redirect out) fails RD4
//   the report counting redirect-only visits  (scripts/analytics.mjs: the visitors query without its
//     as visits                                 redirect condition)                                  fails RD9
//   the list back to `bot`                    (redirect.js: § 10 item 2's rule undone, a Cubot phone
//                                               a program again)                                    fails RD4b
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mirror } from "./cc-harness.mjs";
import { extractBase } from "./em-a-checks.mjs";
import { cubotProblems, dataPointProblems, identifyingProblems, locationProblems, otherPathProblems, reportProblems } from "./rd-checks.mjs";

/** RD9's base: SPEC-the-redirect.md's contract commit, § 16's report. */
const BASE = "d59aec4";
const scratch = await realpath(await mkdtemp(join(tmpdir(), "boston-rd-mutants-")));
test.after(() => rm(scratch, { recursive: true, force: true }));
const base = extractBase(BASE, scratch);

/** Replace `from` (present exactly once) with `to` in the mirror's file `rel`. */
async function edit(dir, rel, from, to) {
  const path = join(dir, rel);
  const text = await readFile(path, "utf8");
  assert.equal(text.split(from).length - 1, 1, `the mutation anchor is in ${rel} once: ${from.slice(0, 80)}`);
  await writeFile(path, text.replace(from, () => to));
}

/** A mirror changed by `change(dir)`, and `fn(dir)` run over it; removed after. */
async function withMirror(change, fn) {
  const dir = await mirror(change);
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const SITE_JS = join("src", "worker", "site.js");
const REDIRECT_JS = join("src", "worker", "redirect.js");
const REPORT = join("scripts", "analytics.mjs");
const ENTRIES = ["site", "index"];

test("RD mutants (control): the unchanged mirror passes RD1, RD2, RD4, RD4b, RD5 and RD9", async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await locationProblems(dir), [], "RD1");
    assert.deepEqual(await otherPathProblems(dir), [], "RD2");
    assert.deepEqual(await dataPointProblems(dir), [], "RD4");
    assert.deepEqual(await cubotProblems(dir), [], "RD4b");
    assert.deepEqual(await identifyingProblems(dir), [], "RD5");
    assert.deepEqual(await reportProblems(dir, base), [], "RD9");
  });
});

test("RD mutant: a 301 fails RD1", async () => {
  await withMirror(
    (dir) => edit(dir, REDIRECT_JS, "const REDIRECT_STATUS = 302;", "const REDIRECT_STATUS = 301;"),
    async (dir) => {
      const problems = await locationProblems(dir);
      for (const entry of ENTRIES) assert.ok(problems.includes(`${entry} GET eatfitaf.com/: 301, not 302`), `RD1 fails it on ${entry}:\n${problems.join("\n")}`);
    },
  );
});

test("RD mutant: the visitor's query passed through fails RD1 and RD5", async () => {
  await withMirror(
    (dir) => edit(dir, SITE_JS, "return redirectResponse(markedLocation(target, marker));", 'return redirectResponse(markedLocation(target, marker) + url.search.replace(/^\\?/, "&"));'),
    async (dir) => {
      const rd1 = await locationProblems(dir);
      const rd5 = await identifyingProblems(dir);
      for (const entry of ENTRIES) {
        assert.ok(rd1.some((p) => p.startsWith(`${entry} GET eatfitaf.com/?e=boston: Location `)), `RD1 fails it on ${entry}:\n${rd1.join("\n")}`);
        assert.ok(rd5.some((p) => p.startsWith(`${entry}: the Location carries the visitor's query`)), `RD5 fails it on ${entry}:\n${rd5.join("\n")}`);
      }
      assert.ok(!rd1.some((p) => p.includes("GET eatfitaf.com/: ")), `a request with no query is still right:\n${rd1.join("\n")}`);
    },
  );
});

test("RD mutant: /assets/ redirected fails RD2", async () => {
  await withMirror(
    (dir) => edit(dir, SITE_JS, "if (url.pathname !== HOME_PATH || ", 'if ((url.pathname !== HOME_PATH && !url.pathname.startsWith("/assets/")) || '),
    async (dir) => {
      const problems = await otherPathProblems(dir);
      for (const entry of ENTRIES) {
        assert.ok(problems.some((p) => p.startsWith(`${entry} GET /assets/email/halftone-ink.png: 302 with the var, 200 without`)), `RD2 fails it on ${entry}:\n${problems.join("\n")}`);
        assert.ok(problems.some((p) => p.startsWith(`${entry}, the var set GET /assets/email/halftone-ink.png: 302 and 0 bytes, not 200`)), `and E1's image is not served on ${entry}:\n${problems.join("\n")}`);
      }
    },
  );
});

test("RD mutant: the cookie ignored fails RD4", async () => {
  await withMirror(
    (dir) => edit(dir, SITE_JS, 'if (request.method === "GET" && !carriesNoTracking(request) && !isProgram(', 'if (request.method === "GET" && !isProgram('),
    async (dir) => {
      const problems = await dataPointProblems(dir);
      for (const entry of ENTRIES) assert.ok(problems.includes(`${entry} Cookie "fitaf_no_tracking=1": written (1 data point(s))`), `RD4 fails it on ${entry}:\n${problems.join("\n")}`);
    },
  );
});

test("RD mutant: the report counting redirect-only visits as visits fails RD9", async () => {
  await withMirror(
    (dir) => edit(dir, REPORT, " AND ${col(\"event\")} != '${REDIRECT_EVENT}'`;", "`;"),
    async (dir) => {
      const problems = await reportProblems(dir, base);
      for (const line of ["2026-10-26: visitors 4, not 1", "2026-10-26: visits 4, not 1", "2026-10-27: visits 3, not 0"]) {
        assert.ok(problems.includes(line), `RD9 fails it with ${line}:\n${problems.join("\n")}`);
      }
    },
  );
});

test("RD mutant: the list back to bot fails RD4b (SPEC-the-redirect.md § 10)", async () => {
  await withMirror(
    (dir) => edit(dir, REDIRECT_JS, "/(?<!cu)bot|crawl", "/bot|crawl"),
    async (dir) => {
      const problems = await cubotProblems(dir);
      for (const entry of ENTRIES) {
        const lost = problems.filter((p) => p.startsWith(`${entry} a Cubot phone`) && p.endsWith("0 data point(s), not 1 (a person's phone, counted)"));
        assert.equal(lost.length, 2, `RD4b fails it on ${entry}, both Cubot phones uncounted:\n${problems.join("\n")}`);
      }
      assert.ok(!problems.some((p) => p.includes("written")), `every named program still uncounted:\n${problems.join("\n")}`);
    },
  );
});
