// The mutants of SPEC-analytics.md § 7, each red on its own case. Each is a change to a MIRROR of the package's inputs
// (cc-harness mirror(): build.mjs, package.json, data/, scripts/, src/ copied to a temporary directory, this package's
// node_modules linked, and its wrangler.jsonc; never the tree: protocols/mutate-in-a-mirror.md), checked by THE SAME
// function its case runs on this package (test/a-checks.mjs). The unchanged mirror runs first as the control and passes
// all four.
//
//   the IP written into a blob            (beacon.js: the country's blob holds CF-Connecting-IP)   fails A4
//   localStorage used for s               (analytics.js: s read from, and kept in, localStorage)  fails A2
//   the salt written without an expiry    (beacon.js: SALTS.put with no options)                   fails A6
//   the vocabulary check removed          (beacon.js: any JSON object is an event)                 fails A3
import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { ipUaProblems, refusalProblems, saltExpiryProblems, storageProblems } from "./a-checks.mjs";
import { mirror } from "./cc-harness.mjs";

/** Replace `from` (present exactly once) with `to` in the mirror's file `rel`. */
async function edit(dir, rel, from, to) {
  const path = join(dir, rel);
  const text = await readFile(path, "utf8");
  assert.equal(text.split(from).length - 1, 1, `the mutation anchor is in ${rel} once: ${from.slice(0, 80)}`);
  await writeFile(path, text.replace(from, () => to));
}

/** A mirror (with the package's wrangler.jsonc) changed by `change(dir)`, and `fn(dir)` run over it; removed after. */
async function withMirror(change, fn) {
  const dir = await mirror(async (d) => {
    await copyFile(join(ROOT, "wrangler.jsonc"), join(d, "wrangler.jsonc"));
    await change(d);
  });
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const BEACON_JS = join("src", "worker", "beacon.js");
const PAGE_JS = join("src", "analytics.js");

test("A mutants (control): the unchanged mirror passes A2, A3, A4 and A6", async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await storageProblems(dir), [], "A2");
    assert.deepEqual(await refusalProblems(dir), [], "A3");
    assert.deepEqual(await ipUaProblems(dir), [], "A4");
    assert.deepEqual(await saltExpiryProblems(dir), [], "A6");
  });
});

test("A mutant: the IP written into a blob fails A4", async () => {
  await withMirror(
    (dir) => edit(dir, BEACON_JS, "country: countryOf(request),", 'country: request.headers.get("cf-connecting-ip") ?? "",'),
    async (dir) => {
      const problems = await ipUaProblems(dir);
      assert.ok(problems.some((p) => p.includes('"203.0.113.7"')), `A4 fails it:\n${problems.join("\n")}`);
    },
  );
});

test("A mutant: localStorage used for s fails A2", async () => {
  await withMirror(
    (dir) => edit(dir, PAGE_JS, "  var s = visitId();\n", '  var s = localStorage.getItem("fitaf-s") || visitId();\n  localStorage.setItem("fitaf-s", s);\n'),
    async (dir) => {
      const problems = await storageProblems(dir);
      assert.ok(problems.includes("touched localStorage"), `A2 fails it:\n${problems.join("\n")}`);
    },
  );
});

test("A mutant: the salt written without an expiry fails A6", async () => {
  await withMirror(
    (dir) => edit(dir, BEACON_JS, "await salts.put(key, salt, { expirationTtl: saltTtl(now) });", "await salts.put(key, salt);"),
    async (dir) => {
      const problems = await saltExpiryProblems(dir);
      assert.ok(problems.some((p) => /no expiry/.test(p)), `A6 fails it:\n${problems.join("\n")}`);
      assert.ok(problems.some((p) => /no expiration/.test(p)), `and the namespace says so:\n${problems.join("\n")}`);
    },
  );
});

test("A mutant: the vocabulary check removed fails A3", async () => {
  await withMirror(
    (dir) => edit(dir, BEACON_JS, "export function checkedEvent(body) {\n", "export function checkedEvent(body) {\n  return isObject(body) ? body : null;\n"),
    async (dir) => {
      const problems = await refusalProblems(dir);
      for (const label of ["an event outside § 3", "an extra field", "an error carrying a message"]) {
        assert.ok(problems.some((p) => p.startsWith(`${label}: written`)), `A3 fails it on "${label}":\n${problems.join("\n")}`);
      }
    },
  );
});
