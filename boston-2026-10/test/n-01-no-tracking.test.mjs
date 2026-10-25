// N1 (SPEC-analytics.md § 12 items 1 and 6): a request reaching either Worker's page routes whose query holds
// `no-tracking` (any value, or none) is a 302 to the same URL without it (every other parameter kept, in order; the
// Location names no fragment, so a browser keeps the request's), with
// `Set-Cookie: fitaf_no_tracking=1; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Lax`, exactly. On production's
// Worker (src/worker/site.js, as committed: release (b)'s `production` true), on it as release (a) made it (`production`
// false, the rollback: SPEC-save-offer-production § 12, a mirror), and on the development Worker (src/worker/index.js);
// and as wrangler.jsonc configures them (wrangler's own translation and the real asset router, `run_worker_first`): "/",
// "/index.html" and an event page reach the script and are switched; an asset is served without the script and is not.
// The check is n-checks.mjs's, which the mutants "the cookie without HttpOnly" and "the redirect dropping another
// parameter" run on a mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "../build.mjs";
import { configuredSite } from "./a-harness.mjs";
import { productionFalseMirror } from "./cc-harness.mjs";
import { HOST, NO_TRACKING_SET, switchOnProblems } from "./n-checks.mjs";

test("N1: production's Worker and the development Worker answer ?no-tracking with a 302 to the same URL without it, setting the cookie", async () => {
  assert.deepEqual(await switchOnProblems(), []);
});

test("N1: production's Worker with production false (the rollback) does the same", async () => {
  const falseRoot = await productionFalseMirror();
  try {
    assert.deepEqual(await switchOnProblems(falseRoot, ["site"]), []);
  } finally {
    await rm(falseRoot, { recursive: true, force: true });
  }
});

/** GET `path` of a configured Worker: status, Location, every Set-Cookie. */
async function ask(site, path) {
  const res = await site.mf.dispatchFetch(HOST + path, { redirect: "manual" });
  await res.arrayBuffer();
  return { status: res.status, location: res.headers.get("location"), cookies: res.headers.getSetCookie() };
}

test("N1: as wrangler.jsonc configures them, the page's routes reach the script and are switched; an asset is not", async () => {
  const cases = [
    [undefined, "prod", [["/?no-tracking", "/"], ["/?e=boston&no-tracking", "/?e=boston"], ["/index.html?no-tracking", "/index.html"]]],
    ["dev", "dev", [["/?no-tracking", "/"], ["/boston/?no-tracking", "/boston/"], ["/seminar/?e=seminar&no-tracking", "/seminar/?e=seminar"]]],
  ];
  for (const [env, target, switched] of cases) {
    const outDir = await mkdtemp(join(tmpdir(), `boston-n1-${target}-`));
    let site;
    try {
      await build({ target, outDir });
      site = await configuredSite({ env, distDir: outDir });
      for (const [path, want] of switched) {
        const r = await ask(site, path);
        assert.equal(r.status, 302, `${target} GET ${path}`);
        assert.equal(new URL(r.location, HOST + path).href, new URL(want, HOST).href, `${target} GET ${path}: the same URL without it`);
        assert.deepEqual(r.cookies, [NO_TRACKING_SET], `${target} GET ${path}: the cookie`);
      }
      const page = await ask(site, "/");
      assert.deepEqual([page.status, page.cookies], [200, []], `${target} GET /: the page, no cookie (control)`);
      const asset = await ask(site, "/assets/fitaf-logo.png?no-tracking");
      assert.deepEqual([asset.status, asset.cookies], [200, []], `${target}: an asset is served as it is, assets-first, without the script`);
    } finally {
      await site?.dispose();
      await rm(outDir, { recursive: true, force: true });
    }
  }
});
