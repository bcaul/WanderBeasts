-- Fix: Create profiles for users that don't have one
-- This fixes the foreign key constraint error when trying to insert catches

-- Create profiles for all auth users that don't have a profile
INSERT INTO profiles (id, username)
SELECT 
  id,
  COALESCE(
    raw_user_meta_data->>'username',
    split_part(email, '@', 1),
    'user_' || substring(id::text, 1, 8)
  ) as username
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- Verify the fix worked
SELECT 
  'Total auth users' as description,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'Total profiles' as description,
  COUNT(*) as count
FROM profiles
UNION ALL
SELECT 
  'Users without profiles' as description,
  COUNT(*) as count
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles);

