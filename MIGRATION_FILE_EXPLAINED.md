# Database Migration File - Line by Line Explanation

This document explains every line of the migration file in detail, so you understand exactly what's happening in your database.

## File: `supabase/migrations/001_initial_schema.sql`

---

## Line 1-2: Enable PostGIS Extension

```sql
-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;
```

**What this does**:
- Enables the PostGIS extension in your PostgreSQL database
- PostGIS adds geospatial capabilities (storing and querying location data)

**Why it's needed**:
- We store creature spawn locations as geographic points (latitude/longitude)
- PostGIS provides functions like `ST_DWithin` (find points within a radius)
- Enables spatial indexing for fast location queries

**What happens if it fails**:
- You'll see an error: "permission denied for extension postgis"
- **Solution**: Enable PostGIS manually in Supabase dashboard (Database → Extensions)

---

## Line 4-11: Create Profiles Table

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_catches INT DEFAULT 0,
  unique_catches INT DEFAULT 0
);
```

**What this does**:
- Creates a `profiles` table to store user information
- Links to Supabase's built-in `auth.users` table

**Column explanations**:
- `id UUID`: Primary key, references `auth.users.id`
  - When a user is deleted from auth, their profile is automatically deleted (`ON DELETE CASCADE`)
- `username TEXT UNIQUE NOT NULL`: User's display name
  - Must be unique (no two users can have the same username)
  - Cannot be null
- `created_at TIMESTAMP WITH TIME ZONE`: When the profile was created
  - Defaults to current timestamp
- `total_catches INT DEFAULT 0`: Total number of creatures caught
  - Starts at 0, incremented when user catches creatures
- `unique_catches INT DEFAULT 0`: Number of unique species caught
  - Starts at 0, recalculated when user catches creatures

**Why separate from auth.users**:
- Supabase's `auth.users` table is managed by Supabase
- We can't add custom columns to it
- `profiles` table extends it with game-specific data

---

## Line 13-25: Create Creature Types Table

```sql
-- Creature types/metadata
CREATE TABLE IF NOT EXISTS creature_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  type TEXT NOT NULL,
  image_url TEXT,
  region_locked BOOLEAN DEFAULT FALSE,
  allowed_countries TEXT[], -- ['US', 'CA', 'MX'] or null for global
  base_spawn_rate FLOAT NOT NULL DEFAULT 0.05,
  park_boost_multiplier FLOAT DEFAULT 2.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**What this does**:
- Defines the different types of creatures in the game
- Stores metadata about each creature type

**Column explanations**:
- `id SERIAL PRIMARY KEY`: Auto-incrementing integer ID
  - Starts at 1, increments automatically
- `name TEXT NOT NULL`: Creature name (e.g., "Beach Buddy")
- `rarity TEXT NOT NULL CHECK (...)`: Creature rarity
  - Must be one of: common, uncommon, rare, epic, legendary
  - CHECK constraint enforces this at the database level
- `type TEXT NOT NULL`: Creature type (e.g., "water", "rock", "urban")
- `image_url TEXT`: URL to creature image (optional, can be null)
- `region_locked BOOLEAN DEFAULT FALSE`: Whether creature is region-specific
  - `false` = spawns globally
  - `true` = only spawns in specific countries
- `allowed_countries TEXT[]`: Array of country codes
  - Example: `['US', 'CA', 'MX']` = spawns in USA, Canada, Mexico
  - `NULL` = spawns globally (when `region_locked = false`)
- `base_spawn_rate FLOAT NOT NULL DEFAULT 0.05`: Base spawn probability
  - 0.05 = 5% chance to spawn per grid cell
  - Higher = more common spawns
- `park_boost_multiplier FLOAT DEFAULT 2.0`: Spawn rate multiplier in parks
  - 2.0 = 2x spawn rate in parks
  - Applies to `base_spawn_rate`
- `created_at TIMESTAMP WITH TIME ZONE`: When creature type was created

**Example row**:
```sql
id: 1
name: "Beach Buddy"
rarity: "common"
type: "water"
image_url: null
region_locked: false
allowed_countries: null
base_spawn_rate: 0.08
park_boost_multiplier: 2.0
created_at: 2024-01-15 10:00:00
```

