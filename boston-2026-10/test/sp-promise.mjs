// Shared by SP12–SP14 and mutants 5 and 6 (SPEC-save-offer-production.md § 10: the offer as the Advisor's brief states it,
// a price promise and not a discount code). Not a test file itself. The assertions are functions here so the mutants
// (sp-mutants.test.mjs) run them on a copy of the module they break.
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";
import { displayCode } from "../src/worker/messages.js";
import { lineTexts } from "./email-html.mjs";
import { productionInputs } from "./sp-production.mjs";

/** § 10 item 1: the Boston event's offer, by its id in data/offers.json, and the date its pricing is held until. */
export const BOSTON_OFFER_ID = "event-boston-2026-10-placeholder";
export const HELD_UNTIL = "2026-10-29";
/** § 10 item 3's sentence, as the contract gives it, with that date in the email's and the page's form. */
export const HELD_LINE = "Your pricing is held until October 29, 2026";
/** § 10 item 4: the decided sender. */
export const DECIDED_SENDER = "Fit AF <offers@eatfitaf.com>";
/** § 10 item 6: a Boston code inside the official list, and a Pennsylvania code outside it (Carbondale, the postal
 *  address's own ZIP); and a code in the near ring (still a mock, by prefix) that is not on the list: Manchester, NH. */
export const BOSTON_ZIP = "02118";
export const PENNSYLVANIA_ZIP = "18407";
export const NEAR_RING_ZIP = "03101";

/** DRAFT § 3's E1 line for an offer without a code, as a reader reads it: its marker, emphasis and [date] slot filled. */
export async function draftHeldLine(longDate) {
  const md = await readFile(join(ROOT, "consent", "DRAFT.md"), "utf8");
  const e1 = md.split("## 3. The emails")[1].split("**E-X")[0];
  const line = e1.split("\n").find((l) => l.startsWith("> *(an offer without a code)*"));
  assert.ok(line, "DRAFT § 3's E1 has a line for an offer without a code");
  return line.slice(2).replace("*(an offer without a code)*", "").replace(/\*+/g, "").trim().replace("[date]", longDate);
}

/**
 * § 10 item 3: no code in any visible text. `visible` is what a reader sees: an email's text part (its links' URLs
 * removed, so a /confirm token can never be read as a word), the HTML part's visible lines, or a page's words. `code` is
 * the save's link token, which may appear only inside its link (`link`, when the text shows it).
 */
export function assertNoCodeText(visible, code, where, { link } = {}) {
  if (link) assert.ok(visible.includes(link), `${where}: the link back carries the token in its path`);
  const words = visible.replace(/https?:\/\/\S+/g, " ");
  assert.doesNotMatch(words, /\bcodes?\b/i, `${where}: no "code" in any visible text`);
  assert.ok(!words.includes(code), `${where}: the token is nowhere but in its link`);
  assert.ok(!words.includes(displayCode(code)), `${where}: never shown as XXXX-XXXX`);
}

/**
 * E1 (an `e1` function: messages.js's, or a mutant's) for an offer without a code, ticked and unticked: it says the date
 * its pricing is held until (§ 10 item 3's sentence, DRAFT § 3's line) and carries no code in its text or its HTML.
 */
export async function assertE1Promise(e1) {
  const offer = { id: BOSTON_OFFER_ID, valid_to: HELD_UNTIL, code_mode: "none" };
  const siteUrl = "https://sp12.example.test";
  const code = "SP12CODE"; // what the column holds: the link's opaque token, in the code alphabet's shape
  assert.equal(await draftHeldLine("October 29, 2026"), HELD_LINE, "control: DRAFT § 3's line is § 10 item 3's sentence");
  for (const token of [null, "SP12-CONFIRM-TOKEN"]) {
    const where = `E1 (${token ? "ticked" : "unticked"})`;
    const m = e1({ to: "dummy-sp12@example.com", code, offer, event: { name: "Fit AF's Boston event" }, siteUrl, token });
    const link = `${siteUrl}/o/${code}`;
    assertNoCodeText(m.text, code, `${where}, text`, { link });
    assertNoCodeText(lineTexts(m.html).join("\n"), code, `${where}, HTML`);
    assert.equal(m.html.split(code).length - 1, 1, `${where}: the HTML carries the token once, in See my offer's href`);
    assert.ok(m.html.includes(`href="${link}"`), `${where}: See my offer goes to /o/<token>`);
    assert.ok(m.text.split("\n").includes(HELD_LINE), `${where}: the text part says the date held, as its own line`);
    assert.ok(lineTexts(m.html).includes(HELD_LINE), `${where}: the HTML part says it too`);
  }
}

