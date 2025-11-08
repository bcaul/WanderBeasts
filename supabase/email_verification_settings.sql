-- SQL to check and update email verification settings
-- Note: Most email settings are in the Supabase Dashboard, not SQL
-- But you can check user verification status here

-- Check if users have verified emails
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN 'Not Verified'
    ELSE 'Verified'
  END as verification_status
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Resend verification email for a specific user (via Dashboard or API)
-- This cannot be done via SQL directly, use Supabase Dashboard or API

-- Check authentication settings (these are set in Dashboard, not SQL)
-- Go to: Authentication → Providers → Email
-- Toggle "Confirm email" on/off as needed

-- For development: You can manually verify a user's email
-- (Only do this for testing, not production!)
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com'  -- Replace with actual email
  AND email_confirmed_at IS NULL;

-- Check redirect URLs (set in Dashboard, not SQL)
-- Go to: Authentication → URL Configuration
-- Add: http://localhost:5173/**
-- Add: Your production URL/**

