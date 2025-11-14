-- Migration: Limit gyms to only one creature at a time
-- This ensures each gym only has one active creature spawn

-- Update initialize_gym_creatures to spawn only 1 creature
CREATE OR REPLACE FUNCTION initialize_gym_creatures()
RETURNS VOID AS $$
DECLARE
  gym_record RECORD;
  gym_location GEOGRAPHY;
  spawn_lat FLOAT;
  spawn_lon FLOAT;
  creature_record RECORD;
  existing_spawn_count INTEGER;
BEGIN
  -- Loop through all gyms
  FOR gym_record IN
    SELECT id, name, location
    FROM gyms
  LOOP
    -- Get gym location
    gym_location := gym_record.location;
    
    -- Extract lat/lon from geography point
    SELECT ST_Y(gym_location::geometry), ST_X(gym_location::geometry)
    INTO spawn_lat, spawn_lon;
    
    -- Check if gym already has active spawns
    SELECT COUNT(*) INTO existing_spawn_count
    FROM spawns
    WHERE gym_id = gym_record.id
      AND expires_at > NOW();
    
    -- Only initialize if gym has no active spawns
    IF existing_spawn_count = 0 THEN
      -- Get 1 random epic/legendary creature
      FOR creature_record IN
        SELECT id, name, rarity
        FROM creature_types
        WHERE rarity IN ('epic', 'legendary')
        ORDER BY RANDOM()
        LIMIT 1
      LOOP
        -- Create spawn at gym location
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
            ST_MakePoint(spawn_lon, spawn_lat), -- No random offset - spawn exactly at gym
            4326
          ),
          gym_record.id,
          FALSE,
          NOW() + INTERVAL '24 hours' -- Gym spawns last 24 hours
        )
        ON CONFLICT DO NOTHING;
      END LOOP;
      
      RAISE NOTICE 'Initialized creature for gym: %', gym_record.name;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update refresh_gym_creatures to ensure only 1 creature per gym
CREATE OR REPLACE FUNCTION refresh_gym_creatures()
RETURNS VOID AS $$
DECLARE
  gym_record RECORD;
  gym_location GEOGRAPHY;
  spawn_lat FLOAT;
  spawn_lon FLOAT;
  creature_record RECORD;
  active_spawn_count INTEGER;
BEGIN
  -- Loop through all gyms
  FOR gym_record IN
    SELECT id, name, location
    FROM gyms
  LOOP
    -- Get gym location
    gym_location := gym_record.location;
    
    -- Extract lat/lon from geography point
    SELECT ST_Y(gym_location::geometry), ST_X(gym_location::geometry)
    INTO spawn_lat, spawn_lon;
    
    -- Count active spawns
    SELECT COUNT(*) INTO active_spawn_count
    FROM spawns
    WHERE gym_id = gym_record.id
      AND expires_at > NOW();
    
    -- If gym has 0 creatures, add 1
    IF active_spawn_count = 0 THEN
      -- Get 1 random epic/legendary creature
      FOR creature_record IN
        SELECT id, name, rarity
        FROM creature_types
        WHERE rarity IN ('epic', 'legendary')
        ORDER BY RANDOM()
        LIMIT 1
      LOOP
        -- Create spawn at gym location
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
            ST_MakePoint(spawn_lon, spawn_lat), -- No random offset - spawn exactly at gym
            4326
          ),
          gym_record.id,
          FALSE,
          NOW() + INTERVAL '24 hours'
        );
      END LOOP;
    ELSIF active_spawn_count > 1 THEN
      -- If gym has more than 1 creature, delete all but the most recent one
      DELETE FROM spawns
      WHERE gym_id = gym_record.id
        AND expires_at > NOW()
        AND id NOT IN (
          SELECT id
          FROM spawns
          WHERE gym_id = gym_record.id
            AND expires_at > NOW()
          ORDER BY spawned_at DESC
          LIMIT 1
        );
      
      RAISE NOTICE 'Cleaned up extra spawns for gym: %', gym_record.name;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update spawn_gym_creatures to spawn only 1 creature per gym
