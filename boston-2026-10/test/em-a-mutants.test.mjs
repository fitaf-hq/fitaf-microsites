// The mutants of SPEC-analytics.md § 16 item 5, each red on its own case. Each is a change to a MIRROR of the package's
// inputs (cc-harness mirror(): build.mjs, package.json, wrangler.jsonc, data/, scripts/, src/ and consent/ copied to a
// temporary directory, this package's node_modules linked; never the tree: protocols/mutate-in-a-mirror.md), checked by
// THE SAME function its case runs on this package (test/em-a-checks.mjs). The unchanged mirror runs first as the control
// and passes EM-A1, EM-A2 and EM-A5.
//
//   the offer page's script reading location   (src/analytics.js: the offer's qr read from ?e= first, then the
//                                                Worker's copy derived again in the mirror, as npm run worker:script
//                                                would)                                                     fails EM-A1
//   via read from the query, not the fragment  (src/analytics.js: `via` from location.search)               fails EM-A2
//   the report counting offer-only visits      (scripts/analytics.mjs: the visitors query without its
//     as visits                                  plan-page condition)                                      fails EM-A5
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mirror } from "./cc-harness.mjs";
import { emailVisitProblems, extractBase, KINDS, offerPageProblems, offerPages, reportProblems } from "./em-a-checks.mjs";

/** The release line's commit carrying § 16's contract and none of its code (EM-A5's base). */
const BASE = "bc4ea03";
const scratch = await realpath(await mkdtemp(join(tmpdir(), "boston-em-a-mutants-")));
test.after(() => rm(scratch, { recursive: true, force: true }));
const base = extractBase(BASE, scratch);

/** Replace `from` (present exactly once) with `to` in the mirror's file `rel`. */
async function edit(dir, rel, from, to) {
  const path = join(dir, rel);
  const text = await readFile(path, "utf8");
  assert.equal(text.split(from).length - 1, 1, `the mutation anchor is in ${rel} once: ${from.slice(0, 80)}`);
  await writeFile(path, text.replace(from, () => to));
}

/** The Worker's copy of the page's script derived again in the mirror, as `npm run worker:script` derives it. */
function deriveWorkerScript(dir) {
  const r = spawnSync(process.execPath, [join(dir, "scripts", "worker-script.mjs")], { encoding: "utf8" });
  assert.equal(r.status, 0, `npm run worker:script in the mirror: ${r.stderr}`);
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

const PAGE_JS = join("src", "analytics.js");
const REPORT = join("scripts", "analytics.mjs");

test("EM-A mutants (control): the unchanged mirror passes EM-A1, EM-A2 and EM-A5", async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await offerPageProblems(dir, await offerPages(dir)), [], "EM-A1");
    assert.deepEqual(await emailVisitProblems(dir), [], "EM-A2");
    assert.deepEqual(await reportProblems(dir, base), [], "EM-A5");
  });
});

test("EM-A mutant: the offer page's script reading location fails EM-A1", async () => {
  await withMirror(
    async (dir) => {
      await edit(dir, PAGE_JS, '      send("offer", { qr: o.qr, kind: o.kind });\n', '      send("offer", { qr: qrEvent(w.location.search, QR_IDS) || o.qr, kind: o.kind });\n');
      deriveWorkerScript(dir);
    },
    async (dir) => {
      const pages = await offerPages(dir);
      const problems = await offerPageProblems(dir, pages);
      for (const kind of KINDS) {
        const labels = pages.filter((p) => p.kind === kind).map((p) => p.label);
        assert.ok(labels.length, `control: a page of kind ${kind}`);
        for (const label of labels) {
          assert.ok(problems.includes(`${label}: the script read the page's address: location.search`), `EM-A1 fails it on ${label}:\n${problems.join("\n")}`);
        }
      }
    },
  );
});

test("EM-A mutant: via read from the query instead of the fragment fails EM-A2", async () => {
  await withMirror(
    (dir) => edit(dir, PAGE_JS, '    via: w.location.hash == "#from-email" ? "email" : ""\n', '    via: /from-email/.test(w.location.search) ? "email" : ""\n'),
    async (dir) => {
      const problems = await emailVisitProblems(dir);
      for (const target of ["prod", "dev"]) {
        assert.ok(problems.includes(`${target}, opened at /#from-email: the open carries via "", not "email"`), `EM-A2 fails it on ${target}:\n${problems.join("\n")}`);
      }
    },
  );
});

test("EM-A mutant: the report counting offer-only visits as visits fails EM-A5", async () => {
  await withMirror(
    (dir) => edit(dir, REPORT, " AND ${planPage} GROUP BY day ORDER BY day", " GROUP BY day ORDER BY day"),
    async (dir) => {
      const problems = await reportProblems(dir, base);
      for (const line of ["2026-10-26: visitors 4, not 2", "2026-10-26: visits 6, not 2", "2026-10-28: visits 2, not 0"]) {
        assert.ok(problems.includes(line), `EM-A5 fails it with ${line}:\n${problems.join("\n")}`);
      }
    },
  );
});
