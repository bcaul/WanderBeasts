-- ============================================================================
-- Add prize_description and prize_expires_at to get_nearby_challenges RPC Function
-- This ensures business challenges have all their data immediately available
-- ============================================================================

-- Drop the existing function first (required when changing return type)
DO $$
BEGIN
  -- Drop function with double precision (most common)
  DROP FUNCTION IF EXISTS get_nearby_challenges(double precision, double precision, double precision) CASCADE;
  -- Drop function with real (if it exists)
  DROP FUNCTION IF EXISTS get_nearby_challenges(real, real, real) CASCADE;
  -- Drop function with float (alias)
  DROP FUNCTION IF EXISTS get_nearby_challenges(float, float, float) CASCADE;
EXCEPTION
  WHEN OTHERS THEN
    -- Function might not exist or have different signature, continue anyway
    NULL;
END $$;

-- Recreate the get_nearby_challenges function to include prize fields
CREATE FUNCTION get_nearby_challenges(
  user_lat double precision,
  user_lon double precision,
  search_radius_meters double precision DEFAULT 1000
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  challenge_type TEXT,
  target_value INT,
  target_creature_type_id INT,
  location GEOGRAPHY,
  radius_meters FLOAT,
  park_id TEXT,
  reward_points INT,
  difficulty TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  distance_meters FLOAT,
  accepted BOOLEAN,
  progress_value INT,
  completed BOOLEAN,
  business_id UUID,
  prize_description TEXT,
  prize_expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.challenge_type,
    c.target_value,
    c.target_creature_type_id,
    c.location,
    c.radius_meters,
    c.park_id,
    c.reward_points,
    c.difficulty,
    c.expires_at,
    ST_Distance(
      c.location::geography,
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
    ) AS distance_meters,
    CASE WHEN uc.id IS NOT NULL THEN TRUE ELSE FALSE END AS accepted,
    COALESCE(uc.progress_value, 0) AS progress_value,
    COALESCE(uc.completed, FALSE) AS completed,
    c.business_id,  -- Business challenge identifier
    c.prize_description,  -- Prize description for business challenges
    c.prize_expires_at  -- Prize expiration for business challenges
  FROM challenges c
  LEFT JOIN user_challenges uc ON uc.challenge_id = c.id AND uc.user_id = auth.uid()
  WHERE c.active = TRUE
    AND (c.expires_at IS NULL OR c.expires_at > NOW())
    AND ST_Distance(
      c.location::geography,
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
    ) <= search_radius_meters
  ORDER BY 
    CASE WHEN c.business_id IS NOT NULL THEN 0 ELSE 1 END,  -- Business challenges first
    distance_meters ASC;
END;
$$;

