// UQ5 (SPEC-ui-and-copy-pass.md § 2 items 5 and 6, the Advisor 2026-10-25: "Update "Prices as of 2026-09-27." to "Prices
// as of 2026-10-25." please."): the footnote's date is data/plans.json's `read_on`, its own read date (data/README.md:
// "read by a person off `read_from` on `read_on`"), and nothing else: the orchestrator re-read every plan's price on the
// store that day and found each one unchanged (§ 2.1), so `read_on` is 2026-10-25 and every other value of the file is as
// it was (its `read_on` alone differs from the contract's commit, 81a1199). On both builds; and the footnote follows
// `read_on` in a copy of the file, so the next re-reading is a data change alone.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { parseHTML } from "linkedom";
import { ROOT } from "../build.mjs";
import { MESSAGES, PLANS } from "./cc-harness.mjs";
import { pageOf, plansCopy } from "./ms-harness.mjs";
import { pages } from "./uq-harness.mjs";

const { production, development } = await pages();
const footnote = (html) => parseHTML(html).document.querySelector("footer.foot .footnote")?.textContent.trim();
const BEFORE = "81a1199";

test("UQ5: the footnote reads \"Prices as of 2026-10-25.\" on both builds, the phrase data/messages.json's and the date data/plans.json's", () => {
  assert.equal(PLANS.read_on, "2026-10-25", "data/plans.json's read date");
  for (const [build, html] of Object.entries({ production, development })) {
    assert.equal(footnote(html), "Prices as of 2026-10-25.", build);
    assert.equal(footnote(html), MESSAGES.plan_page.prices_as_of.replace("{date}", PLANS.read_on), `${build}: data's phrase and date`);
  }
});

test("UQ5: data/plans.json differs from the contract's commit by its read date alone (every price as it was)", () => {
  const r = spawnSync("git", ["-C", ROOT, "show", `${BEFORE}:./data/plans.json`], { encoding: "utf8" });
  assert.equal(r.status, 0, `git show ${BEFORE}: ${r.stderr}`);
  const was = JSON.parse(r.stdout);
  assert.equal(was.read_on, "2026-09-27", `control: ${BEFORE}'s read date`);
  assert.deepEqual({ ...PLANS, read_on: was.read_on }, was, "every other value unchanged");
});

test("UQ5: the footnote follows read_on, and nothing else, in a copy of data/plans.json", async () => {
  const other = await plansCopy((p) => (p.read_on = "2031-02-03"));
  try {
    for (const target of ["prod", "dev"]) assert.equal(footnote(await pageOf({ target, plansPath: other.path })), "Prices as of 2031-02-03.", target);
  } finally {
    await other.done();
  }
});
