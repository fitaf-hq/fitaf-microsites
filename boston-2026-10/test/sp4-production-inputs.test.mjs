// SP4 (SPEC-save-offer-production.md § 3 item 2, § 5): `production` true. With each input unapproved in turn the
// production build refuses, naming it, and writes nothing; with all approved (sp-production.mjs's fixtures, made from the
// committed inputs), the production page carries Flow 1 at the end exactly as the development build does (§ 2b's places,
// § 1's tweaks, #from-email), no draft tag, the production site key, and its form posting to its own origin's /api/save.
// The assertions are sp-production.mjs's functions, so the mutants (sp-mutants.test.mjs) run them on a mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import events from "../data/events.json" with { type: "json" };
import { build, ROOT } from "../build.mjs";
import { openPlanPage } from "./cc-harness.mjs";
import { simulatePage } from "./page-sim.mjs";
import { assertPageBudget } from "./page-budget.mjs";
import { assertFlowOneAbsent, assertFlowOneDirectlyAfterStoreButton, assertNoModalForFlowOne, NOW } from "./save-end-fixture.mjs";
import { APPROVED_VARS, APPROVED_VERSION, approvedPage, assertEachRefusal, assertNoDraftMarking, PRIVACY_URL, saveData, UNFIXED } from "./sp-production.mjs";
import { approvedWeekPage } from "./uc-harness.mjs";

test("SP4: each input unapproved in turn — the build refuses, naming it, and writes nothing", async () => {
  await assertEachRefusal();
});

test("SP4: the committed inputs with production true — refused, every unapproved input named at once", async () => {
  const dir = await mkdtemp(join(tmpdir(), "boston-sp4-committed-"));
  try {
    const save = JSON.parse(await readFile(join(ROOT, "data", "save.json"), "utf8"));
    await writeFile(join(dir, "save.json"), JSON.stringify({ ...save, production: true }));
    const outDir = join(dir, "dist");
    // The production vars as wrangler.jsonc's top level has them now (no productionVars given).
    const err = await build({ target: "prod", outDir, savePath: join(dir, "save.json") }).then(() => null, (e) => e);
    assert.ok(err, "refused");
    for (const name of [
      /wording_version v0\.3-draft is a draft/,
      /data\/offers\.json: status is placeholder, not approved/,
      /TURNSTILE_SITE_KEY is not set/,
    ]) assert.match(err.message, name);
    // § 10 item 5: the inputs as decided, committed — the contact address and the response days in DRAFT § 6, the official
    // ZIP list; and § 10 item 4: the decided sender is not a placeholder. None of them is refused. Since
    // SPEC-ui-and-copy-pass § 1 item 5 (2026-10-23) § 6 names Resend alone, so its [Mailchimp] is not refused either: the
    // page links /privacy/ (§ 9 item 1), which prints § 6 with no placeholder left.
    for (const name of [/\[email\]/, /\[30\]/, /delivery-zips/, /MAIL_FROM/, /§ 6 holds a placeholder/, /the privacy page prints a placeholder/]) {
      assert.doesNotMatch(err.message, name);
    }
    assert.deepEqual(await readdir(dir), ["save.json"], "nothing written");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// ⚠ AMENDED by SPEC-ui-and-copy-pass § 1 item 2 (2026-10-23): the step is shown only beside a week's Continue to checkout,
// so the page carries the fixture week (its carts: lunch or dinner every day, and lunch and dinner every day); with no
// cart for the answers, and on Family, no step.
test("SP4: all approved — Flow 1 at the end, as the development build has it; no draft tag", async () => {
  const { html } = await approvedWeekPage();
  assertNoDraftMarking(html, "the production page");
  for (const hash of ["#lean-or-7d", "#signature-and-7d"]) {
    assertFlowOneDirectlyAfterStoreButton(openPlanPage(html, { hash, now: NOW }));
  }
  for (const hash of ["", "#lean", "#individual", "#signature-and-5d-b", "#family"]) assertFlowOneAbsent(openPlanPage(html, { hash, now: NOW }));
  const fromEmail = openPlanPage(html, { hash: "#from-email", now: NOW });
  fromEmail.go("#lean-or-7d");
  assertFlowOneDirectlyAfterStoreButton(fromEmail, { form: false });
  assertNoModalForFlowOne(html);
  assert.match(html, new RegExp(`<a class="save-privacy" href="${PRIVACY_URL}">Privacy notice</a>`), "the notice linked, not a placeholder");
});

test("SP4: all approved — the production site key, wording v1, the first event, and the form posting to /api/save", async (t) => {
  const { html } = await approvedPage();
  const cfg = saveData(html);
  assert.equal(cfg.site_key, APPROVED_VARS.TURNSTILE_SITE_KEY, "the production site key");
  assert.equal(cfg.api, "/api/save");
  assert.equal(cfg.wording_version, APPROVED_VERSION);
  assert.equal(cfg.event_id, events[0].id, "the one production page saves as the first event (SPEC § 8)");
  const page = simulatePage(html);
  page.type("save-email", "dummy-sp4@example.com");
  page.type("save-zip", "02118");
  page.el("save-form").dispatch("submit");
  await page.settle();
  assert.equal(page.record.fetches.length, 1);
  assert.equal(page.record.fetches[0].url, "/api/save", "its own origin's /api/save");
  assert.equal(JSON.parse(page.record.fetches[0].init.body).wording_version, APPROVED_VERSION);
  assert.equal(page.el("save-done").hidden, false, "SAVED");
  assertPageBudget(html, "SP4, the production page with production true", t);
});

test("SP4 (control): the refusal cases are the contract's five, as § 10 item 4 amends the sender's, and the ones the build adds", () => {
  for (const part of ["a draft wording version", "a bracket left in DRAFT § 6", "offers a placeholder", "the ZIPs a mock", "an empty sender", "a sender outside eatfitaf.com"]) {
    assert.ok(part in UNFIXED, part);
  }
  assert.ok(!("the placeholder sender" in UNFIXED), "§ 10 item 4: the decided sender is not a placeholder");
});
