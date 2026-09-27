-- SPEC-rung3-lead-capture.md § 3: the PII, separate so it can be dropped whole. Keyed by claim_id.
-- ⛔ No IP, no user-agent, no location beyond ZIP, no plan "goal", nothing about health.
-- ON DELETE CASCADE: deleting a claim can never leave its contact behind.
CREATE TABLE contacts (
  claim_id                TEXT PRIMARY KEY REFERENCES claims (claim_id) ON DELETE CASCADE,
  email                   TEXT,
  mobile_e164             TEXT,
  first_name              TEXT,
  zip                     TEXT NOT NULL CHECK (length(zip) = 5),
  consent_email           INTEGER NOT NULL CHECK (consent_email IN (0, 1)),
  consent_sms             INTEGER NOT NULL CHECK (consent_sms IN (0, 1)),
  consent_wording_version TEXT NOT NULL,            -- e.g. 'v0.2-draft': the exact text shown
  consent_at              TEXT NOT NULL,            -- ISO 8601, UTC ('Z')
  CHECK (email IS NOT NULL OR mobile_e164 IS NOT NULL)
);
