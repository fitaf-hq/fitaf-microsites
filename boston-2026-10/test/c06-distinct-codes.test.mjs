import test, { after } from "node:test";
import assert from "node:assert/strict";
import { dummyBody } from "../scripts/dummy-claims.mjs";
import { count, postClaim, startWorker, TOKEN } from "./worker-harness.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

const N = 1000;
const CONCURRENCY = 25;

test("C6: 1,000 dummy claims through the endpoint -> 1,000 distinct codes", async () => {
  const statuses = [];
  for (let start = 0; start < N; start += CONCURRENCY) {
    const batch = Array.from({ length: Math.min(CONCURRENCY, N - start) }, (_, k) => start + k);
    const results = await Promise.all(
      batch.map((i) =>
        postClaim(mf, { ...dummyBody(i), turnstile_token: TOKEN }, { ip: `10.${i >> 8}.${i & 255}.1` }),
      ),
    );
    statuses.push(...results.map((r) => r.status));
  }
  assert.deepEqual([...new Set(statuses)], [200], "every claim accepted");
  assert.equal(await count(db, "claims"), N);
  assert.equal(await count(db, "contacts"), N);
  const distinct = (await db.prepare("SELECT COUNT(DISTINCT offer_code) AS n FROM claims").first()).n;
  assert.equal(distinct, N);
});
