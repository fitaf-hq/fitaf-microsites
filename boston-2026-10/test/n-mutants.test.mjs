// The mutants of SPEC-analytics.md § 12 item 6, each red on its own case. Each is a change to a MIRROR of the package's
// inputs (cc-harness mirror(): build.mjs, package.json, wrangler.jsonc, data/, scripts/, src/ and consent/ copied to a
// temporary directory, this package's node_modules linked; never the tree: protocols/mutate-in-a-mirror.md), checked by
// THE SAME function its case runs on this package (test/n-checks.mjs). The unchanged mirror runs first as the control
// and passes all three.
//
//   the beacon ignoring the cookie        (site.js: POST /a always to serveBeacon)                fails N3
//   the cookie without HttpOnly           (site.js: the cookie's attributes lose HttpOnly)        fails N1 (and N2)
//   the redirect dropping another parameter (site.js: no other parameter kept)                    fails N1
//   `tracking` not clearing               (site.js: only `no-tracking` asks for a cookie)          fails N2
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mirror } from "./cc-harness.mjs";
import { switchOffProblems, switchOnProblems, uncountedProblems } from "./n-checks.mjs";

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

test("N mutants (control): the unchanged mirror passes N1, N2 and N3", async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await switchOnProblems(dir), [], "N1");
    assert.deepEqual(await switchOffProblems(dir), [], "N2");
    assert.deepEqual(await uncountedProblems(dir), [], "N3");
  });
});

test("N mutant: the beacon ignoring the cookie fails N3", async () => {
  await withMirror(
    (dir) => edit(dir, SITE_JS, "carriesNoTracking(request) ? uncounted() : serveBeacon(request, env)", "serveBeacon(request, env)"),
    async (dir) => {
      const problems = await uncountedProblems(dir);
      for (const entry of ["site", "index"]) {
        assert.ok(problems.some((p) => p.startsWith(`${entry} POST /a`) && p.includes(": written (1 data point(s))")), `N3 fails it on ${entry}:\n${problems.join("\n")}`);
        assert.ok(problems.some((p) => p.startsWith(`${entry} POST /a`) && p.includes(": SALTS used")), `and the salt was used on ${entry}:\n${problems.join("\n")}`);
      }
    },
  );
});

test("N mutant: the cookie without HttpOnly fails N1", async () => {
  await withMirror(
    (dir) => edit(dir, SITE_JS, "Secure; HttpOnly; SameSite=Lax", "Secure; SameSite=Lax"),
    async (dir) => {
      const problems = await switchOnProblems(dir);
      const without = JSON.stringify(["fitaf_no_tracking=1; Path=/; Max-Age=31536000; Secure; SameSite=Lax"]);
      for (const entry of ["site", "index"]) {
        assert.ok(problems.includes(`${entry} GET /?no-tracking: Set-Cookie ${without}, not ${JSON.stringify(["fitaf_no_tracking=1; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Lax"])}`), `N1 fails it on ${entry}:\n${problems.join("\n")}`);
      }
    },
  );
});

test("N mutant: the redirect dropping another parameter fails N1", async () => {
  await withMirror(
    (dir) => edit(dir, SITE_JS, "else if (part) kept.push(part);", "else if (part) void part;"),
    async (dir) => {
      const problems = await switchOnProblems(dir);
      for (const entry of ["site", "index"]) {
        const lost = problems.some((p) => p.startsWith(`${entry} GET /?e=boston&no-tracking: Location `) && p.endsWith(" is https://eatfitaf.com/, not https://eatfitaf.com/?e=boston"));
        assert.ok(lost, `N1 fails it on ${entry}:\n${problems.join("\n")}`);
      }
      assert.ok(!problems.some((p) => p.includes("GET /?no-tracking:")), `a request with no other parameter is still right:\n${problems.join("\n")}`);
    },
  );
});

test("N mutant: `tracking` not clearing fails N2", async () => {
  await withMirror(
    (dir) => edit(dir, SITE_JS, "cookie: clear ? NO_TRACKING_CLEAR : set ? NO_TRACKING_SET : null", "cookie: set ? NO_TRACKING_SET : null"),
    async (dir) => {
      const problems = await switchOffProblems(dir);
      for (const entry of ["site", "index"]) {
        assert.ok(problems.includes(`${entry} GET /?tracking: 200, not 302`), `N2 fails it on ${entry} (?tracking alone):\n${problems.join("\n")}`);
        assert.ok(problems.some((p) => p.startsWith(`${entry} GET /?no-tracking&tracking: Set-Cookie ["fitaf_no_tracking=1;`)), `and both at once set it, on ${entry}:\n${problems.join("\n")}`);
      }
    },
  );
});
