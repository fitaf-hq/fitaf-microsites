// UC5 (SPEC-ui-and-copy-pass.md § 1 item 5, the Advisor's note f-privacy-ref; Fit AF's decision record 2026-10-17 § 7t
// item 1): the privacy notice prints no section reference and no placeholder. § 6's "How long we keep it. As in § 5."
// is § 5's retention written out (a reader of /privacy/ cannot follow a section reference: § 5 is not on that page), and
// § 6's "Where it's kept" names Resend alone (no export to an email provider is built), so no [bracket] is left in what
// the page prints. Both edits in consent/DRAFT.md, whose status stays a draft (v0.3-draft) until v1.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import saveConfig from "../data/save.json" with { type: "json" };
import { build, ROOT } from "../build.mjs";
import { productionRefusals } from "../scripts/production-inputs.mjs";
import { pageText, productionInputs, section6Paragraphs } from "./sp-production.mjs";

const draft = await readFile(join(ROOT, "consent", "DRAFT.md"), "utf8");
const squash = (s) => s.replace(/\*+/g, "").replace(/\s+/g, " ").trim();
/** DRAFT § 5's retention: its "Kept for" paragraph, after its label. */
const keptFor = () => squash(/^\*\*Kept for\*\*: ([\s\S]*?)\n\n/m.exec(draft.split(/^## 5\. /m)[1])?.[1] ?? "");
const section6 = () => section6Paragraphs(draft);
const paragraph = (heading) => section6().find((p) => p.startsWith(heading));

test("UC5: § 6's How long we keep it is § 5's retention, written out; no section reference in § 6", () => {
  const retention = keptFor();
  assert.ok(retention.startsWith("30 days after the offer ends"), `control: § 5's retention (${retention.slice(0, 40)}…)`);
  assert.equal(paragraph("How long we keep it."), `How long we keep it. ${retention}`, "§ 5's words, in § 6");
  for (const p of section6()) assert.doesNotMatch(p, /§/, `no section reference: ${p.slice(0, 40)}…`);
});

test("UC5: § 6 names Resend alone; no bracket and no Mailchimp in § 6", () => {
  const kept = paragraph("Where it's kept.");
  assert.ok(kept.includes("Resend"), "Resend, the one email provider");
  for (const p of section6()) {
    assert.doesNotMatch(p, /\[|\]/, `no bracket: ${p.slice(0, 40)}…`);
    assert.doesNotMatch(p, /Mailchimp/, `no export provider: ${p.slice(0, 40)}…`);
  }
});

test("UC5: the development build's /privacy/ prints § 6 so — no section reference, no bracket; still marked a draft", async () => {
  const out = await mkdtemp(join(tmpdir(), "boston-uc5-"));
  try {
    await build({ target: "dev", outDir: out });
    const words = pageText(await readFile(join(out, "privacy", "index.html"), "utf8"));
    assert.ok(words.includes(`How long we keep it. ${keptFor()}`), "the retention written out");
    assert.doesNotMatch(words, /§/, "no section reference");
    assert.doesNotMatch(words, /\[[^\]]*\]/, "no bracket");
    assert.ok(words.includes(`DRAFT — not for use · wording ${saveConfig.wording_version}`), "still the draft's marking");
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("UC5: the wording stays a draft; the production gate finds no placeholder in DRAFT § 6", async () => {
  assert.equal(saveConfig.wording_version, "v0.3-draft");
  assert.match(/^\*\*Status\*\*:.*$/m.exec(draft)[0], /DRAFT/, "the status line still says DRAFT");
  const { dir, save, zips, vars, offers } = await productionInputs();
  try {
    const refusals = productionRefusals({ save, offers, zips, draftText: draft, vars, printed: [] });
    assert.deepEqual(refusals.filter((r) => /§ 6/.test(r)), [], "nothing in § 6");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
