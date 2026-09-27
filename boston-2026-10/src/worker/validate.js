// Validation of a claim body (SPEC-rung3 § 2). Every refusal is a NAMED error; no refusal echoes a value.
import plans from "../../data/plans.json" with { type: "json" };
import claimConfig from "../../data/claim.json" with { type: "json" };

export class ClaimError extends Error {
  constructor(name) {
    super(name);
    this.code = name;
  }
}

const EMAIL_MAX = 254;
const FIRST_NAME_MAX = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const ZIP_RE = /^\d{5}$/;
// NANP: area code and exchange each start 2-9. Separators and a leading +1 / 1 are tolerated.
const US_DIGITS_RE = /^(?:\+?1)?([2-9]\d{2})([2-9]\d{2})(\d{4})$/;
const PHONE_SEPARATORS_RE = /[\s().-]/g;

/** The plan × count cells the page can send: each individual plan at each shown count, and Family. */
export const CLAIMABLE = new Set([
  ...plans.individual.flatMap((p) => plans.shown_counts.map((c) => `${p.id}:${c.meals_per_week}`)),
  ...plans.family.counts.map((c) => `${plans.family.id}:${c.meals_per_week}`),
]);

const blank = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

function optionalString(body, key, error) {
  const v = body[key];
  if (blank(v)) return null;
  if (typeof v !== "string") throw new ClaimError(error);
  return v.trim();
}

export function normaliseUsMobile(raw) {
  const m = US_DIGITS_RE.exec(raw.replace(PHONE_SEPARATORS_RE, ""));
  if (!m) throw new ClaimError("mobile_invalid");
  return `+1${m[1]}${m[2]}${m[3]}`;
}

/** Consent is an explicit boolean, never a truthy string, a number or an absence (C3). */
function consent(body, key) {
  if (body[key] !== true && body[key] !== false) throw new ClaimError("consent_not_boolean");
  return body[key];
}

export function validateClaim(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) throw new ClaimError("body_invalid");
  const email = optionalString(body, "email", "email_invalid");
  const mobileRaw = optionalString(body, "mobile", "mobile_invalid");
  if (email === null && mobileRaw === null) throw new ClaimError("email_or_mobile_required");
  if (email !== null && (email.length > EMAIL_MAX || !EMAIL_RE.test(email))) throw new ClaimError("email_invalid");
  const mobile_e164 = mobileRaw === null ? null : normaliseUsMobile(mobileRaw);

  if (typeof body.zip !== "string" || !ZIP_RE.test(body.zip.trim())) throw new ClaimError("zip_invalid");
  const first_name = optionalString(body, "first_name", "first_name_invalid");
  if (first_name !== null && first_name.length > FIRST_NAME_MAX) throw new ClaimError("first_name_invalid");

  if (typeof body.plan !== "string" || !Number.isInteger(body.meals_per_week) ||
      !CLAIMABLE.has(`${body.plan}:${body.meals_per_week}`)) throw new ClaimError("plan_invalid");

  const consent_email = consent(body, "consent_email");
  const consent_sms = consent(body, "consent_sms");
  if (consent_email && email === null) throw new ClaimError("consent_email_without_email");
  if (consent_sms && mobile_e164 === null) throw new ClaimError("consent_sms_without_mobile");

  if (!claimConfig.known_wording_versions.includes(body.wording_version)) {
    throw new ClaimError("wording_version_unknown");
  }
  return {
    email,
    mobile_e164,
    first_name,
    zip: body.zip.trim(),
    plan: body.plan,
    meals_per_week: body.meals_per_week,
    consent_email,
    consent_sms,
    wording_version: body.wording_version,
  };
}
