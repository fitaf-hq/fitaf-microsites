-- SPEC-rung4-save-offer.md § 4. Rung 3's `claims` and `contacts` are retired (§ 1): the development
-- database only ever held dummy data, so they are dropped, not migrated.
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS claims;

-- One row per save (and per reissued code). No PII: this row outlives the contact (flows/06 § 2),
-- and it is what keeps /o/<code> working a year later.
CREATE TABLE saves (
  save_id       TEXT PRIMARY KEY,                   -- random, opaque (crypto.randomUUID)
  event_id      TEXT NOT NULL,                      -- an id from data/events.json
  kind          TEXT NOT NULL CHECK (kind IN ('offer', 'expansion', 'reissue')),
  offer_code    TEXT UNIQUE,                        -- NULL for an expansion save, and only then
  offer_id      TEXT,                               -- an id from data/offers.json; NULL for expansion
  ring          TEXT NOT NULL CHECK (ring IN ('in', 'near', 'far')),
  reissued_from TEXT REFERENCES saves (save_id),    -- a reissue's original save (flows/05 § 4)
  created_at    TEXT NOT NULL,                      -- ISO 8601, UTC ('Z')
  send_at       TEXT,                               -- ISO 8601, UTC; NULL for a reissue (no message)
  message_state TEXT CHECK (message_state IN ('scheduled', 'sent', 'suppressed', 'failed', 'cancelled')),
  state         TEXT NOT NULL CHECK (state IN ('saved', 'messaged', 'confirmed', 'exported', 'purged', 'lapsed', 'erased')),
  state_at      TEXT NOT NULL,                      -- ISO 8601, UTC: when `state` last changed
  CHECK ((kind = 'expansion') = (offer_code IS NULL)),
  CHECK ((kind = 'reissue') = (reissued_from IS NOT NULL))
);

-- At most one reissued code per original save per offer: a revisit reuses it (§ 5, idempotent).
CREATE UNIQUE INDEX saves_one_reissue ON saves (reissued_from, offer_id) WHERE kind = 'reissue';
CREATE INDEX saves_due ON saves (message_state, send_at);

-- The PII, dropped whole: deleting a save can never leave its contact behind.
-- ⛔ No IP, no user agent, no name, no phone, no plan, no calculator values.
CREATE TABLE save_contacts (
  save_id            TEXT PRIMARY KEY REFERENCES saves (save_id) ON DELETE CASCADE,
  email              TEXT NOT NULL,
  zip                TEXT NOT NULL CHECK (length(zip) = 5),
  consent_marketing  INTEGER NOT NULL CHECK (consent_marketing IN (0, 1)),
  consent_expansion  INTEGER NOT NULL CHECK (consent_expansion IN (0, 1)),
  wording_version    TEXT NOT NULL,                 -- e.g. 'v0.3-draft': the exact text shown
  consent_at         TEXT NOT NULL,                 -- ISO 8601, UTC
  confirm_token_hash TEXT UNIQUE,                   -- SHA-256 (hex) of the /confirm token; never the token
  confirmed_at       TEXT,                          -- ISO 8601, UTC: CP3 or the expansion confirmation
  withdrawn_at       TEXT                           -- ISO 8601, UTC: "No thanks" (6.8)
);

CREATE INDEX save_contacts_email ON save_contacts (lower(email));
