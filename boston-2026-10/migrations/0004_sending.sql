-- SPEC-rung5-sending.md § 4: what sending through Resend needs to remember. Nothing personal.
ALTER TABLE saves ADD COLUMN send_attempts INTEGER NOT NULL DEFAULT 0;  -- requests made to the provider
ALTER TABLE saves ADD COLUMN provider_message_id TEXT;                 -- Resend's id for an accepted message

-- ⚠ Not in the contract's § 4 list; the "state guard" its case M9 allows. A cron run claims a message
-- (sets this to now + a lease) before its request, and clears it with the outcome. A second run that
-- finds the claim unexpired skips the message, so a send in flight is never requested twice. The
-- idempotency key alone cannot do this: each attempt carries a newly minted /confirm token, so two
-- attempts' bodies differ and Resend refuses the second (409), it does not replay the first.
ALTER TABLE saves ADD COLUMN send_lease_until TEXT;                    -- ISO 8601, UTC; NULL when unclaimed
