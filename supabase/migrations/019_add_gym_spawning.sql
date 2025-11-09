-- Migration: Add gym spawning system for epic/legendary creatures
-- This allows epic and legendary creatures to spawn at gyms when 5+ players are present

-- Add gym_id to spawns table (optional, to track gym-specific spawns)
ALTER TABLE spawns ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id) ON DELETE SET NULL;

-- Create index for gym_id lookups
CREATE INDEX IF NOT EXISTS spawns_gym_id_idx ON spawns(gym_id) WHERE gym_id IS NOT NULL;

-- Add a table to track player locations at gyms (for real-time tracking)
CREATE TABLE IF NOT EXISTS gym_player_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(gym_id, user_id)
);

CREATE INDEX IF NOT EXISTS gym_player_locations_gym_id_idx ON gym_player_locations(gym_id);
CREATE INDEX IF NOT EXISTS gym_player_locations_user_id_idx ON gym_player_locations(user_id);
CREATE INDEX IF NOT EXISTS gym_player_locations_last_seen_idx ON gym_player_locations(last_seen);
CREATE INDEX IF NOT EXISTS gym_player_locations_location_idx ON gym_player_locations USING GIST(location);

-- Enable RLS on gym_player_locations
ALTER TABLE gym_player_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view gym player locations" ON gym_player_locations
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own gym player location" ON gym_player_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gym player location" ON gym_player_locations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gym player location" ON gym_player_locations
  FOR DELETE USING (auth.uid() = user_id);

