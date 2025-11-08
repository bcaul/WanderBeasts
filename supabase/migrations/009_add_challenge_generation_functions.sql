-- ============================================================================
-- Challenge Generation Migration
-- This migration creates functions for generating challenges dynamically
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: Create challenge near a park location
-- Used by the application to dynamically create challenges at park locations
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_challenge_near_park(
  p_park_name TEXT,
  p_park_lat FLOAT,
  p_park_lon FLOAT,
  p_challenge_type TEXT DEFAULT 'collect',
  p_creature_type_name TEXT DEFAULT NULL,
  p_target_value INT DEFAULT 3,
  p_radius_meters FLOAT DEFAULT 500
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge_id UUID;
  v_creature_type_id INT;
  v_challenge_name TEXT;
  v_description TEXT;
  v_reward_points INT;
  v_difficulty TEXT;
BEGIN
  -- Validate challenge type
  IF p_challenge_type NOT IN ('collect', 'walk', 'explore') THEN
    RAISE EXCEPTION 'Invalid challenge_type: %', p_challenge_type;
  END IF;

  -- Get creature type ID if provided
  IF p_creature_type_name IS NOT NULL THEN
    SELECT id INTO v_creature_type_id 
    FROM creature_types 
    WHERE name = p_creature_type_name 
    LIMIT 1;
    
    IF v_creature_type_id IS NULL THEN
      RAISE EXCEPTION 'Creature type not found: %', p_creature_type_name;
    END IF;
  END IF;
  
  -- Determine reward points and difficulty based on target value
  v_reward_points := CASE 
    WHEN p_target_value <= 3 THEN 150
    WHEN p_target_value <= 5 THEN 200
    WHEN p_target_value <= 10 THEN 300
    ELSE 500
  END;
  
  v_difficulty := CASE 
    WHEN p_target_value <= 3 THEN 'easy'
    WHEN p_target_value <= 5 THEN 'medium'
    WHEN p_target_value <= 10 THEN 'hard'
    ELSE 'expert'
  END;
  
  -- Generate challenge name and description
  v_challenge_name := p_park_name || ' Challenge';
  v_description := CASE 
    WHEN p_challenge_type = 'collect' THEN 
      'Catch ' || p_target_value || ' ' || COALESCE(p_creature_type_name, 'creatures') || ' in ' || p_park_name
    WHEN p_challenge_type = 'walk' THEN 
      'Walk ' || p_target_value || ' meters in ' || p_park_name
    ELSE 
      'Explore ' || p_park_name
  END;
  
  -- Create challenge (only if one doesn't already exist nearby)
  INSERT INTO challenges (
    name,
    description,
    challenge_type,
    target_value,
    target_creature_type_id,
    location,
    radius_meters,
    park_id,
    reward_points,
    difficulty
  )
  SELECT 
    v_challenge_name,
    v_description,
    p_challenge_type,
    p_target_value,
    v_creature_type_id,
    ST_SetSRID(ST_MakePoint(p_park_lon, p_park_lat), 4326),
    p_radius_meters,
    p_park_name,
    v_reward_points,
    v_difficulty
  WHERE NOT EXISTS (
    SELECT 1 FROM challenges 
    WHERE park_id = p_park_name
      AND challenge_type = p_challenge_type
      AND ST_Distance(
        location::geography, 
        ST_SetSRID(ST_MakePoint(p_park_lon, p_park_lat), 4326)::geography
      ) < 200
  )
  RETURNING id INTO v_challenge_id;
  
  RETURN v_challenge_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- Function: Create challenge at player's current location
-- Creates a challenge at the specified coordinates (for testing/demo)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_challenge_at_location(
  p_lat FLOAT,
  p_lon FLOAT,
  p_challenge_name TEXT DEFAULT NULL,
  p_challenge_type TEXT DEFAULT 'collect',
  p_creature_type_name TEXT DEFAULT NULL,
  p_target_value INT DEFAULT 3,
  p_radius_meters FLOAT DEFAULT 500
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge_id UUID;
  v_creature_type_id INT;
  v_name TEXT;
  v_description TEXT;
  v_park_name TEXT;
BEGIN
  -- Get creature type ID if provided
  IF p_creature_type_name IS NOT NULL THEN
    SELECT id INTO v_creature_type_id 
    FROM creature_types 
    WHERE name = p_creature_type_name 
    LIMIT 1;
    
    IF v_creature_type_id IS NULL THEN
      RAISE EXCEPTION 'Creature type not found: %', p_creature_type_name;
    END IF;
  END IF;
  
  -- Generate challenge name and park name
  v_park_name := 'Local Area Challenge';
  v_name := COALESCE(p_challenge_name, 
    CASE 
      WHEN p_challenge_type = 'collect' THEN 
        'Catch ' || p_target_value || ' ' || COALESCE(p_creature_type_name, 'creatures')
      WHEN p_challenge_type = 'walk' THEN 
        'Walk ' || p_target_value || ' Meters'
      ELSE 
        'Explore the Area'
    END
  );
  
  v_description := CASE 
    WHEN p_challenge_type = 'collect' THEN 
      'Catch ' || p_target_value || ' ' || COALESCE(p_creature_type_name, 'creatures') || ' in this area'
    WHEN p_challenge_type = 'walk' THEN 
      'Walk ' || p_target_value || ' meters around this location'
    ELSE 
      'Explore this area and discover what''s nearby'
  END;
  
  -- Create challenge
  INSERT INTO challenges (
    name,
    description,
    challenge_type,
    target_value,
    target_creature_type_id,
    location,
    radius_meters,
    park_id,
    reward_points,
    difficulty
  )
  VALUES (
    v_name,
    v_description,
    p_challenge_type,
    p_target_value,
    v_creature_type_id,
    ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326),
    p_radius_meters,
    v_park_name,
    CASE WHEN p_target_value <= 3 THEN 150 ELSE 200 END,
    CASE WHEN p_target_value <= 3 THEN 'easy' ELSE 'medium' END
  )
  RETURNING id INTO v_challenge_id;
  
  RETURN v_challenge_id;
END;
$$;

