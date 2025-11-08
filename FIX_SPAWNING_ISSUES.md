# Fixing Creature Spawning Issues

## Problem

No creatures are spawning on the map.

## Common Causes

1. **Spawns only generate every 5 minutes** - You might need to wait
2. **Low spawn chance** - Only 5% chance per grid cell
3. **No creature types in database** - Migration might not have seeded data
4. **PostGIS issues** - Location queries might be failing
5. **Database connection issues** - Spawns might not be inserting
6. **Location tracking issues** - Spawns generate based on user location

## Quick Fixes

### Fix 1: Check if Creature Types Exist

Run this in Supabase SQL Editor:

```sql
-- Check if creature types exist
SELECT * FROM creature_types;

-- Should return 5 rows (Beach Buddy, Mountain Mite, etc.)
-- If empty, run the seed data again:
INSERT INTO creature_types (name, rarity, type, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries) VALUES
  ('Beach Buddy', 'common', 'water', 0.08, 2.0, false, NULL),
  ('Mountain Mite', 'uncommon', 'rock', 0.04, 2.5, false, NULL),
  ('City Slicker', 'common', 'urban', 0.06, 1.5, false, NULL),
  ('Forest Friend', 'uncommon', 'nature', 0.05, 3.0, false, NULL),
  ('Landmark Legend', 'legendary', 'landmark', 0.001, 5.0, true, ARRAY['US', 'FR', 'GB', 'IT', 'JP'])
ON CONFLICT DO NOTHING;
```

### Fix 2: Check if Spawns Table is Working

```sql
-- Check existing spawns
SELECT 
  s.*,
  ct.name as creature_name,
  ct.rarity
FROM spawns s
LEFT JOIN creature_types ct ON s.creature_type_id = ct.id
WHERE s.expires_at > NOW()
ORDER BY s.spawned_at DESC
LIMIT 10;

-- Check if PostGIS is working
SELECT PostGIS_Version();

-- Test creating a spawn manually
INSERT INTO spawns (creature_type_id, location, expires_at)
VALUES (
  1,  -- Replace with actual creature_type_id
  ST_SetSRID(ST_MakePoint(-73.9857, 40.7580), 4326)::geography,
  NOW() + INTERVAL '15 minutes'
);
```

### Fix 3: Use Manual Spawn Button

The app now has a "Generate Spawns" button in the bottom-right corner:
1. Make sure your location is tracked (blue dot on map)
2. Click "Generate Spawns" button
3. Check browser console for logs
4. Wait a few seconds for spawns to appear

### Fix 4: Increase Spawn Rate (For Testing)

The spawn rate has been increased to 20% per cell (from 5%) for easier testing. If you want to change it back:

Edit `src/lib/spawning.js`:
```javascript
// Change this line:
let spawnChance = 0.20  // Current (20% for testing)
// To:
let spawnChance = 0.05  // Original (5% for production)
```

### Fix 5: Check Browser Console

Open browser DevTools (F12) and check the Console tab for:
- "Generating spawns for location: ..." messages
- "Generated X spawns" messages
- Any error messages
- Database connection errors

### Fix 6: Verify Location is Working

1. Check that the blue dot appears on the map (your location)
2. Check browser console for location coordinates
3. Make sure location permissions are granted
4. Try refreshing the page

## Step-by-Step Troubleshooting

### Step 1: Verify Database Setup

1. **Check creature_types table**:
   ```sql
   SELECT COUNT(*) FROM creature_types;
   -- Should return 5
   ```

2. **Check spawns table exists**:
   ```sql
   SELECT COUNT(*) FROM spawns;
   ```

3. **Check PostGIS is enabled**:
   ```sql
   SELECT PostGIS_Version();
   -- Should return version number
   ```

### Step 2: Test Spawn Generation

1. **Open browser console** (F12)
2. **Check for errors** when map loads
3. **Look for spawn generation logs**:
   - "Generating spawns for location: ..."
   - "Generated X spawns"
   - Any error messages

### Step 3: Check Spawns in Database

1. **Go to Supabase Dashboard** → Table Editor → `spawns`
2. **Check if any spawns exist**
3. **Check if they're expired** (`expires_at < NOW()`)
4. **Check if location is valid** (not null)

### Step 4: Test Manual Spawn Generation

1. **Click "Generate Spawns" button** on the map
2. **Check browser console** for logs
3. **Check database** for new spawns
4. **Wait a few seconds** for spawns to appear on map

### Step 5: Verify Location Queries

The app queries for nearby spawns. Check if the query is working:

```sql
-- Test the RPC function (if it exists)
SELECT * FROM get_nearby_spawns(40.7580, -73.9857, 500);

-- Or test manually
SELECT 
  s.*,
  ST_Distance(
    s.location::geography,
    ST_SetSRID(ST_MakePoint(-73.9857, 40.7580), 4326)::geography
  ) as distance_meters
FROM spawns s
WHERE 
  ST_DWithin(
    s.location::geography,
    ST_SetSRID(ST_MakePoint(-73.9857, 40.7580), 4326)::geography,
    500
  )
  AND s.expires_at > NOW();
```

## Changes Made

1. **Increased spawn rate** from 5% to 20% per cell (for testing)
2. **Added immediate spawn generation** on location change
3. **Reduced spawn interval** from 5 minutes to 2 minutes
4. **Added manual spawn button** for testing
5. **Added debug logging** to console
6. **Added spawn status display** on map
7. **Better error handling** and logging

## Testing

1. **Refresh the page** - Spawns should generate immediately
2. **Wait 30 seconds** - Spawns should appear on map
3. **Click "Generate Spawns"** - Manually trigger spawn generation
4. **Check browser console** - Look for spawn generation logs
5. **Check database** - Verify spawns are being created

## Expected Behavior

After the fixes:
- Spawns generate immediately when location is detected
- Spawns generate every 2 minutes automatically
- Manual spawn button works for testing
- Console shows detailed logging
- Spawn status is displayed on map

## If Still Not Working

1. **Check browser console** for specific errors
2. **Check Supabase logs** for database errors
3. **Verify creature_types exist** in database
4. **Verify PostGIS is enabled**
5. **Check location is being tracked** (blue dot on map)
6. **Try the manual spawn button**
7. **Check network tab** for failed API requests

## Production Considerations

For production, you might want to:
1. **Reduce spawn rate** back to 5-10%
2. **Increase spawn interval** back to 5 minutes
3. **Remove manual spawn button** (or make it admin-only)
4. **Add rate limiting** to prevent spam
5. **Optimize spawn generation** for performance

Good luck! 🎮

