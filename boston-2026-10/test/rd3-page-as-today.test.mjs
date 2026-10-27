// RD3 (SPEC-the-redirect.md § 1 items 1 and 2, § 7): with the var absent, empty, an http URL, not a URL, or a URL with a
// fragment (and a path alone, a host without a scheme), GET "/" is the page, byte-identical to the build's with the week
// put in as today (WC-1's expectation: #picks-data's text the bucket's week, escaped as at build), and every header as
// with the var absent; HEAD "/" the assets' as today. Production's Worker (the production build) and the development
// Worker (its build), each with the bucket's week (wc-harness startSite: a fake ASSETS, a WEEK bucket, the Worker's vars).
import test from "node:test";
import assert from "node:assert/strict";
import { NOT_A_TARGET, VAR } from "./rd-checks.mjs";
import { scriptJsonRef } from "./wc-checks.mjs";
import { V2_DIR } from "./ms-harness.mjs";
import { contentOf, noWeekPage, pageAsset, startSite, V2_WEEK, WEEK_DATA_KEY, withPicksText } from "./wc-harness.mjs";

for (const [entry, target] of [["site", "prod"], ["index", "dev"]]) {
  test(`RD3: ${entry}: with the var not an https URL without a fragment, / is the page as today, the week put in`, async () => {
    const asset = await noWeekPage({ target });
    const { text } = await contentOf({ week: V2_WEEK, picksDir: V2_DIR, target });
    const want = withPicksText(asset, scriptJsonRef(JSON.parse(text)));
    const answers = {};
    for (const [label, value] of NOT_A_TARGET) {
      const site = await startSite({ entry, assets: { "/": pageAsset(asset) }, objects: { [WEEK_DATA_KEY]: text }, vars: value === undefined ? {} : { [VAR]: value } });
      try {
        const page = await site.get("/");
        const head = await site.get("/", { method: "HEAD" });
        assert.equal(page.status, 200, `${label}: the page`);
        assert.equal(page.text, want, `${label}: the build's page with the week put in, byte for byte`);
        assert.equal(head.status, 200, `${label}: HEAD / the assets'`);
        for (const r of [page, head]) delete r.headers.date;
        answers[label] = { page, head };
      } finally {
        await site.dispose();
      }
    }
    for (const [label] of NOT_A_TARGET) {
      assert.deepEqual(answers[label].page.headers, answers.absent.page.headers, `${label}: GET /'s headers as with the var absent`);
      assert.deepEqual([answers[label].head.status, answers[label].head.headers, answers[label].head.text], [answers.absent.head.status, answers.absent.head.headers, answers.absent.head.text], `${label}: HEAD / as with the var absent`);
    }
  });
}
