-- Add 7 new Fakemon creatures
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

-- Viscolor - Rare, Psychic type (vision/color = psychic)
INSERT INTO creature_types (name, rarity, type, image_url, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries)
VALUES ('Viscolor', 'rare', 'psychic', 'https://pokengine.b-cdn.net/play/images/mons/fronts/00asdmog.webp?t=12', 0.02, 3.0, false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  image_url = EXCLUDED.image_url,
  rarity = EXCLUDED.rarity,
  type = EXCLUDED.type;

-- Forbiddron - Rare, Dark type (forbid = dark/forbidding)
INSERT INTO creature_types (name, rarity, type, image_url, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries)
VALUES ('Forbiddron', 'rare', 'dark', 'https://pokengine.b-cdn.net/play/images/mons/fronts/00k0excm.webp?t=15', 0.02, 3.0, false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  image_url = EXCLUDED.image_url,
  rarity = EXCLUDED.rarity,
  type = EXCLUDED.type;

-- Dreadrock - Rare, Rock type (dread + rock = rock)
INSERT INTO creature_types (name, rarity, type, image_url, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries)
VALUES ('Dreadrock', 'rare', 'rock', 'https://pokengine.b-cdn.net/play/images/mons/fronts/00czmr0r.webp?t=84', 0.02, 3.0, false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  image_url = EXCLUDED.image_url,
  rarity = EXCLUDED.rarity,
  type = EXCLUDED.type;

-- Trantima - Epic, Psychic type
INSERT INTO creature_types (name, rarity, type, image_url, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries)
VALUES ('Trantima', 'epic', 'psychic', 'https://pokengine.b-cdn.net/play/images/mons/fronts/00iq346z.webp?t=90', 0.01, 4.0, false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  image_url = EXCLUDED.image_url,
  rarity = EXCLUDED.rarity,
  type = EXCLUDED.type;

-- Howliage - Epic, Dark type (howl = dark)
INSERT INTO creature_types (name, rarity, type, image_url, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries)
VALUES ('Howliage', 'epic', 'dark', 'https://pokengine.b-cdn.net/play/images/mons/fronts/00bkgyjp.webp?t=169', 0.01, 4.0, false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  image_url = EXCLUDED.image_url,
  rarity = EXCLUDED.rarity,
  type = EXCLUDED.type;

-- Droopig - Rare, Normal type (pig = normal)
INSERT INTO creature_types (name, rarity, type, image_url, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries)
VALUES ('Droopig', 'rare', 'normal', 'https://pokengine.b-cdn.net/play/images/mons/fronts/00jdufjz.webp?t=7', 0.02, 3.0, false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  image_url = EXCLUDED.image_url,
  rarity = EXCLUDED.rarity,
  type = EXCLUDED.type;

-- Nitmarig - Epic, Fire type
INSERT INTO creature_types (name, rarity, type, image_url, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries)
VALUES ('Nitmarig', 'epic', 'fire', 'https://pokengine.b-cdn.net/play/images/mons/fronts/00cfzmpk.webp?t=121', 0.01, 4.0, false, NULL)
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
  'Viscolor', 'Forbiddron', 'Dreadrock', 'Trantima', 
  'Howliage', 'Droopig', 'Nitmarig'
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

