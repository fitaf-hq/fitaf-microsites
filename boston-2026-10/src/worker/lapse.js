// Step 2 of the scheduled Worker: the lapse (flows/06 6.6 and the expansion list). Three rules, each
// deleting the CONTACT and setting the save `lapsed` (an unsent message is cancelled with it):
//   A. an offer save without confirmed marketing, 30 days after its offer's valid_to;
//   B. an expansion save unconfirmed after 7 days;
//   C. a confirmed expansion save after expansion_retention_days (365, proposed).
// The save row stays: it is how we count, not who.
//
// Self-contained on purpose (no imports), so the S15 mutant can be a COPY of this file. The caller does
// the calendar arithmetic (scheduled.js lapseInputs) and passes plain values; `db` is the
// { all(sql), batch(sqls) } adapter (d1-adapter.js). Dry run by default, like the purge.

const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
const list = (xs) => xs.map(q).join(", ");

// A save is "unconfirmed" if nobody confirmed from the inbox, or they said No thanks afterwards.
const UNCONFIRMED = "(c.confirmed_at IS NULL OR c.withdrawn_at IS NOT NULL)";

export function ruleSql({ lapsedOfferIds, expansionCreatedBefore, expansionConfirmedBefore }) {
  const from = "SELECT s.save_id FROM saves s JOIN save_contacts c ON c.save_id = s.save_id WHERE ";
  return {
    offer:
      from +
      `s.kind = 'offer' AND s.state IN ('saved', 'messaged', 'confirmed') AND ${UNCONFIRMED} ` +
      `AND s.offer_id IN (${list(lapsedOfferIds)})`,
    expansion_unconfirmed:
      from +
      `s.kind = 'expansion' AND s.state IN ('saved', 'messaged', 'confirmed') AND ${UNCONFIRMED} ` +
      `AND s.created_at <= ${q(expansionCreatedBefore)}`,
    expansion_retention:
      from +
      "s.kind = 'expansion' AND s.state = 'confirmed' AND c.withdrawn_at IS NULL " +
      `AND c.confirmed_at <= ${q(expansionConfirmedBefore)}`,
  };
}

export function lapseSql(inputs) {
  const rules = ruleSql(inputs);
  const targets = Object.values(rules).join(" UNION ");
  return [
    "UPDATE saves SET state = 'lapsed', " +
      `state_at = ${q(inputs.now)}, ` +
      "message_state = CASE WHEN message_state = 'scheduled' THEN 'cancelled' ELSE message_state END " +
      `WHERE save_id IN (${targets})`,
    "DELETE FROM save_contacts WHERE save_id IN (SELECT save_id FROM saves WHERE state = 'lapsed')",
  ];
}

export async function lapse(db, inputs, { dryRun = true } = {}) {
  const rules = ruleSql(inputs);
  const counts = {};
  for (const [name, sql] of Object.entries(rules)) {
    const [row] = await db.all(`SELECT COUNT(*) AS n FROM (${sql})`);
    counts[name] = Number(row.n);
  }
  if (!dryRun) await db.batch(lapseSql(inputs));
  return { dry_run: dryRun, ...counts };
}
