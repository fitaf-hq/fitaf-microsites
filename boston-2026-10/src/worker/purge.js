// Step 3 of the scheduled Worker: the purge (flows/06 6.5; rung 3's, on rung 4's tables). For every save
// whose state is 'exported', delete its `save_contacts` row and set 'purged'. The save row remains; the
// offer code is then the only link. (`exported` is reached only by the seeder until the export rung.)
//
// Self-contained on purpose (no imports), so a mutant can be a COPY of this file. `db` is the
// { all(sql), batch(sqls) } adapter. Dry run by default. Idempotent: if the UPDATE were lost after the
// DELETE, a rerun finishes it.

const q = (s) => `'${String(s).replaceAll("'", "''")}'`;

export const COUNT_SQL =
  "SELECT " +
  "(SELECT COUNT(*) FROM saves WHERE state = 'exported') AS exported_saves, " +
  "(SELECT COUNT(*) FROM save_contacts WHERE save_id IN " +
  "(SELECT save_id FROM saves WHERE state = 'exported')) AS contacts_to_delete";

export const purgeSql = (now) => [
  "DELETE FROM save_contacts WHERE save_id IN (SELECT save_id FROM saves WHERE state = 'exported')",
  `UPDATE saves SET state = 'purged', state_at = ${q(now)} WHERE state = 'exported'`,
];

export async function purge(db, { dryRun = true, now = new Date().toISOString() } = {}) {
  const [counts] = await db.all(COUNT_SQL);
  const result = {
    dry_run: dryRun,
    exported_saves: Number(counts.exported_saves),
    contacts_to_delete: Number(counts.contacts_to_delete),
  };
  if (!dryRun) await db.batch(purgeSql(now));
  return result;
}
