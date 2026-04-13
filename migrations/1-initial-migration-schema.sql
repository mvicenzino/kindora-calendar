-- Initial Migration: Add Early Adopter Support Fields to Users Table
-- Date: 2026-04-13
-- Purpose: Add lifetime_free and lifetime_tier columns to track early adopter status
-- Impact: Non-breaking change; defaults preserve existing behavior

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS lifetime_free BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS lifetime_tier VARCHAR(50),
ADD COLUMN IF NOT EXISTS early_adopter_enrolled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS early_adopter_ends_at TIMESTAMP;

-- Create index for efficient queries on lifetime_free status
CREATE INDEX IF NOT EXISTS idx_users_lifetime_free ON users(lifetime_free);
CREATE INDEX IF NOT EXISTS idx_users_lifetime_tier ON users(lifetime_tier);
CREATE INDEX IF NOT EXISTS idx_users_early_adopter_enrolled ON users(early_adopter_enrolled_at);

-- Add comment for documentation
COMMENT ON COLUMN users.lifetime_free IS 'Flag indicating this user has lifetime free access to a tier';
COMMENT ON COLUMN users.lifetime_tier IS 'The subscription tier this user gets free forever (family, care, etc.)';
COMMENT ON COLUMN users.early_adopter_enrolled_at IS 'ISO timestamp when user signed up (for early adopter eligibility check)';
COMMENT ON COLUMN users.early_adopter_ends_at IS 'May 16, 2026 00:00:00 UTC - final cutoff for early adopter enrollment';
