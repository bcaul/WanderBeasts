-- Fix: Add INSERT policy for profiles table
-- This allows users to create their own profile when signing up

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create INSERT policy
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Also update the trigger function to handle username from metadata better
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to insert profile, but handle case where it might already exist
  INSERT INTO profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      'user_' || substr(NEW.id::text, 1, 8)
    )
  )
  ON CONFLICT (id) DO UPDATE
    SET username = COALESCE(
      EXCLUDED.username,
      profiles.username
    );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- If insert fails for any reason, log and continue
    -- This prevents signup from failing if profile creation has issues
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

