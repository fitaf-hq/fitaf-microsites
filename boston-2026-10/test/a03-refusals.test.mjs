// A3 (SPEC-analytics.md §§ 3–4, § 7): POST /a with an event or a field outside § 3, or over 2 KB, is a 204 with
// nothing written; every valid event is a 204 with one data point. In production's Worker (src/worker/site.js) and the
// development Worker (src/worker/index.js). The vocabulary is the page's own (its buttons' ids) and selection.mjs's,
// never invented; and as wrangler.jsonc configures them (wrangler's own translation, the real asset router), a POST to
// /a reaches each Worker's script. The refusal check is a-checks.mjs's, which the mutant "the vocabulary check removed"
// runs on a mirror. Since § 13 item 4 the page's answers are read off every `button.choice` (a-harness pageChoices), the
// first question's and Family's own question's among them; F1 (af1-every-question.test.mjs) holds them equal to the
// Worker's vocabulary in both directions, on both targets.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, QUESTIONS } from "../build.mjs";
import { ANSWER_SETS, answerKey } from "../scripts/selection.mjs";
import plans from "../data/plans.json" with { type: "json" };
import events from "../data/events.json" with { type: "json" };
import { refusalProblems } from "./a-checks.mjs";
import { builtPage, configuredSite, pageAnswers, S1, startBeacon, VALID } from "./a-harness.mjs";

test("A3: production's Worker refuses what § 3 does not name (204, nothing written) and writes what it does", async () => {
  assert.deepEqual(await refusalProblems(), []);
});

test("A3: the development Worker does the same", async () => {
  assert.deepEqual(await refusalProblems(undefined, "index"), []);
});

test("A3: every answer the built page offers, every answer set and every QR event is accepted; nothing else is offered", async () => {
  const html = await builtPage();
  const offered = pageAnswers(html);
  assert.deepEqual(offered.goal, plans.individual.map((p) => p.id), "control: the page's goals are data/plans.json's");
  // The answers as a set: their order on the page is SPEC-meal-selection § 12's (each pair's default first), MS-17's subject.
  const asSet = (list) => [...list].sort();
  for (const [q, answers] of Object.entries(QUESTIONS)) assert.deepEqual(asSet(offered[q]), asSet(answers), `control: the page's ${q} answers are build.mjs's`);
  const site = await startBeacon();
  try {
    await site.log();
    const bodies = [
      ...Object.entries(offered).flatMap(([question, answers]) => answers.map((answer) => ({ event: "answer", s: S1, question, answer }))),
      ...ANSWER_SETS.map(answerKey).map((key) => ({ ...VALID.result, key })),
      ...events.map((e) => ({ ...VALID.open, qr: e.id })),
      ...["<400", "400-767", "768-1199", ">=1200"].map((viewport) => ({ ...VALID.open, viewport })),
      ...["open", "answer", "result", "click"].map((step) => ({ ...VALID.leave, step })),
      { event: "click", s: S1, link: "order", mpid: plans.family.counts[0].mpid },
      { event: "click", s: S1, link: "all-plans" },
    ];
    for (const body of bodies) {
      const res = await site.post(body);
      assert.equal(res.status, 204, JSON.stringify(body));
      assert.equal((await site.log()).points.length, 1, `written: ${JSON.stringify(body)}`);
    }
  } finally {
    await site.dispose();
  }
});

test("A3: as wrangler.jsonc configures them, POST /a reaches each Worker's script and is a 204", async () => {
  for (const [env, target] of [[undefined, "prod"], ["dev", "dev"]]) {
    const outDir = await mkdtemp(join(tmpdir(), `boston-a3-${target}-`));
    let site;
    try {
      await build({ target, outDir });
      site = await configuredSite({ env, distDir: outDir });
      const res = await site.post(VALID.open);
      assert.equal(res.status, 204, `${target}: POST /a`);
      const refused = await site.post({ event: "scroll", s: S1 });
      assert.equal(refused.status, 204, `${target}: a refused body is a 204 too`);
    } finally {
      await site?.dispose();
      await rm(outDir, { recursive: true, force: true });
    }
  }
});
