-- COMPLETE FIX FOR SIGNUP ERROR
-- Run this entire script in Supabase SQL Editor

-- Step 1: Ensure INSERT policy exists for profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 2: Fix the trigger function to be more robust
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with username from metadata or generate one
  INSERT INTO profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      'user_' || substr(NEW.id::text, 1, 8)
    )
  )
  ON CONFLICT (id) DO NOTHING;  -- If profile already exists, do nothing
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Username already exists, generate a unique one
    INSERT INTO profiles (id, username)
    VALUES (
      NEW.id,
      'user_' || substr(NEW.id::text, 1, 8) || '_' || floor(random() * 10000)::text
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION handle_new_user();

-- Step 4: Verify everything is set up correctly
-- Check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Check trigger
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Check function
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'handle_new_user';

