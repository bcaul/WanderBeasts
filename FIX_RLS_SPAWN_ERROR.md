# Fix RLS Error: "new row violates row-level security policy for table 'spawns'"

## Problem

You're getting this error when trying to generate spawns:
```
Error: new row violates row-level security policy for table "spawns"
```

## Root Cause

The `spawns` table has Row Level Security (RLS) enabled, but there's no INSERT policy that allows users to insert spawns. The current policy only allows SELECT (viewing spawns), not INSERT (creating spawns).

## Quick Fix

Run this SQL in Supabase SQL Editor:

```sql
-- Fix: Allow authenticated users to insert spawns
DROP POLICY IF EXISTS "Authenticated users can insert spawns" ON spawns;

CREATE POLICY "Authenticated users can insert spawns" ON spawns
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

## Step-by-Step Fix

### Step 1: Open Supabase SQL Editor

1. Go to Supabase Dashboard
2. Click "SQL Editor" in left sidebar
3. Click "New query"

### Step 2: Run the Fix SQL

Copy and paste this SQL:

```sql
-- Fix: Allow authenticated users to insert spawns
DROP POLICY IF EXISTS "Authenticated users can insert spawns" ON spawns;

CREATE POLICY "Authenticated users can insert spawns" ON spawns
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

Click "Run"

### Step 3: Verify the Fix

Run this to check the policy was created:

```sql
SELECT * FROM pg_policies WHERE tablename = 'spawns';
```

You should see 2 policies:
1. "Anyone can view spawns" (SELECT)
2. "Authenticated users can insert spawns" (INSERT) ← This should now exist

### Step 4: Test Spawn Generation

1. Refresh your app
2. Click "Generate Spawns" button
3. Check browser console - should see "Successfully inserted X spawns"
4. Creatures should appear on map within 10-15 seconds

## Alternative: Use Database Function (More Secure)

For better security, you can use a database function instead:

```sql
-- Create function to insert spawns with elevated privileges
CREATE OR REPLACE FUNCTION insert_spawn(
  p_creature_type_id INT,
  p_location TEXT,
  p_in_park BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  v_spawn_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  v_expires_at := NOW() + INTERVAL '15 minutes';
  
  INSERT INTO spawns (creature_type_id, location, expires_at, in_park)
  VALUES (
    p_creature_type_id,
    ST_GeogFromText(p_location)::geography,
    v_expires_at,
    p_in_park
  )
  RETURNING id INTO v_spawn_id;
  
  RETURN v_spawn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION insert_spawn TO authenticated;
```

Then update the code to use this function instead of direct INSERT.

## Why This Happens

RLS (Row Level Security) is a PostgreSQL feature that controls who can access what data. By default, when RLS is enabled, no operations are allowed unless explicitly permitted by policies.

The `spawns` table has:
- ✅ SELECT policy ( anyone can view spawns)
- ❌ INSERT policy (missing - this is the problem)

## Security Considerations

The fix allows **any authenticated user** to insert spawns. This is fine for a game where spawns are temporary and expire after 15 minutes.

For better security, you could:
1. Use a database function with SECURITY DEFINER (elevated privileges)
2. Rate limit spawn generation on the backend
3. Validate spawn data before inserting
4. Use a service role key on the server (not in client code)

## Files Updated

1. **`supabase/migrations/001_initial_schema.sql`**: Added INSERT policy
2. **`supabase/migrations/003_fix_spawns_insert_policy.sql`**: New migration with fix
3. **`src/lib/spawning.js`**: Better error handling for RLS errors

## Testing

After running the fix:

1. **Refresh your app**
2. **Click "Generate Spawns" button**
3. **Check browser console**:
   - Should see "Successfully inserted X spawns"
   - No RLS errors
4. **Check database**:
   ```sql
   SELECT COUNT(*) FROM spawns WHERE expires_at > NOW();
   ```
5. **Wait 10-15 seconds** - Creatures should appear on map

## Still Having Issues?

If you're still getting RLS errors:

1. **Verify policy exists**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'spawns' AND cmd = 'INSERT';
   ```

2. **Check if user is authenticated**:
   - Make sure you're signed in
   - Check browser console for auth status

3. **Check RLS is enabled**:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'spawns';
   ```
   Should show `rowsecurity = true`

4. **Try the database function approach** (more secure)

Good luck! 🎮

