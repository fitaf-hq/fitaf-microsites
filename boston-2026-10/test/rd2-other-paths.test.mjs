// RD2 (SPEC-the-redirect.md § 1 item 3, § 7): with the var set, every other path is answered exactly as with it absent
// (status, every header but `date`, every Set-Cookie, the bytes): /index.html (the assets' 307), /privacy/, /why/, POST
// /a, /week/…, every asset, the development Worker's event pages /<event-id>/, and the save step's routes (/o/<code>,
// /confirm/<token>, /api/save). ⛔ /assets/ above all: each image E1 names (the paths in src/worker/email-style.js and
// src/worker/email-photos.json) is 200 with the built file's bytes. Three ways: the Worker script itself over each
// target's build (every request reaching it; the check the mutant "/assets/ redirected" runs on a mirror); both Workers
// as wrangler.jsonc configures them (the real asset router, the var as configured there); and the save step's routes
// through worker-harness's Worker (its D1 and rate limiters), on the development Worker and production's.
import test from "node:test";
import assert from "node:assert/strict";
import { configuredOtherPathProblems, otherPathProblems, SAVE_STEP_REQUESTS, STORE, VAR } from "./rd-checks.mjs";
import { nextIp, startWorker } from "./worker-harness.mjs";

test("RD2: the Worker script itself answers every other path as with the var absent; each image E1 names 200, the built bytes", async () => {
  assert.deepEqual(await otherPathProblems(), []);
});

test("RD2: as wrangler.jsonc configures both Workers (the var as configured there), the same", async () => {
  assert.deepEqual(await configuredOtherPathProblems(), []);
});

/** A response read whole: status, headers but `date`, every Set-Cookie, body. */
async function readAll(res) {
  const headers = Object.fromEntries(res.headers);
  delete headers.date;
  return { status: res.status, headers, cookies: res.headers.getSetCookie(), body: Buffer.from(await res.arrayBuffer()) };
}

test("RD2: the save step's routes (/o, /confirm, /api/save) answered as with the var absent, on the development Worker and production's", async () => {
  for (const options of [{ worker: "development" }, { worker: "production" }]) {
    const answers = [];
    for (const bindings of [{ [VAR]: STORE }, {}]) {
      const { mf } = await startWorker({ ...options, bindings });
      try {
        const list = [];
        for (const [method, path, body] of SAVE_STEP_REQUESTS) {
          const headers = { "cf-connecting-ip": nextIp(), ...(body ? { "content-type": "application/json" } : {}) };
          list.push(await readAll(await mf.dispatchFetch(`https://eatfitaf.com${path}`, { method, headers, ...(body ? { body } : {}), redirect: "manual" })));
        }
        answers.push(list);
      } finally {
        await mf.dispose();
      }
    }
    for (const [i, [method, path]] of SAVE_STEP_REQUESTS.entries()) {
      const [a, b] = [answers[0][i], answers[1][i]];
      const where = `${options.worker} ${method} ${path}`;
      assert.equal(a.status, b.status, `${where}: status`);
      assert.deepEqual(a.headers, b.headers, `${where}: headers`);
      assert.deepEqual(a.cookies, b.cookies, `${where}: Set-Cookie`);
      assert.ok(a.body.equals(b.body), `${where}: body`);
      assert.notEqual(a.status, 302, `${where}: not redirected`);
    }
  }
});
