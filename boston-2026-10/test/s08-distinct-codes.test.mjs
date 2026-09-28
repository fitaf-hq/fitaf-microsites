import test, { after } from "node:test";
import assert from "node:assert/strict";
import { count, postSave, startWorker, validSave } from "./worker-harness.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

const N = 1000;
const CONCURRENCY = 25;

test("S8: 1,000 dummy offer saves through the endpoint -> 1,000 distinct codes", async () => {
  const statuses = [];
  for (let start = 0; start < N; start += CONCURRENCY) {
    const batch = Array.from({ length: Math.min(CONCURRENCY, N - start) }, (_, k) => start + k);
    const results = await Promise.all(
      batch.map((i) =>
        postSave(mf, validSave({ email: `dummy-${String(i).padStart(4, "0")}@example.com`, consent_marketing: i % 2 === 0 }), {
          ip: `10.${i >> 8}.${i & 255}.1`,
        }),
      ),
    );
    statuses.push(...results.map((r) => r.status));
  }
  assert.deepEqual([...new Set(statuses)], [200], "every save accepted");
  assert.equal(await count(db, "saves"), N);
  assert.equal(await count(db, "save_contacts"), N);
  const distinct = (await db.prepare("SELECT COUNT(DISTINCT offer_code) AS n FROM saves").first()).n;
  assert.equal(distinct, N);
});