---

## Line 27-39: Create Spawns Table

```sql
-- Active creature spawns (temporary, expire after 15 min)
CREATE TABLE IF NOT EXISTS spawns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creature_type_id INT REFERENCES creature_types(id) ON DELETE CASCADE,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  spawned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '15 minutes',
  in_park BOOLEAN DEFAULT FALSE
);
```

**What this does**:
- Stores active creature spawns (temporary, expire after 15 minutes)
- Each spawn is a creature that can be caught at a specific location

**Column explanations**:
- `id UUID PRIMARY KEY`: Unique spawn ID
  - Generated automatically using `gen_random_uuid()`
- `creature_type_id INT REFERENCES creature_types(id)`: Which creature type
  - Foreign key to `creature_types` table
  - If creature type is deleted, spawns are deleted (`ON DELETE CASCADE`)
- `location GEOGRAPHY(POINT, 4326) NOT NULL`: Spawn location
  - `GEOGRAPHY(POINT, 4326)` = PostGIS geography point (latitude/longitude)
  - `4326` = WGS84 coordinate system (standard GPS coordinates)
  - Format: `POINT(longitude latitude)` (note: lon comes first!)
- `spawned_at TIMESTAMP WITH TIME ZONE`: When spawn was created
  - Defaults to current timestamp
- `expires_at TIMESTAMP WITH TIME ZONE`: When spawn expires
  - Defaults to 15 minutes after `spawned_at`
  - Used to clean up old spawns
- `in_park BOOLEAN DEFAULT FALSE`: Whether spawn is in a park
  - Used for boosted spawn rates
  - Set to `true` if location is in a park

**Example row**:
```sql
id: 789e4567-e89b-12d3-a456-426614174999
creature_type_id: 1
location: POINT(-73.9857 40.7580)  -- Central Park, NYC
spawned_at: 2024-01-15 10:30:00
expires_at: 2024-01-15 10:45:00
in_park: true
```

**Index creation** (Line 38-39):
```sql
CREATE INDEX IF NOT EXISTS spawns_location_idx ON spawns USING GIST(location);
CREATE INDEX IF NOT EXISTS spawns_expires_at_idx ON spawns(expires_at);
```

**What indexes do**:
- `spawns_location_idx`: Spatial index on location column
  - Makes location queries fast (finding nearby spawns)
  - Uses GIST (Generalized Search Tree) index type
- `spawns_expires_at_idx`: Index on expiration time
  - Makes cleanup queries fast (finding expired spawns)

---

## Line 41-53: Create Catches Table

```sql
-- User's caught creatures
CREATE TABLE IF NOT EXISTS catches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  creature_type_id INT REFERENCES creature_types(id) ON DELETE CASCADE,
  caught_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  catch_location GEOGRAPHY(POINT, 4326),
  cp_level INT DEFAULT 1 CHECK (cp_level >= 1 AND cp_level <= 100)
);
```

**What this does**:
- Records of creatures caught by users
- One row per catch (users can catch the same creature type multiple times)

**Column explanations**:
- `id UUID PRIMARY KEY`: Unique catch ID
- `user_id UUID REFERENCES profiles(id)`: Which user caught it
  - Foreign key to `profiles` table
  - If user is deleted, their catches are deleted (`ON DELETE CASCADE`)
- `creature_type_id INT REFERENCES creature_types(id)`: Which creature was caught
  - Foreign key to `creature_types` table
- `caught_at TIMESTAMP WITH TIME ZONE`: When creature was caught
  - Defaults to current timestamp
- `catch_location GEOGRAPHY(POINT, 4326)`: Where creature was caught
  - Can be null (optional)
  - Stored as PostGIS point
- `cp_level INT DEFAULT 1 CHECK (...)`: Combat Power level
  - Random value between 1 and 100
  - CHECK constraint ensures it's within valid range
  - Higher CP = stronger creature

