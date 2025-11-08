# Fixing "Database error creating new user" Error

## Problem

When signing up, you get the error: **"Database error creating new user"**

## Root Cause

This error occurs because:
1. The `profiles` table has Row Level Security (RLS) enabled
2. The RLS policies only allow SELECT and UPDATE, but not INSERT
3. When the Auth component tries to create a profile manually, it's blocked by RLS
4. There's also a database trigger that tries to create the profile, which can cause conflicts

## Solution

Run this SQL fix in your Supabase SQL Editor:

### Step 1: Add INSERT Policy

```sql
-- Add INSERT policy for profiles table
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### Step 2: Update Trigger Function (Optional but Recommended)

This makes the trigger more robust and handles edge cases:

```sql
-- Update trigger function to handle conflicts better
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
```

## Quick Fix (Easiest)

1. **Go to Supabase Dashboard**
   - Open your project
   - Go to SQL Editor

2. **Run this SQL**:
   ```sql
   -- Add INSERT policy for profiles
   DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
   CREATE POLICY "Users can insert own profile" ON profiles
     FOR INSERT WITH CHECK (auth.uid() = id);
   ```

3. **Click "Run"**

4. **Test Signup Again**
   - Try signing up with a new email
   - It should work now!

## Alternative Solution: Use Trigger Only

If you prefer to rely only on the database trigger (no manual profile creation):

1. **Update the migration file** to include the INSERT policy (already done in updated migration)

2. **The Auth component** has been updated to:
   - Pass username in signup metadata
   - Let the trigger create the profile automatically
   - Fallback to manual creation if trigger fails

3. **No code changes needed** - just run the SQL fix above

## Verify the Fix

After running the SQL fix:

1. **Check Policies**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```
   You should see 3 policies:
   - "Users can view own profile" (SELECT)
   - "Users can insert own profile" (INSERT) ← This should now exist
   - "Users can update own profile" (UPDATE)

2. **Test Signup**:
   - Try creating a new account
   - Check that profile is created in `profiles` table
   - Verify you can sign in

## Common Issues

### Issue: "Policy already exists"

**Solution**: The policy might already exist. That's OK! Just try signing up again.

### Issue: "Trigger function doesn't exist"

**Solution**: Run the full migration file again:
```sql
-- Copy and paste the entire migration file
-- Or just run the trigger creation part:
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Issue: "Username already exists"

**Solution**: The username you're trying to use is already taken. Try a different username.

### Issue: Still getting errors

**Solution**: Check the browser console and Supabase logs for detailed error messages:
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Go to Supabase Dashboard → Logs → Postgres Logs
4. Look for errors related to profile creation

## Prevention

To prevent this issue in the future:

1. **Always include INSERT policies** when creating tables with RLS
2. **Test signup flow** after running migrations
3. **Use database triggers** for automatic profile creation (more reliable)

## Updated Files

The following files have been updated:

1. **`supabase/migrations/001_initial_schema.sql`**: Added INSERT policy
2. **`supabase/migrations/002_fix_profile_insert_policy.sql`**: New migration file with fix
3. **`src/components/Auth.jsx`**: Updated to pass username in metadata and handle conflicts

## Still Having Issues?

If you're still experiencing problems:

1. **Check Supabase Logs**:
   - Go to Dashboard → Logs → Postgres Logs
   - Look for errors when signing up

2. **Check Browser Console**:
   - Open DevTools (F12)
   - Look for detailed error messages

3. **Verify Migration Ran**:
   ```sql
   -- Check if policies exist
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   
   -- Check if trigger exists
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

4. **Test Directly in Database**:
   ```sql
   -- Try inserting a test profile (replace with actual user ID)
   INSERT INTO profiles (id, username)
   VALUES ('00000000-0000-0000-0000-000000000000', 'test_user');
   ```

If all else fails, check the detailed error message and share it for further assistance.

