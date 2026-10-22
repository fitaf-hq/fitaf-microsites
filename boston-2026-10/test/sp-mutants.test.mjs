// The three mutants of SPEC-save-offer-production.md § 5, each run on a COPY (a mirror of the package, or a copy of one
// module): the committed files are never written. Each mutant must turn its case red, on that case's own assertion.
//   1. the build's input check always passes            -> SP4 (each refusal) fails
//   2. production sending through the allowlist           -> SP7 (production sends) fails
//   3. the draft tag kept in production                   -> SP4 (the approved page has no draft tag) fails
//   4. (§ 9 item 3) the page sends the first event whatever the code -> SP10 fails
//   5. (§ 10 item 6) E1 printing the token as a code                  -> SP12 (no code text) fails
//   6. (§ 10 item 6) the gate still refusing the decided sender        -> SP13 (the decided sender accepted) fails
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";
import { mirror } from "./cc-harness.mjs";
import { approvedPage, assertEachRefusal, assertNoDraftMarking } from "./sp-production.mjs";
import { assertProductionSends } from "./sp-sending.mjs";
import { assertEventFromCode } from "./sp-fixture.mjs";
import { devPage } from "./dev-page.mjs";
import { assertE1Promise, assertGateRules } from "./sp-promise.mjs";

/** `file` (relative to `dir`) with `from` replaced by `to`, exactly once. */
async function mutate(dir, file, from, to) {
  const path = join(dir, file);
  const text = await readFile(path, "utf8");
  assert.equal(text.split(from).length - 1, 1, `the mutation site occurs exactly once in ${file}`);
  await writeFile(path, text.replace(from, to));
}

test("mutant 1: the build's input check always passes -> SP4's refusals fail", async () => {
  const dir = await mirror((d) => mutate(d, "scripts/production-inputs.mjs", "export function productionRefusals(inputs) {", "export function productionRefusals(inputs) {\n  return []; // MUTANT"));
  try {
    await assert.rejects(assertEachRefusal({ root: dir }), /the build refuses/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("mutant 2: production sending through the allowlist -> SP7 fails", async () => {
  const dir = await mkdtemp(join(tmpdir(), "boston-sp7-mutant-"));
  try {
    const source = await readFile(join(ROOT, "src", "worker", "choose-sender.js"), "utf8");
    const site = '  if (env.SEND_WITHOUT_ALLOWLIST === "true") return resend;\n';
    assert.equal(source.split(site).length - 1, 1, "the mutation site occurs exactly once in choose-sender.js");
    // The copy imports the real modules by absolute URL; only the bypass is removed.
    const copy = source.replace(site, "").replace(/from "\.\/([^"]+)"/g, (_, f) => `from "${pathToFileURL(join(ROOT, "src", "worker", f)).href}"`);
    await writeFile(join(dir, "choose-sender.mutant.js"), copy);
    const { chooseSender } = await import(pathToFileURL(join(dir, "choose-sender.mutant.js")).href);
    await assert.rejects(assertProductionSends(chooseSender), /production sends: one request/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("mutant 3: the draft tag kept in production -> SP4 fails", async () => {
  const dir = await mirror((d) => mutate(d, "build.mjs", "saveSlots(plans, inputs, { draft: false })", "saveSlots(plans, inputs, { draft: true })"));
  try {
    await assert.rejects(async () => assertNoDraftMarking((await approvedPage({ root: dir })).html, "the mutant's page"), /draft|DRAFT/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("mutant 4: the page sends the first event whatever the code -> SP10 fails", async () => {
  const html = await devPage();
  const site = "qrEvent(location.search, QR_IDS) || cfg.event_id";
  assert.equal(html.split(site).length - 1, 1, "the mutation site occurs exactly once in the page");
  await assert.rejects(assertEventFromCode(html.replace(site, "cfg.event_id"), { fallback: "demo" }), /\?e=boston sends boston/);
});

/** A copy of `file` (under src/worker/ or scripts/) with `from` replaced by `to`, exactly once, its relative imports
 *  pointing at the real modules; returns the copy's module. */
async function mutantModule(dir, file, from, to) {
  const path = join(ROOT, dir, file);
  const source = await readFile(path, "utf8");
  assert.equal(source.split(from).length - 1, 1, `the mutation site occurs exactly once in ${file}`);
  const tmp = await mkdtemp(join(tmpdir(), "boston-sp-mutant-"));
  const copy = source.replace(from, to).replace(/from "\.\/([^"]+)"/g, (_, f) => `from "${pathToFileURL(join(ROOT, dir, f)).href}"`);
  const out = join(tmp, file.replace(/\.(m?js)$/, ".mutant.$1"));
  await writeFile(out, copy);
  return { module: await import(pathToFileURL(out).href), dispose: () => rm(tmp, { recursive: true, force: true }) };
}

test("mutant 5: E1 printing the token as a code -> SP12 fails", async () => {
  const { module, dispose } = await mutantModule(
    join("src", "worker"),
    "messages.js",
    '["Your pricing is held until ", strong(longDate(held))]',
    '[strong(`Your code: ${displayCode(code)}`), " · ", "Your pricing is held until ", strong(longDate(held))]',
  );
  try {
    await assert.rejects(assertE1Promise(module.e1), /no "code" in any visible text/);
  } finally {
    await dispose();
  }
});

test("mutant 6: the gate still refusing the decided sender -> SP13 fails", async () => {
  const { module, dispose } = await mutantModule(
    "scripts",
    "production-inputs.mjs",
    "function varRefusals(vars) {\n  const out = [];\n",
    'function varRefusals(vars) {\n  const out = [];\n  if (vars.MAIL_FROM === "Fit AF <offers@eatfitaf.com>") out.push("wrangler.jsonc vars.MAIL_FROM is the placeholder Fit AF <offers@eatfitaf.com>"); // MUTANT\n',
  );
  try {
    await assert.rejects(assertGateRules(module.productionRefusals), /the approved set with the decided sender: nothing refused/);
  } finally {
    await dispose();
  }
});
