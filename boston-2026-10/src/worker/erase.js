// Erase on request (flows/06 6.7, CP-W2): every save of one address loses its contact; an unsent message
// is cancelled; the save is marked 'erased'. Matching is by lower(email), across events and kinds.
//
// Self-contained (no imports); `db` is the { all(sql), batch(sqls) } adapter, so scripts/erase.mjs runs it
// through the wrangler CLI. Dry run by default. Returns counts only — never the address.

const q = (s) => `'${String(s).replaceAll("'", "''")}'`;

export function eraseSql(email, now) {
  const ids = `SELECT save_id FROM save_contacts WHERE lower(email) = lower(${q(email)})`;
  return {
    count:
      "SELECT " +
      `(SELECT COUNT(*) FROM save_contacts WHERE save_id IN (${ids})) AS contacts, ` +
      `(SELECT COUNT(*) FROM saves WHERE message_state = 'scheduled' AND save_id IN (${ids})) AS messages_to_cancel`,
    apply: [
      `UPDATE saves SET message_state = 'cancelled' WHERE message_state = 'scheduled' AND save_id IN (${ids})`,
      `UPDATE saves SET state = 'erased', state_at = ${q(now)} WHERE save_id IN (${ids})`,
      `DELETE FROM save_contacts WHERE save_id IN (${ids})`,
    ],
  };
}

export async function erase(db, { email, dryRun = true, now = new Date().toISOString() }) {
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+$/.test(email.trim())) throw new Error("erase needs --email <address>");
  const sql = eraseSql(email.trim(), now);
  const [counts] = await db.all(sql.count);
  const result = { dry_run: dryRun, contacts: Number(counts.contacts), messages_to_cancel: Number(counts.messages_to_cancel) };
  if (!dryRun) await db.batch(sql.apply);
  return result;
}
