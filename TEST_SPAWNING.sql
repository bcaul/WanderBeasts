-- Test Spawning - Run these queries to diagnose spawning issues

-- 1. Check if creature types exist
SELECT * FROM creature_types;

-- 2. Check existing spawns
SELECT 
  s.id,
  s.spawned_at,
  s.expires_at,
  s.in_park,
  ct.name as creature_name,
  ct.rarity,
  s.location,
  CASE 
    WHEN s.expires_at > NOW() THEN 'Active'
    ELSE 'Expired'
  END as status
FROM spawns s
LEFT JOIN creature_types ct ON s.creature_type_id = ct.id
ORDER BY s.spawned_at DESC
LIMIT 20;

-- 3. Check active spawns only
SELECT 
  COUNT(*) as active_spawns,
  COUNT(DISTINCT s.creature_type_id) as unique_creatures
FROM spawns s
WHERE s.expires_at > NOW();

-- 4. Test PostGIS functions
SELECT PostGIS_Version();

-- 5. Test creating a spawn manually (replace coordinates with your location)
INSERT INTO spawns (creature_type_id, location, expires_at, in_park)
VALUES (
  (SELECT id FROM creature_types LIMIT 1),
  ST_SetSRID(ST_MakePoint(-73.9857, 40.7580), 4326)::geography,  -- Replace with your coordinates
  NOW() + INTERVAL '15 minutes',
  false
)
RETURNING *;

-- 6. Test the get_nearby_spawns function (if it exists)
-- Replace coordinates with your location
SELECT * FROM get_nearby_spawns(40.7580, -73.9857, 500);

-- 7. Check spawns within radius (manual PostGIS query)
-- Replace coordinates with your location
SELECT 
  s.*,
  ct.name as creature_name,
  ST_Distance(
    s.location::geography,
    ST_SetSRID(ST_MakePoint(-73.9857, 40.7580), 4326)::geography
  ) as distance_meters
FROM spawns s
LEFT JOIN creature_types ct ON s.creature_type_id = ct.id
WHERE 
  ST_DWithin(
    s.location::geography,
    ST_SetSRID(ST_MakePoint(-73.9857, 40.7580), 4326)::geography,
    500
  )
  AND s.expires_at > NOW()
ORDER BY distance_meters ASC;

-- 8. Clean up expired spawns
DELETE FROM spawns WHERE expires_at < NOW();

-- 9. Count spawns by creature type
SELECT 
  ct.name,
  ct.rarity,
  COUNT(*) as spawn_count
FROM spawns s
JOIN creature_types ct ON s.creature_type_id = ct.id
WHERE s.expires_at > NOW()
GROUP BY ct.id, ct.name, ct.rarity
ORDER BY spawn_count DESC;

-- 10. Check if RLS policies are blocking spawns
SELECT * FROM pg_policies WHERE tablename = 'spawns';

