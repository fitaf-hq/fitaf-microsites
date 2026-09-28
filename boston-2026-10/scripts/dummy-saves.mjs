// Dummy saves for the DEVELOPMENT database only. Obviously fake by construction:
//   emails  dummy-NNNN@example.com   (RFC 2606 reserved domain)
//   ZIPs    02118 (in area) · 01602 (near ring) · 10001 (far) — public ZIPs, no person's address
// Every body passes through the Worker's own validateSave, so a seeded row has the shape a real save has.
import events from "../data/events.json" with { type: "json" };
import saveConfig from "../data/save.json" with { type: "json" };
import { newOfferCode } from "../src/worker/offer-code.js";
import { offerForSave } from "../src/worker/offers.js";
import { validateSave } from "../src/worker/validate-save.js";
import { nextDayAt, zonedDate } from "../src/worker/zoned-time.js";

export const SAVE_COLUMNS = [
  "save_id", "event_id", "kind", "offer_code", "offer_id", "ring", "reissued_from",
  "created_at", "send_at", "message_state", "state", "state_at",
];
export const CONTACT_COLUMNS = [
  "save_id", "email", "zip", "consent_marketing", "consent_expansion", "wording_version",
  "consent_at", "confirm_token_hash", "confirmed_at", "withdrawn_at",
];

export function dummyBody(i) {
  const n = String(i).padStart(4, "0");
  const expansion = i % 4 === 3;
  return {
    kind: expansion ? "expansion" : "offer",
    email: `dummy-${n}@example.com`,
    zip: expansion ? (i % 8 === 3 ? "01602" : "10001") : "02118",
    consent_marketing: !expansion && i % 2 === 0,
    event_id: events[0].id,
    wording_version: saveConfig.wording_version,
  };
}

/** One validated save as its two rows (objects keyed by column). Overrides patch either row. */
export function saveRows(save, { nowMs = Date.now(), state = "saved", saveOverrides = {}, contactOverrides = {} } = {}) {
  const now = new Date(nowMs).toISOString();
  const zone = saveConfig.send_time_zone;
  const offer = save.kind === "offer" ? offerForSave(zonedDate(nowMs, zone)) : null;
  const saveRow = {
    save_id: crypto.randomUUID(),
    event_id: save.event_id,
    kind: save.kind,
    offer_code: offer ? newOfferCode() : null,
    offer_id: offer ? offer.id : null,
    ring: save.ring,
    reissued_from: null,
    created_at: now,
    send_at: offer ? new Date(nextDayAt(nowMs, { zone, hour: saveConfig.send_hour })).toISOString() : now,
    message_state: "scheduled",
    state,
    state_at: now,
    ...saveOverrides,
  };
  const contactRow = {
    save_id: saveRow.save_id,
    email: save.email,
    zip: save.zip,
    consent_marketing: save.consent_marketing ? 1 : 0,
    consent_expansion: save.kind === "expansion" ? 1 : 0,
    wording_version: save.wording_version,
    consent_at: now,
    confirm_token_hash: null,
    // An exported contact was confirmed first (flows/06 § 5): only CONFIRMED contacts are exported.
    confirmed_at: state === "exported" ? now : null,
    withdrawn_at: null,
    ...contactOverrides,
  };
  return { saveRow, contactRow };
}

/** n dummy saves; the first `exported` are marked exported (standing in for the export rung). */
export function dummySaves(n, { exported = 0, nowMs = Date.now() } = {}) {
  return Array.from({ length: n }, (_, i) =>
    saveRows(validateSave(dummyBody(i)), { nowMs, state: i < exported ? "exported" : "saved" }),
  );
}

export const INSERT_SAVE_ROW_SQL = `INSERT INTO saves (${SAVE_COLUMNS.join(", ")}) VALUES (${SAVE_COLUMNS.map(() => "?").join(", ")})`;
export const INSERT_CONTACT_ROW_SQL =
  `INSERT INTO save_contacts (${CONTACT_COLUMNS.join(", ")}) VALUES (${CONTACT_COLUMNS.map(() => "?").join(", ")})`;

/** Insert rows through a D1 binding (tests). */
export async function insertRows(db, rows) {
  await db.batch(
    rows.flatMap(({ saveRow, contactRow }) => [
      db.prepare(INSERT_SAVE_ROW_SQL).bind(...SAVE_COLUMNS.map((c) => saveRow[c])),
      ...(contactRow ? [db.prepare(INSERT_CONTACT_ROW_SQL).bind(...CONTACT_COLUMNS.map((c) => contactRow[c]))] : []),
    ]),
  );
}

const literal = (v) =>
  v === null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replaceAll("'", "''")}'`;

/** Rows as SQL (the seeder, through the wrangler CLI). */
export function toSql(rows) {
  return rows
    .map(({ saveRow, contactRow }) =>
      `INSERT INTO saves (${SAVE_COLUMNS.join(", ")}) VALUES (${SAVE_COLUMNS.map((c) => literal(saveRow[c])).join(", ")});\n` +
      `INSERT INTO save_contacts (${CONTACT_COLUMNS.join(", ")}) ` +
      `VALUES (${CONTACT_COLUMNS.map((c) => literal(contactRow[c])).join(", ")});`,
    )
    .join("\n");
}
