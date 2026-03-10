-- Add yearly Stripe price ID to memberships
-- Populated when a creator creates/updates their subscription plan.

ALTER TABLE memberships
ADD COLUMN IF NOT EXISTS stripe_yearly_price_id TEXT;

CREATE INDEX IF NOT EXISTS idx_memberships_stripe_yearly_price_id
ON memberships(stripe_yearly_price_id)
WHERE stripe_yearly_price_id IS NOT NULL;

COMMENT ON COLUMN memberships.stripe_yearly_price_id IS 'Stripe Price ID for annual billing (10 months = 2 months free)';
