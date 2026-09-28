// Validation of a save body (SPEC-rung4 § 3). Every refusal is a NAMED error; no refusal echoes a value.
import zips from "../../data/delivery-zips.json" with { type: "json" };
import events from "../../data/events.json" with { type: "json" };
import saveConfig from "../../data/save.json" with { type: "json" };
import { classifyZip } from "./zip-class.js";

export class SaveError extends Error {
  constructor(name) {
    super(name);
    this.code = name;
  }
}

export const EMAIL_MAX = 254;
export const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
export const ZIP_RE = /^\d{5}$/;
export const KINDS = ["offer", "expansion"];
export const EVENT_IDS = new Set(events.map((e) => e.id));

export function validateSave(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) throw new SaveError("body_invalid");
  if (!KINDS.includes(body.kind)) throw new SaveError("kind_invalid");
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (email === "" || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) throw new SaveError("email_invalid");
  const zip = typeof body.zip === "string" ? body.zip.trim() : "";
  if (!ZIP_RE.test(zip)) throw new SaveError("zip_invalid");
  if (typeof body.event_id !== "string" || !EVENT_IDS.has(body.event_id)) throw new SaveError("event_unknown");
  if (!saveConfig.known_wording_versions.includes(body.wording_version)) {
    throw new SaveError("wording_version_unknown");
  }
  if (body.consent_marketing !== true && body.consent_marketing !== false) {
    throw new SaveError("consent_not_boolean");
  }
  const ring = classifyZip(zip, zips);
  if (body.kind === "offer" && ring !== "in") throw new SaveError("zip_out_of_area");
  if (body.kind === "expansion" && ring === "in") throw new SaveError("zip_in_area");
  if (body.kind === "expansion" && body.consent_marketing) throw new SaveError("consent_marketing_on_expansion");
  return {
    kind: body.kind,
    email,
    zip,
    ring,
    event_id: body.event_id,
    consent_marketing: body.consent_marketing,
    wording_version: body.wording_version,
  };
}
