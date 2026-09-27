// `npm run contrast` (APCA) as a test: the real page passes, and each of its refusals fires on a mutant.
// Mutants are COPIES in a temp directory; the committed template and stylesheet are never written.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { DEFAULTS, measure } from "../scripts/contrast.mjs";

const SCRIPT = join(ROOT, "scripts", "contrast.mjs");
const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
const original = await readFile(DEFAULTS.template, "utf8");
const tmp = await mkdtemp(join(tmpdir(), "boston-contrast-"));
after(async () => {
  await rm(tmp, { recursive: true, force: true });
  assert.equal(await readFile(DEFAULTS.template, "utf8"), original, "committed template untouched");
});

async function mutantTemplate(name, from, to) {
  assert.ok(original.includes(from), `mutation anchor present: ${from}`);
  const path = join(tmp, name);
  await writeFile(path, original.replace(from, to));
  return path;
}

test("B2: npm run contrast passes on the page as committed, and prints every pair", async () => {
  const res = run();
  assert.equal(res.status, 0, res.stdout + res.stderr);
  const { rows, problems } = await measure();
  assert.deepEqual(problems, []);
  assert.ok(rows.length >= 25);
  assert.match(res.stdout, new RegExp(`${rows.length} pairs, ${rows.length} pass, 0 fail; 0 problem`));
  for (const role of ["body", "large-text", "ui-or-heading", "non-text"]) {
    assert.ok(rows.some((r) => r.role === role), `a ${role} pair is declared`);
  }
});

test("B2 mutant: muted text swapped to the store's other grey (#6c757d, Lc 72.6) fails body 75", async () => {
  const path = await mutantTemplate("muted.html", "--muted: #5b5b5b;", "--muted: #6c757d;");
  const res = run("--template", path);
  assert.equal(res.status, 1, res.stdout);
  assert.match(res.stdout, /--muted #6c757d\s+--white #ffffff\s+body\s+75\s+72\.6\s+FAIL/);
});

test("B2 mutant: the store's own button (white on #ff931e) fails its role", async () => {
  const path = await mutantTemplate("cta.html", "--cta: #d66400;", "--cta: #ff931e;");
  const res = run("--template", path);
  assert.equal(res.status, 1, res.stdout);
  assert.match(res.stdout, /--on-cta #ffffff\s+--cta #ff931e\s+large-text\s+60\s+-48\.1\s+FAIL/);
});

test("B2 mutant: a raw colour outside :root is refused (it would bypass the check)", async () => {
  const path = await mutantTemplate("raw.html", ".hint { margin", ".hint { color: #777777; margin");
  const res = run("--template", path);
  assert.equal(res.status, 1, res.stdout);
  assert.match(res.stdout, /PROBLEM: raw colour outside :root/);
});

test("B2 mutant: a colour token no pair measures is refused", async () => {
  const path = await mutantTemplate("token.html", "--navy: #1b2360;", "--navy: #1b2360;\n  --unmeasured: #bbbbbb;");
  const res = run("--template", path);
  assert.equal(res.status, 1, res.stdout);
  assert.match(res.stdout, /PROBLEM: colour token --unmeasured is in no pair/);
});
