-- Update gym locations to Manchester parks and green spaces
-- Keep Nancy Rothwell Building as the only non-park gym

-- First, remove duplicate gyms (keep one gym per name using the oldest ID)
-- Handle foreign key constraints by deleting spawns and RSVPs first
DO $$
DECLARE
  duplicate_gym_ids UUID[];
BEGIN
  -- Find all duplicate gym IDs (keep the one with the smallest ID for each name)
  WITH duplicates_to_delete AS (
    SELECT g.id
    FROM gyms g
    WHERE g.id NOT IN (
      SELECT DISTINCT ON (name) id
      FROM gyms
      ORDER BY name, created_at ASC, id ASC
    )
  )
  SELECT ARRAY_AGG(id) INTO duplicate_gym_ids
  FROM duplicates_to_delete;
  
  -- Delete spawns and RSVPs for duplicate gyms, then delete the gyms
  IF duplicate_gym_ids IS NOT NULL AND array_length(duplicate_gym_ids, 1) > 0 THEN
    DELETE FROM spawns WHERE gym_id = ANY(duplicate_gym_ids);
    DELETE FROM rsvps WHERE gym_id = ANY(duplicate_gym_ids);
    DELETE FROM gyms WHERE id = ANY(duplicate_gym_ids);
    RAISE NOTICE 'Deleted % duplicate gyms', array_length(duplicate_gym_ids, 1);
  END IF;
END $$;

-- Verify no duplicates remain before adding constraint
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Check for any remaining duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT name, COUNT(*) as cnt
    FROM gyms
    GROUP BY name
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Cannot add unique constraint: % duplicate gym names still exist. Please manually remove duplicates first.', duplicate_count;
  END IF;
END $$;

-- Drop constraint if it exists (in case it was partially created)
ALTER TABLE gyms DROP CONSTRAINT IF EXISTS gyms_name_key;

-- Now add the unique constraint
ALTER TABLE gyms ADD CONSTRAINT gyms_name_key UNIQUE (name);

-- First, ensure Nancy Rothwell Building exists and is up to date
INSERT INTO gyms (name, description, location, booking_url)
VALUES (
  'Nancy Rothwell Building Gym',
  'University of Manchester engineering hub! Epic and legendary creatures spawn at this state-of-the-art facility! Home to 8,000+ students and researchers.',
  ST_SetSRID(ST_MakePoint(-2.233929431717776, 53.46978544909656), 4326),
  NULL
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  location = EXCLUDED.location;

-- Delete spawns and RSVPs for gyms we're removing (to handle foreign key constraints)
DELETE FROM spawns WHERE gym_id IN (
  SELECT id FROM gyms WHERE name != 'Nancy Rothwell Building Gym'
);
DELETE FROM rsvps WHERE gym_id IN (
  SELECT id FROM gyms WHERE name != 'Nancy Rothwell Building Gym'
);

-- Now delete all gyms except Nancy Rothwell Building
DELETE FROM gyms 
WHERE name != 'Nancy Rothwell Building Gym';

-- Insert new gyms at Manchester parks and green spaces
INSERT INTO gyms (name, description, location, booking_url) VALUES
  -- Heaton Park (Manchester's largest park)
  (
    'Heaton Park Gym',
    'Manchester''s largest park! One of Europe''s biggest urban parks with beautiful green spaces, perfect for epic creature encounters!',
    ST_SetSRID(ST_MakePoint(-2.263889, 53.528056), 4326),
    NULL
  ),
  -- Whitworth Park (near university)
  (
    'Whitworth Park Gym',
    'Beautiful park adjacent to The Whitworth art gallery! Perfect blend of nature and culture for legendary creature encounters!',
    ST_SetSRID(ST_MakePoint(-2.229722, 53.460833), 4326),
    NULL
  ),
  -- Alexandra Park
  (
    'Alexandra Park Gym',
    'Historic Victorian park with expansive green spaces and a lake! Epic creatures gather in this peaceful natural setting!',
    ST_SetSRID(ST_MakePoint(-2.218889, 53.448056), 4326),
    NULL
  ),
  -- Platt Fields Park
  (
    'Platt Fields Park Gym',
    'Vibrant community park with a lake and beautiful gardens! Legendary creatures spawn in this popular green space!',
    ST_SetSRID(ST_MakePoint(-2.223889, 53.443056), 4326),
    NULL
  ),
  -- Peel Park
  (
    'Peel Park Gym',
    'One of Manchester''s oldest parks with picturesque riverside views! Perfect for epic creature encounters in historic surroundings!',
    ST_SetSRID(ST_MakePoint(-2.255556, 53.483889), 4326),
    NULL
  ),
  -- Fletcher Moss Park
  (
    'Fletcher Moss Park Gym',
    'Beautiful botanical gardens and nature reserve! Rare and epic creatures spawn in this tranquil green oasis!',
    ST_SetSRID(ST_MakePoint(-2.279167, 53.424167), 4326),
    NULL
  ),
  -- Wythenshawe Park
  (
    'Wythenshawe Park Gym',
    'Historic park with woodlands and open spaces! Legendary creatures await in this expansive natural area!',
    ST_SetSRID(ST_MakePoint(-2.280833, 53.390833), 4326),
    NULL
  ),
  -- Chorlton Water Park
  (
    'Chorlton Water Park Gym',
    'Nature reserve and water park with diverse wildlife! Epic creatures spawn in this peaceful wetland environment!',
    ST_SetSRID(ST_MakePoint(-2.281944, 53.435556), 4326),
    NULL
  ),
  -- Phillips Park
  (
    'Phillips Park Gym',
    'Beautiful park with green spaces and walking trails! Perfect location for legendary creature encounters!',
    ST_SetSRID(ST_MakePoint(-2.188889, 53.485833), 4326),
    NULL
  ),
  -- Queen's Park (Heywood)
  (
    'Queen''s Park Gym',
    'Victorian park with ornamental gardens and a lake! Epic and legendary creatures gather in this scenic location!',
    ST_SetSRID(ST_MakePoint(-2.212500, 53.589167), 4326),
    NULL
  ),
  -- Debdale Park
  (
    'Debdale Park Gym',
    'Beautiful park with a reservoir and nature trails! Perfect for epic creature encounters in natural surroundings!',
    ST_SetSRID(ST_MakePoint(-2.155556, 53.467222), 4326),
    NULL
  ),
  -- Boggart Hole Clough
  (
    'Boggart Hole Clough Gym',
    'Large urban park with woodlands and a lake! Legendary creatures spawn in this diverse natural habitat!',
    ST_SetSRID(ST_MakePoint(-2.221944, 53.512222), 4326),
    NULL
  ),
  -- Clayton Vale
  (
    'Clayton Vale Gym',
    'Nature reserve along the River Medlock! Epic creatures gather in this beautiful riverside green space!',
    ST_SetSRID(ST_MakePoint(-2.178611, 53.480833), 4326),
    NULL
  )
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  location = EXCLUDED.location;

-- Nancy Rothwell Building should already be preserved from above
-- This is just a safety check comment

-- Reinitialize gym creatures for all gyms
SELECT initialize_gym_creatures();

