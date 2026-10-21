// SP2 (SPEC-save-offer-production.md § 1 item 2, § 5): one orange button. The store's button (*Choose your meals*; with a
// week, *Continue to checkout*) stays the page's one `--cta` button; *Save my offer* and *Tell me when you deliver here*
// become the page's quieter button, *See all plans*' style (navy, underlined, the head font at 16px/600), which the step
// already draws as `.skip` for its one-line *Save my offer* (SPEC-rung4 § 2b item 4). Every new pair is in
// src/contrast-pairs.json and passes. Both builds: the development page here; the production page with `production` true
// joins with SP4 (§ 3 item 2).
import test from "node:test";
import assert from "node:assert/strict";
import pairsFile from "../src/contrast-pairs.json" with { type: "json" };
import { measure } from "../scripts/contrast.mjs";
import { devPage } from "./dev-page.mjs";
import { DAYS, FIXTURE_DIR, midday, openPlanPage, pageWithPicks } from "./cc-harness.mjs";
import { NOW } from "./save-end-fixture.mjs";
import { assertQuietButtons, shownCtas, submitSave } from "./sp-fixture.mjs";

const html = await devPage({ card: true });
const FAR_ZIP = "90210";

test("SP2: in the markup, Save my offer and Tell me when you deliver here are the quieter button, in See all plans' style", () => {
  assertQuietButtons(html);
});

test("SP2: as run, the store's button is the one --cta shown: on a plan, on Family, out of area, from the email", () => {
  const cases = [
    ["#lean-or-7d", (page) => page, ["result-cta"]],
    ["#signature-14", (page) => page, ["result-cta"]],
    ["#family", (page) => page, ["family"]],
    ["#lean-or-7d", (page) => (submitSave(page, { zip: FAR_ZIP }), page), ["result-cta"]],
    ["#from-email", (page) => (page.go("#performance-and-7d-b"), page), ["result-cta"]],
  ];
  for (const [hash, act, expected] of cases) {
    const page = act(openPlanPage(html, { hash, now: NOW }));
    assert.deepEqual(shownCtas(page), expected, `${hash}: one --cta shown, the store's`);
  }
  const out = openPlanPage(html, { hash: "#lean-or-7d", now: NOW });
  submitSave(out, { zip: FAR_ZIP });
  assert.equal(out.el("save-out-of-area").hasAttribute("hidden"), false, "control: out of area, Tell me when you deliver here is shown");
});

test("SP2: with a week's Chef's Choice, Continue to checkout is the one --cta shown", async () => {
  const { html: withWeek } = await pageWithPicks({ target: "dev", picks: FIXTURE_DIR });
  const page = openPlanPage(withWeek, { hash: "#lean-7", now: midday(DAYS["S-5"]) });
  assert.equal(page.el("cc-list").hasAttribute("hidden"), false, "control: the week's list is shown");
  assert.deepEqual(shownCtas(page), ["cc-checkout"]);
  assert.equal(page.el("cc-checkout").textContent.trim(), "Continue to checkout");
});

test("SP2: the new pairs are declared and pass; no pair still draws a save button on --cta", async () => {
  const dev = pairsFile.pairs.filter((p) => p.build === "dev");
  const buttons = dev.filter((p) => /Save my offer/.test(p.where) && /Tell me when you deliver here/.test(p.where));
  assert.deepEqual(buttons.map((p) => [p.fg, p.bg, p.role]), [["--navy", "--white", "body"]], "the two save buttons: navy on white, body text");
  const line = dev.filter((p) => /save step's offer line/.test(p.where));
  assert.deepEqual(line.map((p) => [p.fg, p.bg, p.role]), [["--navy", "--white", "body"]], "the step's offer line: navy on white, body text");
  const onCta = pairsFile.pairs.filter((p) => p.bg === "--cta" || p.bg === "--cta-hover");
  assert.ok(onCta.length > 0, "control: the store's button is declared");
  for (const p of onCta) assert.doesNotMatch(p.where, /Save my offer|Tell me when/, `no save button on ${p.bg}: ${p.where}`);
  const { rows, problems } = await measure();
  assert.deepEqual(problems, []);
  assert.deepEqual(rows.filter((r) => !r.pass).map((r) => r.where), [], "every pair passes");
});
