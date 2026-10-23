// SP5 (SPEC-save-offer-production.md § 3 items 3-4, § 5): T5, amended for production once and by name. With `production`
// true the production page may load exactly one third-party script, Turnstile's (TURNSTILE_SCRIPT_URL), and make one
// request of its own origin, Flow 1's POST to /api/save; with false, neither. Every other T5 rule stands: no other origin,
// no other script, no <link>, the analytics beacon (one sendBeacon, to /a) unchanged, the /why/ frame. And the page stays
// under SPEC.md § 1's budget, gzip-compressed (test/page-budget.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import { renderPage, TURNSTILE_SCRIPT_URL } from "../build.mjs";
import { loadPlans } from "./helpers.mjs";
import { assertPageBudget } from "./page-budget.mjs";
import { approvedPage, assertProductionT5, TURNSTILE_SCRIPT } from "./sp-production.mjs";

test("SP5: the amendment names the one script it allows, Turnstile's, as the build loads it", () => {
  assert.equal(TURNSTILE_SCRIPT_URL, TURNSTILE_SCRIPT);
});

test("SP5: production true — exactly one third-party script, Turnstile's; one fetch, to /api/save; the rest of T5", async (t) => {
  const { html } = await approvedPage();
  assertProductionT5(html, { production: true });
  assertPageBudget(html, "SP5, the production page with production true", t);
});

test("SP5: production false — no third-party script and no fetch (T5 as it stands)", async () => {
  assertProductionT5(await renderPage(await loadPlans()), { production: false });
});
