-- Create a function to return spawns with coordinates as separate columns
-- This makes it easier to parse coordinates in the client

CREATE OR REPLACE FUNCTION get_spawns_with_coords()
RETURNS TABLE (
  id UUID,
  creature_type_id INT,
  spawned_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  in_park BOOLEAN,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.creature_type_id,
    s.spawned_at,
    s.expires_at,
    s.in_park,
    ST_X(s.location::geometry) as longitude,
    ST_Y(s.location::geometry) as latitude
  FROM spawns s
  WHERE s.expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_spawns_with_coords TO authenticated;

-- Alternatively, modify the get_nearby_spawns function to return coordinates
-- But for now, we'll handle WKB parsing in the client

