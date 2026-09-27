// The purge (SPEC-rung3 § 4): for every claim whose export_state = 'exported', delete its `contacts`
// row and set 'purged'. The claims row remains; the offer code is then the only link (§ 5).
//
// Self-contained on purpose (no imports), so the C9 mutant can be a COPY of this file.
// `db` is an adapter: { all(sql) -> rows, batch(sqls) } — a D1 binding (d1Adapter) or the wrangler
// CLI (scripts/purge.mjs). Idempotent: if the UPDATE were lost after the DELETE, a rerun finishes it.

export const COUNT_SQL =
  "SELECT " +
  "(SELECT COUNT(*) FROM claims WHERE export_state = 'exported') AS exported_claims, " +
  "(SELECT COUNT(*) FROM contacts WHERE claim_id IN " +
  "(SELECT claim_id FROM claims WHERE export_state = 'exported')) AS contacts_to_delete";

export const PURGE_SQL = [
  "DELETE FROM contacts WHERE claim_id IN (SELECT claim_id FROM claims WHERE export_state = 'exported')",
  "UPDATE claims SET export_state = 'purged' WHERE export_state = 'exported'",
];

export async function purge(db, { dryRun = true } = {}) {
  const [counts] = await db.all(COUNT_SQL);
  const result = {
    dry_run: dryRun,
    exported_claims: Number(counts.exported_claims),
    contacts_to_delete: Number(counts.contacts_to_delete),
  };
  if (!dryRun) await db.batch(PURGE_SQL);
  return result;
}

/** A D1 binding as a purge adapter (the Worker, later; the tests, now). */
export function d1Adapter(d1) {
  return {
    all: async (sql) => (await d1.prepare(sql).all()).results,
    batch: async (sqls) => d1.batch(sqls.map((s) => d1.prepare(s))),
  };
}
