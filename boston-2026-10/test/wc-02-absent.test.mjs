// WC-2 (SPEC-week-content.md § 4.2, § 5): the object absent, the page is the asset byte for byte (no week, no card), and
// nothing is thrown at the visitor: with the bucket empty, and with no WEEK binding at all. Both Workers. The bucket is
// read once per page, for week/picks-data.json and nothing else.
import test from "node:test";
import assert from "node:assert/strict";
import { card, openPlanPage } from "./cc-harness.mjs";
import { noWeekPage, pageAsset, startSite, WEEK_DATA_KEY } from "./wc-harness.mjs";

for (const [entry, target] of [["site", "prod"], ["index", "dev"]]) {
  test(`WC-2 (${entry}.js): no object, and no binding: the asset byte for byte; the card is today's`, async () => {
    const asset = await noWeekPage({ target });
    for (const week of [true, false]) {
      const site = await startSite({ entry, week, assets: { "/": pageAsset(asset) } });
      try {
        const res = await site.get("/");
        const what = week ? "an empty bucket" : "no WEEK binding";
        assert.equal(res.status, 200, what);
        assert.equal(res.headers["content-type"], "text/html; charset=utf-8", what);
        assert.equal(res.text, asset, `${what}: the asset byte for byte`);
        assert.deepEqual((await site.log()).reads, week ? [WEEK_DATA_KEY] : [], `${what}: the one object read`);
        const state = card(openPlanPage(res.text, { hash: "#lean-or-7d", now: Date.parse("2026-10-11T17:00:00Z") }));
        assert.equal(state.list, false, `${what}: no Chef's Choice`);
        assert.equal(state.choose, true, `${what}: Choose your meals, today's fallback`);
      } finally {
        await site.dispose();
      }
    }
  });
}
