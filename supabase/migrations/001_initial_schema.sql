-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_catches INT DEFAULT 0,
  unique_catches INT DEFAULT 0
);

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

-- Active creature spawns (temporary, expire after 15 min)
CREATE TABLE IF NOT EXISTS spawns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creature_type_id INT REFERENCES creature_types(id) ON DELETE CASCADE,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  spawned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '15 minutes',
  in_park BOOLEAN DEFAULT FALSE
);

-- Create spatial index for fast nearby queries
CREATE INDEX IF NOT EXISTS spawns_location_idx ON spawns USING GIST(location);
CREATE INDEX IF NOT EXISTS spawns_expires_at_idx ON spawns(expires_at);

-- User's caught creatures
CREATE TABLE IF NOT EXISTS catches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  creature_type_id INT REFERENCES creature_types(id) ON DELETE CASCADE,
  caught_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  catch_location GEOGRAPHY(POINT, 4326),
  cp_level INT DEFAULT 1 CHECK (cp_level >= 1 AND cp_level <= 100)
);

CREATE INDEX IF NOT EXISTS catches_user_id_idx ON catches(user_id);
CREATE INDEX IF NOT EXISTS catches_creature_type_id_idx ON catches(creature_type_id);
CREATE INDEX IF NOT EXISTS catches_caught_at_idx ON catches(caught_at);

-- Gyms (special locations for RSVP)
CREATE TABLE IF NOT EXISTS gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  booking_url TEXT -- Optional Booking.com integration
);

CREATE INDEX IF NOT EXISTS gyms_location_idx ON gyms USING GIST(location);

-- RSVP system
CREATE TABLE IF NOT EXISTS rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(gym_id, user_id)
);

CREATE INDEX IF NOT EXISTS rsvps_gym_id_idx ON rsvps(gym_id);
CREATE INDEX IF NOT EXISTS rsvps_user_id_idx ON rsvps(user_id);

-- AI recommendation cache
CREATE TABLE IF NOT EXISTS ai_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_type TEXT NOT NULL,
  tip TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Row Level Security (RLS) Policies

-- Profiles: Users can read their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Catches: Users can only read their own catches
ALTER TABLE catches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own catches" ON catches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own catches" ON catches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Spawns: Anyone can view spawns (public data)
ALTER TABLE spawns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view spawns" ON spawns
  FOR SELECT USING (true);

-- Allow authenticated users to insert spawns (for spawn generation)
CREATE POLICY "Authenticated users can insert spawns" ON spawns
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Creature types: Public read access
ALTER TABLE creature_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view creature types" ON creature_types
  FOR SELECT USING (true);

-- Gyms: Public read access
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gyms" ON gyms
  FOR SELECT USING (true);

-- RSVPs: Users can view all RSVPs, but only manage their own
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view RSVPs" ON rsvps
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own RSVPs" ON rsvps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own RSVPs" ON rsvps
  FOR DELETE USING (auth.uid() = user_id);

-- AI tips: Public read access
ALTER TABLE ai_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view AI tips" ON ai_tips
  FOR SELECT USING (true);

-- Seed initial creature types
INSERT INTO creature_types (name, rarity, type, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries) VALUES
  ('Beach Buddy', 'common', 'water', 0.08, 2.0, false, NULL),
  ('Mountain Mite', 'uncommon', 'rock', 0.04, 2.5, false, NULL),
  ('City Slicker', 'common', 'urban', 0.06, 1.5, false, NULL),
  ('Forest Friend', 'uncommon', 'nature', 0.05, 3.0, false, NULL),
  ('Landmark Legend', 'legendary', 'landmark', 0.001, 5.0, true, ARRAY['US', 'FR', 'GB', 'IT', 'JP'])
ON CONFLICT DO NOTHING;

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

-- Cleanup expired spawns (run periodically via cron or scheduled function)
CREATE OR REPLACE FUNCTION cleanup_expired_spawns()
RETURNS VOID AS $$
BEGIN
  DELETE FROM spawns WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

