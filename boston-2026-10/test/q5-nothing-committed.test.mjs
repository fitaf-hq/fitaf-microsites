// Q5 (SPEC-print-pieces.md § 1, § 5): ⛔ nothing ID-bearing is committed. This repository is public. After a build with
// fixture photos, `git status` shows no change: the build writes into its output folder and a temporary one only, and
// every file it writes, under its own name in boston-2026-10/dist-print/, is ignored by git. No committed file (HEAD, and
// the tracked files as they are) contains a fixture photo's ID, while the build's own assignment.json, ignored, does.
// The IDs are made at random each run (print-fixtures.mjs), so no test file can carry one either. Since § 12 (item 8) the
// same holds for the flyer's back: its three photos' IDs, and its one PNG proof among the files written.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { ROOT } from "../build.mjs";
import { DIST_PRINT } from "../print/build-print.mjs";
import { lockedBuild, NO_CHROME, photoSet } from "./print-fixtures.mjs";

const REPO = join(ROOT, "..");
const git = (...args) => spawnSync("git", ["-C", REPO, ...args], { encoding: "utf8" });
const set = await photoSet();
after(() => rm(set.dir, { recursive: true, force: true }));
/** A path under the default output folder, relative to the repository (boston-2026-10/dist-print/<name>). */
const inDistPrint = (name) => relative(REPO, join(DIST_PRINT, name));

test("Q5: boston-2026-10/dist-print/ and everything in it is ignored; the build's inputs are not", () => {
  assert.equal(relative(REPO, DIST_PRINT), "boston-2026-10/dist-print");
  for (const name of ["flyer.pdf", "flyer-PROOF.png", "tent-card.pdf", "assignment.json", "nested/x.jpg"]) {
    assert.equal(git("check-ignore", "-q", "--no-index", inDistPrint(name)).status, 0, `${inDistPrint(name)} must be ignored`);
  }
  for (const input of ["boston-2026-10/print/build-print.mjs", "boston-2026-10/print/print.css", "boston-2026-10/mockups/photos.json"]) {
    assert.equal(git("check-ignore", "-q", "--no-index", input).status, 1, `control: ${input} is not ignored`);
  }
});

test("Q5: after a build with fixture photos, git status shows no change, every file written is ignored, no committed file holds an ID", { skip: NO_CHROME }, async () => {
  const status = () => {
    const res = git("status", "--porcelain=v1", "-z", "--untracked-files=all");
    assert.equal(res.status, 0, res.stderr);
    return res.stdout;
  };
  const before = status();
  const out = join(set.dir, "dist-print"); // the default folder's ignore is shown above; the build writes here so a
  // real build's output in the default folder is not emptied by the suite
  // The tent card and the flyer, with the four flyers (their rung-4 photos are IDs too)
  const built = await lockedBuild({ outDir: out, ...set.photos, today: "2026-10-20" });
  assert.equal(status(), before, "git status is unchanged by the build");

  const names = built.written.map((f) => basename(f)).sort();
  const four = [1, 2, 3, 4].flatMap((k) => [`flyer-${k}-PROOF.pdf`, `flyer-${k}-PROOF.png`]);
  assert.deepEqual(names, ["assignment.json", ...four, "flyer-1-4-PROOF.png", "flyer-PROOF.pdf", "flyer-PROOF.png", "flyer-back-PROOF.png", "tent-card-PROOF.pdf", "tent-card-PROOF.png"].sort());
  for (const name of names) assert.equal(git("check-ignore", "-q", "--no-index", inDistPrint(name)).status, 0, `${name}, in dist-print/, is ignored`);

  const ids = ["flyer", "large", "top", "bottom", "one", "two", "three", "four", "back1", "back2", "back3"].map((role) => set.ids[role]);
  const record = await readFile(join(out, "assignment.json"), "utf8");
  for (const id of ids) assert.ok(record.includes(id), `control: the ignored assignment.json names ${id}`);
  for (const id of ids) {
    for (const where of [["HEAD"], []]) {
      const res = git("grep", "-q", "-F", "-e", id, ...where);
      assert.equal(res.status, 1, `no committed file ${where.length ? "at HEAD" : "in the tracked tree"} contains ${id} (${res.stderr})`);
    }
  }
  for (const where of [["HEAD"], []]) {
    // Control: the same search finds a phrase the committed contract does hold, at HEAD and in the tracked tree.
    assert.equal(git("grep", "-q", "-F", "-e", "the quarter-sheet flyer", ...where).status, 0, `control: the search finds what is committed (${where})`);
  }
});
