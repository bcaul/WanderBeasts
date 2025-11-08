# Step-by-Step Fix for Signup Error

Follow these steps **exactly** to fix the signup error.

## Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Click on your project
3. Click "SQL Editor" in the left sidebar
4. Click "New query"

## Step 2: Run the Complete Fix Script

1. Open the file `FIX_SIGNUP_ERROR.sql` in your project
2. Copy the **entire contents** of the file
3. Paste it into the Supabase SQL Editor
4. Click "Run" button (or press Ctrl+Enter)

**Expected Result**: You should see "Success" message with no errors.

## Step 3: Verify the Fix Worked

After running the SQL, you should see results for three queries at the bottom:

### Check 1: Policies (should show 3 policies)
- "Users can view own profile" (SELECT)
- "Users can insert own profile" (INSERT) ← **This must exist**
- "Users can update own profile" (UPDATE)

### Check 2: Trigger (should show 1 trigger)
- `on_auth_user_created` should be listed and enabled

### Check 3: Function (should show function body)
- `handle_new_user` function should exist

## Step 4: Test the Fix

1. **Restart your development server**:
   ```bash
   # Stop the server (Ctrl+C)
   # Then start it again
   npm run dev
   ```

2. **Clear your browser cache** (optional but recommended):
   - Press Ctrl+Shift+Delete
   - Clear cached images and files
   - Or use incognito/private window

3. **Try signing up again**:
   - Use a **new email address** (not one you've used before)
   - Enter a username
   - Enter a password (at least 6 characters)
   - Click "Create Account"

## Step 5: If It Still Doesn't Work

### Check Browser Console

1. Open browser DevTools (F12)
2. Go to "Console" tab
3. Try signing up again
4. Look for any red error messages
5. Copy the error message

### Check Supabase Logs

1. Go to Supabase Dashboard
2. Click "Logs" in left sidebar
3. Click "Postgres Logs"
4. Look for errors related to:
   - `handle_new_user`
   - `profiles` table
   - `INSERT` operations

### Manual Verification

Run these SQL queries to check everything:

```sql
-- Check if policies exist
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check if trigger exists
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Check if function exists
SELECT proname 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Test: Try to see profiles table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';
```

## Common Issues and Solutions

### Issue: "Policy already exists"

**Solution**: This is OK! The `DROP POLICY IF EXISTS` should handle this. Just continue with the test.

### Issue: "Function already exists"

**Solution**: This is OK! The `CREATE OR REPLACE FUNCTION` will update it. Just continue.

### Issue: "Trigger already exists"

**Solution**: This is OK! The `DROP TRIGGER IF EXISTS` will remove the old one and create a new one.

### Issue: "Permission denied"

**Solution**: 
- Make sure you're logged into Supabase
- Make sure you're in the correct project
- Try running the queries one at a time instead of all at once

### Issue: Still getting "Database error"

**Possible Causes**:

1. **Migration not run**: The initial migration might not have run correctly
   - **Fix**: Run the entire `001_initial_schema.sql` migration again

2. **Table doesn't exist**: The `profiles` table might not exist
   - **Fix**: Check if table exists:
     ```sql
     SELECT * FROM profiles LIMIT 1;
     ```
   - If it fails, run the migration again

3. **RLS is blocking**: Row Level Security might be blocking the insert
   - **Fix**: Make sure the INSERT policy was created (see Step 3 verification)

4. **Trigger is failing**: The trigger function might be throwing an error
   - **Fix**: Check Supabase logs for trigger errors
   - The updated trigger function should handle errors gracefully

## Alternative: Disable Trigger and Use Manual Creation Only

If the trigger is causing issues, you can disable it and rely only on manual profile creation:

```sql
-- Disable the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Make sure INSERT policy exists
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

Then the Auth component will handle profile creation manually (which it already does as a fallback).

## Still Not Working?

If you've tried everything and it's still not working:

1. **Share the exact error message** from browser console
2. **Share the Supabase log errors** (if any)
3. **Check if you can manually insert into profiles**:
   ```sql
   -- This should work (replace with a test UUID)
   INSERT INTO profiles (id, username)
   VALUES ('00000000-0000-0000-0000-000000000000', 'test_user')
   ON CONFLICT (id) DO NOTHING;
   ```

4. **Verify your Supabase project is active**:
   - Check that your project isn't paused
   - Check that you have database access

## Success Criteria

You'll know it's working when:
- ✅ You can sign up with a new email
- ✅ No error messages appear
- ✅ You see "Account created successfully!" message
- ✅ You can sign in with the new account
- ✅ Your profile appears in the `profiles` table in Supabase

## Next Steps After Fix

Once signup is working:
1. Test the full signup flow
2. Verify you can sign in
3. Check that your profile was created correctly
4. Test catching creatures
5. Verify everything works end-to-end

Good luck! 🎮