CREATE OR REPLACE FUNCTION spawn_gym_creatures(
  p_gym_id UUID,
  creature_count INT DEFAULT 1 -- Changed default from 3 to 1
)
RETURNS INTEGER AS $$
DECLARE
  gym_location GEOGRAPHY;
  spawn_count INTEGER := 0;
  creature_record RECORD;
  spawn_lat FLOAT;
  spawn_lon FLOAT;
  existing_count INTEGER;
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
  
  -- Count existing active spawns
  SELECT COUNT(*) INTO existing_count
  FROM spawns
  WHERE gym_id = p_gym_id
    AND expires_at > NOW();
  
  -- If we already have 1 or more spawns, just extend their expiration
  IF existing_count >= 1 THEN
    -- Update only the most recent spawn (using subquery since UPDATE doesn't support ORDER BY/LIMIT directly)
    UPDATE spawns
    SET expires_at = NOW() + INTERVAL '24 hours'
    WHERE id = (
      SELECT id
      FROM spawns
      WHERE gym_id = p_gym_id
        AND expires_at > NOW()
      ORDER BY spawned_at DESC
      LIMIT 1
    );
    
    -- Delete any extra spawns if they exist
    DELETE FROM spawns
    WHERE gym_id = p_gym_id
      AND expires_at > NOW()
      AND id NOT IN (
        SELECT id
        FROM spawns
        WHERE gym_id = p_gym_id
          AND expires_at > NOW()
        ORDER BY spawned_at DESC
        LIMIT 1
      );
    
    RETURN 1;
  END IF;
  
  -- Get 1 epic or legendary creature (ignore creature_count parameter to ensure only 1)
  FOR creature_record IN
    SELECT id, name, rarity
    FROM creature_types
    WHERE rarity IN ('epic', 'legendary')
    ORDER BY RANDOM()
    LIMIT 1
  LOOP
    -- Spawn creature at gym location (no random offset - spawn exactly at gym)
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
        ST_MakePoint(spawn_lon, spawn_lat), -- No random offset
        4326
      ),
      p_gym_id,
      FALSE, -- Gym spawns are not park spawns
      NOW() + INTERVAL '24 hours' -- Gym spawns last 24 hours
    );
    
    spawn_count := spawn_count + 1;
  END LOOP;
  
  RETURN spawn_count;
END;
$$ LANGUAGE plpgsql;

-- Update check_and_spawn_gym_creatures to spawn only 1 creature
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
    WHERE spawns.gym_id = gym_record.id
      AND spawns.spawned_at > NOW() - INTERVAL '1 hour';
    
    -- If 5+ players and no recent spawns, create spawns
    IF player_count >= 5 AND (last_spawn_check IS NULL OR last_spawn_check < NOW() - INTERVAL '1 hour') THEN
      -- Spawn only 1 epic/legendary creature (changed from 3 to 1)
      SELECT spawn_gym_creatures(gym_record.id, 1) INTO spawns_created;
      
      -- Return result
      gym_id := gym_record.id;
      gym_name := gym_record.name;
      spawns_created := spawns_created;
      
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Clean up any existing gyms with multiple spawns (keep only the most recent)
DO $$
DECLARE
  gym_record RECORD;
  spawn_count INTEGER;
BEGIN
  FOR gym_record IN
    SELECT id, name
    FROM gyms
  LOOP
    -- Count spawns for this gym
    SELECT COUNT(*) INTO spawn_count
    FROM spawns
    WHERE gym_id = gym_record.id
      AND expires_at > NOW();
    
    -- If more than 1 spawn, delete extras (keep most recent)
    IF spawn_count > 1 THEN
      DELETE FROM spawns
      WHERE gym_id = gym_record.id
        AND expires_at > NOW()
        AND id NOT IN (
          SELECT id
          FROM spawns
          WHERE gym_id = gym_record.id
            AND expires_at > NOW()
          ORDER BY spawned_at DESC
          LIMIT 1
        );
      
      RAISE NOTICE 'Cleaned up % gym spawns for gym: %', spawn_count - 1, gym_record.name;
    END IF;
  END LOOP;
END $$;

