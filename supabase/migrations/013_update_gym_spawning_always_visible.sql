-- Update gym spawning system:
-- 1. Always spawn epic/legendary creatures at gyms (they're visible but locked)
-- 2. Creatures can only be caught when 5+ players are present
-- 3. Add a function to initialize gym creatures

-- Function to initialize epic/legendary creatures at all gyms
-- This creates persistent spawns that are always visible but locked until 5+ players
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
      -- Get 2-3 random epic/legendary creatures
      FOR creature_record IN
        SELECT id, name, rarity
        FROM creature_types
        WHERE rarity IN ('epic', 'legendary')
        ORDER BY RANDOM()
        LIMIT 3
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
            ST_MakePoint(
              spawn_lon + (RANDOM() - 0.5) * 0.0001, -- Small random offset (~10m)
              spawn_lat + (RANDOM() - 0.5) * 0.0001
            ),
            4326
          ),
          gym_record.id,
          FALSE,
          NOW() + INTERVAL '24 hours' -- Gym spawns last 24 hours (longer than regular spawns)
        )
        ON CONFLICT DO NOTHING;
      END LOOP;
      
      RAISE NOTICE 'Initialized creatures for gym: %', gym_record.name;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh gym creatures (call periodically to ensure gyms always have creatures)
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
    
    -- If gym has fewer than 2 active spawns, add more
    IF active_spawn_count < 2 THEN
      -- Get random epic/legendary creatures
      FOR creature_record IN
        SELECT id, name, rarity
        FROM creature_types
        WHERE rarity IN ('epic', 'legendary')
        ORDER BY RANDOM()
        LIMIT (3 - active_spawn_count)
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
            ST_MakePoint(
              spawn_lon + (RANDOM() - 0.5) * 0.0001,
              spawn_lat + (RANDOM() - 0.5) * 0.0001
            ),
            4326
          ),
          gym_record.id,
          FALSE,
          NOW() + INTERVAL '24 hours'
        );
      END LOOP;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update the spawn_gym_creatures function to extend expiration instead of creating new ones
-- when creatures already exist
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
  
  -- If we already have enough spawns, just extend their expiration
  IF existing_count >= creature_count THEN
    UPDATE spawns
    SET expires_at = NOW() + INTERVAL '24 hours'
    WHERE gym_id = p_gym_id
      AND expires_at > NOW();
    RETURN existing_count;
  END IF;
  
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
      NOW() + INTERVAL '24 hours' -- Gym spawns last 24 hours
    );
    
    spawn_count := spawn_count + 1;
  END LOOP;
  
  RETURN spawn_count;
END;
$$ LANGUAGE plpgsql;

-- Initialize creatures for all existing gyms
SELECT initialize_gym_creatures();