-- Function to get players near a gym (within radius)
CREATE OR REPLACE FUNCTION get_players_near_gym(
  p_gym_id UUID,
  radius_meters FLOAT DEFAULT 100
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  distance_meters FLOAT,
  last_seen TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gpl.user_id,
    p.username,
    ST_Distance(
      gpl.location::geography,
      g.location::geography
    ) AS distance_meters,
    gpl.last_seen
  FROM gym_player_locations gpl
  JOIN gyms g ON g.id = gpl.gym_id
  JOIN profiles p ON p.id = gpl.user_id
  WHERE 
    gpl.gym_id = p_gym_id
    AND ST_DWithin(
      gpl.location::geography,
      g.location::geography,
      radius_meters
    )
    AND gpl.last_seen > NOW() - INTERVAL '5 minutes' -- Only count active players (seen in last 5 minutes)
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to count players at a gym
CREATE OR REPLACE FUNCTION count_players_at_gym(
  p_gym_id UUID,
  radius_meters FLOAT DEFAULT 100
)
RETURNS INTEGER AS $$
DECLARE
  player_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO player_count
  FROM gym_player_locations gpl
  JOIN gyms g ON g.id = gpl.gym_id
  WHERE 
    gpl.gym_id = p_gym_id
    AND ST_DWithin(
      gpl.location::geography,
      g.location::geography,
      radius_meters
    )
    AND gpl.last_seen > NOW() - INTERVAL '5 minutes';
  
  RETURN player_count;
END;
$$ LANGUAGE plpgsql;

-- Function to spawn epic/legendary creatures at a gym
CREATE OR REPLACE FUNCTION spawn_gym_creatures(
  p_gym_id UUID,
  creature_count INT DEFAULT 3
)
RETURNS INTEGER AS $$
DECLARE
  gym_location GEOGRAPHY;
  spawn_count INTEGER := 0;
  creature_record RECORD;
  spawn_lat FLOAT;
  spawn_lon FLOAT;
BEGIN
  -- Get gym location
  SELECT location INTO gym_location
  FROM gyms
  WHERE id = p_gym_id;
  
  IF gym_location IS NULL THEN
    RAISE EXCEPTION 'Gym not found';
  END IF;
  
  -- Extract lat/lon from geography point
  SELECT ST_Y(gym_location::geometry), ST_X(gym_location::geometry)
  INTO spawn_lat, spawn_lon;
  
  -- Get epic and legendary creatures
  FOR creature_record IN
    SELECT id, name, rarity
    FROM creature_types
    WHERE rarity IN ('epic', 'legendary')
    ORDER BY RANDOM()
    LIMIT creature_count
  LOOP
    -- Spawn creature at gym location (with small random offset for variety)
    INSERT INTO spawns (
      creature_type_id,
      location,
      gym_id,
      in_park,
      expires_at
    )
    VALUES (
      creature_record.id,
      ST_SetSRID(
        ST_MakePoint(
          spawn_lon + (RANDOM() - 0.5) * 0.0001, -- Small random offset (~10m)
          spawn_lat + (RANDOM() - 0.5) * 0.0001
        ),
        4326
      ),
      p_gym_id,
      FALSE, -- Gym spawns are not park spawns
      NOW() + INTERVAL '30 minutes' -- Gym spawns last longer (30 minutes)
    );
    
    spawn_count := spawn_count + 1;
  END LOOP;
  
  RETURN spawn_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check and spawn at gyms with 5+ players
CREATE OR REPLACE FUNCTION check_and_spawn_gym_creatures()
RETURNS TABLE (
  gym_id UUID,
  gym_name TEXT,
  player_count INTEGER,
  spawns_created INTEGER
) AS $$
DECLARE
  gym_record RECORD;
  player_count INTEGER;
  spawns_created INTEGER;
  last_spawn_check TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check all gyms
  FOR gym_record IN
    SELECT id, name
    FROM gyms
  LOOP
    -- Count players at this gym
    SELECT count_players_at_gym(gym_record.id, 100) INTO player_count;
    
    -- Check if we've spawned recently (avoid spam)
    SELECT MAX(spawned_at) INTO last_spawn_check
    FROM spawns
    WHERE gym_id = gym_record.id
      AND spawned_at > NOW() - INTERVAL '1 hour';
    
    -- If 5+ players and no recent spawns, create spawns
    IF player_count >= 5 AND (last_spawn_check IS NULL OR last_spawn_check < NOW() - INTERVAL '1 hour') THEN
      -- Spawn epic/legendary creatures
      SELECT spawn_gym_creatures(gym_record.id, 3) INTO spawns_created;
      
      -- Return result
      gym_id := gym_record.id;
      gym_name := gym_record.name;
      spawns_created := spawns_created;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to update player location at gym
CREATE OR REPLACE FUNCTION update_player_gym_location(
  p_gym_id UUID,
  p_user_id UUID,
  p_latitude FLOAT,
  p_longitude FLOAT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO gym_player_locations (gym_id, user_id, location, last_seen)
  VALUES (
    p_gym_id,
    p_user_id,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326),
    NOW()
  )
  ON CONFLICT (gym_id, user_id)
  DO UPDATE SET
    location = ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326),
    last_seen = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get nearby gyms with PostGIS
CREATE OR REPLACE FUNCTION get_nearby_gyms(
  user_lat FLOAT,
  user_lon FLOAT,
  radius_meters FLOAT DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  location GEOGRAPHY,
  created_at TIMESTAMP WITH TIME ZONE,
  booking_url TEXT,
  distance_meters FLOAT,
  rsvp_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.description,
    g.location,
    g.created_at,
    g.booking_url,
    ST_Distance(
      g.location::geography,
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
    ) AS distance_meters,
    COUNT(r.id) AS rsvp_count
  FROM gyms g
  LEFT JOIN rsvps r ON r.gym_id = g.id
  WHERE
    ST_DWithin(
      g.location::geography,
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
      radius_meters
    )
  GROUP BY g.id, g.name, g.description, g.location, g.created_at, g.booking_url
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old player location data (players not seen in 10 minutes)
CREATE OR REPLACE FUNCTION cleanup_old_gym_locations()
RETURNS VOID AS $$
BEGIN
  DELETE FROM gym_player_locations
  WHERE last_seen < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;

