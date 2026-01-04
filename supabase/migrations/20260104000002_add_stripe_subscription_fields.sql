-- Add Stripe fields to support subscriptions and Connect

-- Add stripe_price_id to memberships table
ALTER TABLE memberships
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Add stripe_subscription_id to users_memberships table
ALTER TABLE users_memberships
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_memberships_stripe_price_id 
ON memberships(stripe_price_id) 
WHERE stripe_price_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_memberships_stripe_subscription_id 
ON users_memberships(stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN memberships.stripe_price_id IS 'Stripe Price ID (price_xxx) for recurring subscription billing';
COMMENT ON COLUMN users_memberships.stripe_subscription_id IS 'Stripe Subscription ID (sub_xxx) for tracking subscription lifecycle';
