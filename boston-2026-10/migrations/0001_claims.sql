-- SPEC-rung3-lead-capture.md § 3: one row per claim. No PII here; the PII is in `contacts`.
CREATE TABLE claims (
  claim_id       TEXT PRIMARY KEY,                  -- random, opaque (crypto.randomUUID)
  event_id       TEXT NOT NULL,                     -- e.g. 'boston-2026-10'
  plan           TEXT NOT NULL,                     -- a plan id from data/plans.json
  meals_per_week INTEGER NOT NULL,                  -- a count from data/plans.json
  offer_code     TEXT NOT NULL UNIQUE,              -- the attestation token (§ 5)
  created_at     TEXT NOT NULL,                     -- ISO 8601, UTC ('Z')
  export_state   TEXT NOT NULL DEFAULT 'pending'
                 CHECK (export_state IN ('pending', 'exported', 'purged'))
);