/**
 * A copy of the Worker's modules (src/worker/) and data (data/) in a temporary directory, its data/offers.json changed by
 * `edit(offers)` (whose return value is kept as `edited`): the committed files are never written. `module(file)` is a
 * module of the copy, by URL.
 */
export async function workerTreeWith(edit) {
  const dir = await mkdtemp(join(tmpdir(), "boston-sp12-tree-"));
  await cp(join(ROOT, "src", "worker"), join(dir, "src", "worker"), { recursive: true });
  await cp(join(ROOT, "data"), join(dir, "data"), { recursive: true });
  const path = join(dir, "data", "offers.json");
  const offers = JSON.parse(await readFile(path, "utf8"));
  const edited = edit(offers);
  await writeFile(path, JSON.stringify(offers, null, 2) + "\n");
  return {
    edited,
    module: (file) => pathToFileURL(join(dir, "src", "worker", file)).href,
    dispose: () => rm(dir, { recursive: true, force: true }),
  };
}

/** The gate's approved inputs (sp-production.mjs's fixture), as productionRefusals takes them, nothing printed. */
async function approvedGateInputs() {
  const { dir, save, offers, zips, vars, options } = await productionInputs();
  const draftText = await readFile(options.draftPath, "utf8");
  return { dir, inputs: { save, offers, zips, draftText, vars, printed: [] } };
}

const clone = (v) => JSON.parse(JSON.stringify(v));

/**
 * § 10 item 4 (a `productionRefusals`: production-inputs.mjs's, or a mutant's): an offer with `code_mode: "none"` and no
 * code field is accepted, one carrying a code refused; the decided sender is accepted, an empty sender and one at another
 * domain refused, each by name.
 */
export async function assertGateRules(productionRefusals) {
  const { dir, inputs } = await approvedGateInputs();
  try {
    const refusals = (change) => {
      const copy = clone(inputs);
      change(copy);
      return productionRefusals(copy);
    };
    const named = (list, re) => list.filter((r) => re.test(r));

    // The approved set's own sender is the decided one; its offers are as the fixture approves them.
    assert.deepEqual(refusals((i) => (i.vars.MAIL_FROM = DECIDED_SENDER)), [], "the approved set with the decided sender: nothing refused");

    const none = (i) => i.offers.offers.find((o) => o.id === BOSTON_OFFER_ID);
    const withoutCode = refusals((i) => {
      Object.assign(none(i), { code_mode: "none" });
      delete none(i).shared_code;
    });
    assert.deepEqual(withoutCode, [], "code_mode none without a code: accepted");
    const carrying = refusals((i) => Object.assign(none(i), { code_mode: "none", shared_code: "SPFIXTURE25" }));
    assert.equal(named(carrying, new RegExp(`offer ${BOSTON_OFFER_ID} carries a code`)).length, 1, `code_mode none with a code: refused, naming it (${carrying})`);
    // Neither none nor a code mode the Worker knows: refused, since E1 would then promise a code no save carries.
    const unknown = refusals((i) => Object.assign(none(i), { code_mode: "nil" }));
    assert.equal(named(unknown, new RegExp(`offer ${BOSTON_OFFER_ID}'s code_mode nil is not one of none, unique, shared`)).length, 1, `an unknown code_mode: refused (${unknown})`);

    for (const sender of [DECIDED_SENDER, "offers@eatfitaf.com"]) {
      assert.deepEqual(named(refusals((i) => (i.vars.MAIL_FROM = sender)), /MAIL_FROM/), [], `the sender ${sender}: accepted`);
    }
    assert.deepEqual(named(refusals((i) => (i.vars.MAIL_FROM = "")), /MAIL_FROM/), ["wrangler.jsonc vars.MAIL_FROM is not set"], "an empty sender: refused");
    for (const sender of ["Fit AF <offers@example.com>", "Fit AF <offers@eatfitaf.com.example.net>", "Fit AF <offers@noteatfitaf.com>", "Fit AF <[sender]>"]) {
      assert.deepEqual(
        named(refusals((i) => (i.vars.MAIL_FROM = sender)), /MAIL_FROM/),
        ["wrangler.jsonc vars.MAIL_FROM is not an address at eatfitaf.com"],
        `a sender outside eatfitaf.com (${sender}): refused`,
      );
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