**Indexes** (Line 51-53):
- `catches_user_id_idx`: Index on user_id (fast queries for user's collection)
- `catches_creature_type_id_idx`: Index on creature_type_id (fast queries by creature type)
- `catches_caught_at_idx`: Index on caught_at (fast sorting by date)

---

## Line 55-65: Create Gyms Table

```sql
-- Gyms (special locations for RSVP)
CREATE TABLE IF NOT EXISTS gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  booking_url TEXT -- Optional Booking.com integration
);
```

**What this does**:
- Stores special locations (gyms) where users can RSVP
- Similar to Pokéstops or Gyms in Pokémon GO

**Column explanations**:
- `id UUID PRIMARY KEY`: Unique gym ID
- `name TEXT NOT NULL`: Gym name (e.g., "Central Park Gym")
- `description TEXT`: Gym description (optional, can be null)
- `location GEOGRAPHY(POINT, 4326) NOT NULL`: Gym location
  - Required (NOT NULL)
  - Stored as PostGIS point
- `created_at TIMESTAMP WITH TIME ZONE`: When gym was created
- `booking_url TEXT`: Optional URL to book accommodation
  - Can be null
  - Could link to Booking.com or similar

**Index** (Line 65):
- `gyms_location_idx`: Spatial index for fast location queries

---

## Line 67-77: Create RSVPs Table

```sql
-- RSVP system
CREATE TABLE IF NOT EXISTS rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(gym_id, user_id)
);
```

**What this does**:
- Tracks which users RSVPed to which gyms
- One RSVP per user per gym (enforced by UNIQUE constraint)

**Column explanations**:
- `id UUID PRIMARY KEY`: Unique RSVP ID
- `gym_id UUID REFERENCES gyms(id)`: Which gym
  - Foreign key to `gyms` table
- `user_id UUID REFERENCES profiles(id)`: Which user
  - Foreign key to `profiles` table
- `created_at TIMESTAMP WITH TIME ZONE`: When RSVP was created
- `UNIQUE(gym_id, user_id)`: Constraint ensures one RSVP per user per gym
  - Prevents duplicate RSVPs
  - If user tries to RSVP twice, database will reject it

**Indexes** (Line 76-77):
- `rsvps_gym_id_idx`: Index for fast queries by gym
- `rsvps_user_id_idx`: Index for fast queries by user

---

## Line 79-85: Create AI Tips Table

```sql
-- AI recommendation cache
CREATE TABLE IF NOT EXISTS ai_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_type TEXT NOT NULL,
  tip TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**What this does**:
- Caches AI-generated hunting recommendations
- Reduces API calls to Gemini (saves quota and improves performance)

**Column explanations**:
- `id UUID PRIMARY KEY`: Unique tip ID
- `location_type TEXT NOT NULL`: Location category (e.g., "beach", "mountain")
  - Used as cache key
- `tip TEXT NOT NULL`: The AI-generated tip text
- `created_at TIMESTAMP WITH TIME ZONE`: When tip was created
  - Used to determine if tip is stale (expires after 30 min in code)

**Note**: This table is created but not heavily used in the current implementation (caching is done in JavaScript). It's available for future use.

---

## Line 87-126: Create get_nearby_spawns Function

```sql
-- Function to get nearby spawns (PostGIS query)
CREATE OR REPLACE FUNCTION get_nearby_spawns(
  user_lat FLOAT,
  user_lon FLOAT,
  radius_meters FLOAT DEFAULT 500
)
RETURNS TABLE (
  id UUID,
  creature_type_id INT,
  location GEOGRAPHY,
  spawned_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  in_park BOOLEAN,
  distance_meters FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.creature_type_id,
    s.location,
    s.spawned_at,
    s.expires_at,
    s.in_park,
    ST_Distance(
      s.location::geography,
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
    ) AS distance_meters
  FROM spawns s
  WHERE
    ST_DWithin(
      s.location::geography,
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
      radius_meters
    )
    AND s.expires_at > NOW()
  ORDER BY distance_meters ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;
```

**What this does**:
- Finds all spawns within a radius of the user's location
- Uses PostGIS for efficient spatial queries
- Returns spawns sorted by distance (closest first)

**Parameter explanations**:
- `user_lat FLOAT`: User's latitude
- `user_lon FLOAT`: User's longitude
- `radius_meters FLOAT DEFAULT 500`: Search radius in meters (default 500m)

**Function logic**:
1. **Creates user location point**: `ST_MakePoint(user_lon, user_lat)`
   - Creates a PostGIS point from coordinates
   - Note: longitude comes first!
2. **Sets coordinate system**: `ST_SetSRID(..., 4326)`
   - 4326 = WGS84 (standard GPS coordinates)
3. **Converts to geography**: `::geography`
   - Geography type uses meters for distance calculations
   - More accurate than geometry for real-world distances
4. **Finds nearby spawns**: `ST_DWithin(...)`
   - Returns all points within `radius_meters` of user location
   - Uses spatial index for fast queries
5. **Filters expired spawns**: `AND s.expires_at > NOW()`
   - Only returns spawns that haven't expired
6. **Calculates distance**: `ST_Distance(...)`
   - Calculates distance in meters
   - Included in results for sorting
7. **Sorts by distance**: `ORDER BY distance_meters ASC`
   - Closest spawns first
8. **Limits results**: `LIMIT 50`
   - Returns maximum 50 spawns (prevents too many results)

**How it's called** (from JavaScript):
```javascript
const { data } = await supabase.rpc('get_nearby_spawns', {
  user_lat: 40.7580,
  user_lon: -73.9857,
  radius_meters: 500
});
```

---

## Line 128-144: Create increment_catches Function

```sql
-- Function to increment user catch stats
CREATE OR REPLACE FUNCTION increment_catches(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET total_catches = total_catches + 1
  WHERE id = user_id;

  UPDATE profiles
  SET unique_catches = (
    SELECT COUNT(DISTINCT creature_type_id)
    FROM catches
    WHERE catches.user_id = user_id
  )
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;
```

**What this does**:
- Updates user statistics after catching a creature
- Increments total catches count
- Recalculates unique species count

**Function logic**:
1. **Increment total_catches**: Adds 1 to `total_catches` counter
2. **Recalculate unique_catches**: Counts distinct creature types caught
   - Uses `COUNT(DISTINCT creature_type_id)` to count unique species
   - Updates `unique_catches` with the count

**Why use a function**:
- Ensures stats are always accurate
- Atomic operation (both updates happen together)
- Can be called from multiple places (catch modal, API, etc.)

**How it's called** (from JavaScript):
```javascript
await supabase.rpc('increment_catches', { user_id: userId });
```

---

## Line 146-200: Row Level Security (RLS) Policies

RLS ensures users can only access data they're allowed to see.

### Profiles Policies (Line 148-155)

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

**What this does**:
- Enables RLS on `profiles` table
- Users can only SELECT their own profile (`auth.uid() = id`)
- Users can only UPDATE their own profile

**How it works**:
- `auth.uid()` returns the current user's ID (from Supabase Auth)
- Policy checks if user's ID matches the row's ID
- Only matching rows are returned/updated

### Catches Policies (Line 157-164)

```sql
ALTER TABLE catches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own catches" ON catches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own catches" ON catches
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

**What this does**:
- Users can only see their own catches
- Users can only insert catches for themselves

**Security**: Prevents users from seeing or modifying other users' catches.

### Spawns Policies (Line 166-170)

```sql
ALTER TABLE spawns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view spawns" ON spawns
  FOR SELECT USING (true);
```

**What this does**:
- Spawns are public (anyone can see them)
- `USING (true)` means no restrictions

**Why public**: Spawns are temporary and location-based. Everyone should see the same spawns at the same location.

### Creature Types Policies (Line 172-176)

```sql
ALTER TABLE creature_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view creature types" ON creature_types
  FOR SELECT USING (true);
```

**What this does**:
- Creature types are public (anyone can see them)
- Needed for displaying creature information in the app

### Gyms Policies (Line 178-182)

```sql
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gyms" ON gyms
  FOR SELECT USING (true);
```

**What this does**:
- Gyms are public (anyone can see them)
- Needed for displaying gyms on the map

### RSVPs Policies (Line 184-194)

```sql
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view RSVPs" ON rsvps
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own RSVPs" ON rsvps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own RSVPs" ON rsvps
  FOR DELETE USING (auth.uid() = user_id);
```

**What this does**:
- Anyone can view RSVPs (to show RSVP counts)
- Users can only create RSVPs for themselves
- Users can only delete their own RSVPs

### AI Tips Policies (Line 196-200)

```sql
ALTER TABLE ai_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view AI tips" ON ai_tips
  FOR SELECT USING (true);
```

**What this does**:
- AI tips are public (anyone can see them)
- Cached recommendations can be shared

---

## Line 202-209: Seed Initial Creature Types

```sql
-- Seed initial creature types
INSERT INTO creature_types (name, rarity, type, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries) VALUES
  ('Beach Buddy', 'common', 'water', 0.08, 2.0, false, NULL),
  ('Mountain Mite', 'uncommon', 'rock', 0.04, 2.5, false, NULL),
  ('City Slicker', 'common', 'urban', 0.06, 1.5, false, NULL),
  ('Forest Friend', 'uncommon', 'nature', 0.05, 3.0, false, NULL),
  ('Landmark Legend', 'legendary', 'landmark', 0.001, 5.0, true, ARRAY['US', 'FR', 'GB', 'IT', 'JP'])
ON CONFLICT DO NOTHING;
```

**What this does**:
- Inserts 5 initial creature types into the database
- `ON CONFLICT DO NOTHING` prevents errors if creatures already exist

**Creature details**:
1. **Beach Buddy**: Common water type, 8% spawn rate, 2x park boost
2. **Mountain Mite**: Uncommon rock type, 4% spawn rate, 2.5x park boost
3. **City Slicker**: Common urban type, 6% spawn rate, 1.5x park boost
4. **Forest Friend**: Uncommon nature type, 5% spawn rate, 3x park boost
5. **Landmark Legend**: Legendary landmark type, 0.1% spawn rate, 5x park boost, region-locked to US, FR, GB, IT, JP

---

## Line 211-228: Create handle_new_user Function and Trigger

```sql
-- Create a function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**What this does**:
- Automatically creates a profile when a user signs up
- Trigger fires after a new user is inserted into `auth.users`

**Function logic**:
1. **Gets username**: Tries to get username from `raw_user_meta_data`
2. **Fallback**: If no username, generates one from user ID (e.g., "user_12345678")
3. **Creates profile**: Inserts row into `profiles` table

**Trigger**:
- `AFTER INSERT ON auth.users`: Fires after user is created
- `FOR EACH ROW`: Executes for each new user
- `EXECUTE FUNCTION handle_new_user()`: Calls the function

**Note**: In our current implementation, we also create the profile manually in the Auth component. This trigger serves as a backup. You can remove the manual profile creation if you prefer to rely on the trigger.

---

## Line 230-236: Create cleanup_expired_spawns Function

```sql
-- Cleanup expired spawns (run periodically via cron or scheduled function)
CREATE OR REPLACE FUNCTION cleanup_expired_spawns()
RETURNS VOID AS $$
BEGIN
  DELETE FROM spawns WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

**What this does**:
- Deletes expired spawns from the database
- Should be run periodically (via cron job or Supabase Edge Function)

**Function logic**:
- Deletes all spawns where `expires_at < NOW()`
- Removes old spawns that are no longer valid

**How to run**:
- **Manual**: Run in SQL Editor: `SELECT cleanup_expired_spawns();`
- **Automated**: Set up a Supabase Edge Function or cron job to run it every 15 minutes

**Note**: In practice, expired spawns are also filtered out in queries (`WHERE expires_at > NOW()`), so cleanup is mainly for database maintenance.

---

## Summary

This migration file sets up:
- ✅ PostGIS extension for geospatial queries
- ✅ 7 tables (profiles, creature_types, spawns, catches, gyms, rsvps, ai_tips)
- ✅ Indexes for performance
- ✅ 3 functions (get_nearby_spawns, increment_catches, cleanup_expired_spawns)
- ✅ RLS policies for security
- ✅ Seed data (5 creature types)
- ✅ Trigger for auto-creating profiles

All of this is necessary for the WanderBeasts app to function correctly!

