-- Add stripe_customer_id to users table for customer management
-- This allows us to link Stripe customers to our users and reuse payment methods

ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id 
ON users(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe Customer ID (cus_xxx) for payment management and subscription tracking';
