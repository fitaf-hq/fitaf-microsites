// Dummy claims for the DEVELOPMENT database only. Obviously fake by construction:
//   emails   dummy-NNNN@example.com        (RFC 2606 reserved domain)
//   mobiles  +1 617 555 01xx               (the 555-0100..0199 range reserved for fiction)
//   names    "Dummy NNNN"
// Every one is passed through the Worker's own validateClaim, so a seeded row has the shape a real
// claim would. The offer code comes from the Worker's generator.
import claimConfig from "../data/claim.json" with { type: "json" };
import { claimRows } from "../src/worker/claim-store.js";
import { newOfferCode } from "../src/worker/offer-code.js";
import { CLAIMABLE, validateClaim } from "../src/worker/validate.js";

const FICTIONAL_LINES = 100; // 555-0100 .. 555-0199
const CELLS = [...CLAIMABLE].map((k) => k.split(":"));

export function dummyBody(i) {
  const n = String(i).padStart(4, "0");
  const [plan, count] = CELLS[i % CELLS.length];
  const hasEmail = i % 3 !== 2;
  const hasMobile = i % 3 !== 0;
  return {
    first_name: i % 4 === 0 ? "" : `Dummy ${n}`,
    email: hasEmail ? `dummy-${n}@example.com` : "",
    mobile: hasMobile ? `617-555-01${String(i % FICTIONAL_LINES).padStart(2, "0")}` : "",
    zip: "02118",
    plan,
    meals_per_week: Number(count),
    consent_email: hasEmail && i % 2 === 0,
    consent_sms: hasMobile && i % 5 === 0,
    wording_version: claimConfig.wording_version,
  };
}

/** n dummy claims as row pairs; the first `exported` are marked exported (standing in for the export rung). */
export function dummyClaims(n, { exported = 0, now = new Date().toISOString() } = {}) {
  return Array.from({ length: n }, (_, i) =>
    claimRows(validateClaim(dummyBody(i)), {
      eventId: claimConfig.event_id,
      now,
      claimId: crypto.randomUUID(),
      offerCode: newOfferCode(),
      exportState: i < exported ? "exported" : "pending",
    }),
  );
}

const literal = (v) =>
  v === null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replaceAll("'", "''")}'`;

export function toSql(claims) {
  return claims
    .map(({ claimRow, contactRow }) =>
      `INSERT INTO claims (claim_id, event_id, plan, meals_per_week, offer_code, created_at, export_state) ` +
      `VALUES (${claimRow.map(literal).join(", ")});\n` +
      `INSERT INTO contacts (claim_id, email, mobile_e164, first_name, zip, consent_email, consent_sms, ` +
      `consent_wording_version, consent_at) VALUES (${contactRow.map(literal).join(", ")});`,
    )
    .join("\n");
}
