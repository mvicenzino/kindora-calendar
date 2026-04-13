-- May 16, 2026 Enrollment Migration: Finalize Early Adopter Status
-- Date: Run on 2026-05-16 00:00:00 UTC
-- Purpose: Grant lifetime free Family tier to all users who signed up Apr 15 - May 15
-- Impact: ONE-TIME operation; marks qualifying users with permanent free access
-- Duration: ~5-10 seconds on 10k users
-- Testing: Validate row counts before/after

-- CHECKPOINT: Verify enrollment window parameters
-- Early Adopter Window: Apr 15, 2026 00:00:00 UTC to May 15, 2026 23:59:59 UTC
-- Cutoff: created_at < 2026-05-16 00:00:00 UTC

-- Step 1: Identify qualifying users (READ-ONLY, for verification)
-- SELECT COUNT(*) as eligible_early_adopters 
-- FROM users 
-- WHERE created_at < '2026-05-16 00:00:00 UTC' 
--   AND created_at >= '2026-04-15 00:00:00 UTC'
--   AND lifetime_free = FALSE;

-- Step 2: PRODUCTION - Grant lifetime free Family tier
-- This is the irreversible enrollment operation
UPDATE users 
SET 
  lifetime_free = TRUE,
  lifetime_tier = 'family',
  early_adopter_enrolled_at = created_at,
  early_adopter_ends_at = '2026-05-16 00:00:00+00'::timestamp with time zone,
  updatedAt = NOW()
WHERE 
  created_at < '2026-05-16 00:00:00+00'::timestamp with time zone
  AND created_at >= '2026-04-15 00:00:00+00'::timestamp with time zone
  AND lifetime_free = FALSE
  AND subscriptionStatus != 'canceled';

-- Step 3: Verify results (run after migration)
-- SELECT COUNT(*) as total_early_adopters FROM users WHERE lifetime_free = TRUE;
-- SELECT COUNT(*) as family_tier_free FROM users WHERE lifetime_free = TRUE AND lifetime_tier = 'family';
-- SELECT COUNT(*) as non_early_adopter FROM users WHERE lifetime_free = FALSE;

-- Step 4: Log the operation (optional, for audit trail)
-- INSERT INTO system_logs (event, count, timestamp) 
-- VALUES ('early_adopter_enrollment', (SELECT COUNT(*) FROM users WHERE lifetime_free = TRUE), NOW());
