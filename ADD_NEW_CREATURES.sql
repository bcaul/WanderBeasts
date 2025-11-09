-- Add new creature sprites with working URLs
-- Uses INSERT ... ON CONFLICT to add new creatures or update existing ones

-- Ensure unique constraint on name exists (for ON CONFLICT to work)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'creature_types_name_key'
  ) THEN
    ALTER TABLE creature_types ADD CONSTRAINT creature_types_name_key UNIQUE (name);
  END IF;
END $$;

-- Note: Fixing rarity casing (Legendary -> legendary)
-- Note: Determining types based on names and patterns

-- Deember - legendary, ice type (December = winter/ice)
INSERT INTO creature_types (name, rarity, type, image_url, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries)
VALUES ('Deember', 'legendary', 'ice', 'https://pokengine.b-cdn.net/play/images/mons/fronts/008wb8sj.webp?t=18', 0.001, 5.0, false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  image_url = EXCLUDED.image_url,
  rarity = EXCLUDED.rarity,
  type = EXCLUDED.type;

-- Hayog - common, grass type (hay = grass)
INSERT INTO creature_types (name, rarity, type, image_url, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries)
VALUES ('Hayog', 'common', 'grass', 'https://pokengine.b-cdn.net/play/images/mons/backs/00jtq3x2.webp?t=67', 0.08, 2.0, false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  image_url = EXCLUDED.image_url,
  rarity = EXCLUDED.rarity,
  type = EXCLUDED.type;

-- Hogriks - epic, normal type (hog = normal/ground)
INSERT INTO creature_types (name, rarity, type, image_url, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries)
VALUES ('Hogriks', 'epic', 'normal', 'https://pokengine.b-cdn.net/play/images/mons/fronts/00jegdpk.webp?t=13', 0.01, 4.0, false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  image_url = EXCLUDED.image_url,
  rarity = EXCLUDED.rarity,
  type = EXCLUDED.type;

-- Webruiser - epic, bug type (web = bug)
INSERT INTO creature_types (name, rarity, type, image_url, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries)
VALUES ('Webruiser', 'epic', 'bug', 'https://pokengine.b-cdn.net/play/images/mons/fronts/00qwht05.webp?t=12', 0.01, 4.0, false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  image_url = EXCLUDED.image_url,
  rarity = EXCLUDED.rarity,
  type = EXCLUDED.type;

-- Kankersaur - legendary, rock type (saur = dinosaur/rock)
INSERT INTO creature_types (name, rarity, type, image_url, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries)
VALUES ('Kankersaur', 'legendary', 'rock', 'https://pokengine.b-cdn.net/play/images/mons/fronts/00w9i8sw.webp?t=91', 0.001, 5.0, false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  image_url = EXCLUDED.image_url,
  rarity = EXCLUDED.rarity,
  type = EXCLUDED.type;

-- Ananoop - rare, normal type
INSERT INTO creature_types (name, rarity, type, image_url, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries)
VALUES ('Ananoop', 'rare', 'normal', 'https://pokengine.b-cdn.net/play/images/mons/fronts/00m2kdwg.webp?t=59', 0.02, 3.0, false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  image_url = EXCLUDED.image_url,
  rarity = EXCLUDED.rarity,
  type = EXCLUDED.type;

-- Daikong - legendary, fighting type (kong = fighting)
INSERT INTO creature_types (name, rarity, type, image_url, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries)
VALUES ('Daikong', 'legendary', 'fighting', 'https://pokengine.b-cdn.net/play/images/mons/fronts/009p13ab.webp?t=34', 0.001, 5.0, false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  image_url = EXCLUDED.image_url,
  rarity = EXCLUDED.rarity,
  type = EXCLUDED.type;

-- KannonBlast - epic, steel type (cannon = steel)
INSERT INTO creature_types (name, rarity, type, image_url, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries)
VALUES ('KannonBlast', 'epic', 'steel', 'https://pokengine.b-cdn.net/play/images/mons/fronts/00rfikbv.webp?t=45', 0.01, 4.0, false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  image_url = EXCLUDED.image_url,
  rarity = EXCLUDED.rarity,
  type = EXCLUDED.type;

-- Bulpy - common, normal type
INSERT INTO creature_types (name, rarity, type, image_url, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries)
VALUES ('Bulpy', 'common', 'normal', 'https://pokengine.b-cdn.net/play/images/mons/fronts/008r8g70.webp?t=27', 0.08, 2.0, false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  image_url = EXCLUDED.image_url,
  rarity = EXCLUDED.rarity,
  type = EXCLUDED.type;

-- Archilles - legendary, fighting type (Achilles = warrior/fighting)
INSERT INTO creature_types (name, rarity, type, image_url, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries)
VALUES ('Archilles', 'legendary', 'fighting', 'https://pokengine.b-cdn.net/play/images/mons/fronts/00156fsm.webp?t=19', 0.001, 5.0, false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  image_url = EXCLUDED.image_url,
  rarity = EXCLUDED.rarity,
  type = EXCLUDED.type;

-- Verify the additions
SELECT 
  name,
  rarity,
  type,
  image_url
FROM creature_types
WHERE name IN (
  'Deember', 'Hayog', 'Hogriks', 'Webruiser', 'Kankersaur', 
  'Ananoop', 'Daikong', 'KannonBlast', 'Bulpy', 'Archilles'
)
ORDER BY 
  CASE rarity
    WHEN 'common' THEN 1
    WHEN 'uncommon' THEN 2
    WHEN 'rare' THEN 3
    WHEN 'epic' THEN 4
    WHEN 'legendary' THEN 5
  END,
  name;

