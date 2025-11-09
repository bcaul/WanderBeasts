-- Replace existing creature types with Pokengine Mongratis collection
-- Source: https://pokengine.org/collections/107s7x9x/Mongratis?icons

-- First, delete existing creatures (optional - you might want to keep them)
-- DELETE FROM catches WHERE creature_type_id IN (SELECT id FROM creature_types);
-- DELETE FROM spawns WHERE creature_type_id IN (SELECT id FROM creature_types);
-- DELETE FROM creature_types;

-- Add unique constraint on name if it doesn't exist (for data integrity)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'creature_types_name_key'
  ) THEN
    ALTER TABLE creature_types ADD CONSTRAINT creature_types_name_key UNIQUE (name);
  END IF;
END $$;

-- Truncate and reset (removes all existing data)
TRUNCATE TABLE catches CASCADE;
TRUNCATE TABLE spawns CASCADE;
TRUNCATE TABLE creature_types RESTART IDENTITY CASCADE;

-- Insert all 100 Pokengine creatures
-- Rarity distribution: 40% common, 30% uncommon, 20% rare, 8% epic, 2% legendary
-- Types assigned based on name patterns or randomly
-- NOTE: image_url uses Pokengine CDN pattern: https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26
-- You need to replace {SPRITE_ID} with the actual sprite ID for each creature
-- Find sprite IDs by inspecting images on https://pokengine.org/collections/107s7x9x/Mongratis?icons
INSERT INTO creature_types (name, rarity, type, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries, image_url) VALUES
  -- Common (40 creatures)
  -- TODO: Replace {SPRITE_ID} placeholders with actual sprite IDs from Pokengine
  -- Use EXTRACT_SPRITE_IDS.js script in browser console to extract sprite IDs
  ('Geckrow', 'common', 'normal', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  -- TODO: Replace sprite IDs with actual IDs from Pokengine
  ('Goanopy', 'common', 'grass', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('City Slicker', 'common', 'normal', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Ninoala', 'common', 'normal', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Anu', 'common', 'normal', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Firomenis', 'common', 'fire', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Baoby', 'common', 'grass', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Baobaraffe', 'common', 'grass', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Nuenflu', 'common', 'flying', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Baulder', 'common', 'rock', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Deember', 'common', 'ice', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Lavee', 'common', 'fire', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Efflutal', 'common', 'water', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Hayog', 'common', 'normal', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Webruiser', 'common', 'bug', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Pilfetch', 'common', 'flying', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Pasturlo', 'common', 'grass', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Brambull', 'common', 'normal', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Minamai', 'common', 'water', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Spinarak', 'common', 'bug', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Ariados', 'common', 'bug', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Torkoal', 'common', 'fire', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Sunkern', 'common', 'grass', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Sunflora', 'common', 'grass', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Luvdisc', 'common', 'water', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Corsola', 'common', 'water', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Dunsparce', 'common', 'normal', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Girafarig', 'common', 'normal', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Stantler', 'common', 'normal', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Timberry', 'common', 'grass', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Delugar', 'common', 'water', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Sizzly', 'common', 'fire', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Lollybog', 'common', 'grass', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Rocotton', 'common', 'rock', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Raskit', 'common', 'normal', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Scruffian', 'common', 'normal', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Droopig', 'common', 'normal', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Kankwart', 'common', 'rock', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Impurp', 'common', 'poison', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Smoald', 'common', 'fire', 0.08, 2.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),

  -- Uncommon (30 creatures)
  ('Varanitor', 'uncommon', 'dragon', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26varanitor.png'),
  ('Hissiorite', 'uncommon', 'rock', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26hissiorite.png'),
  ('Cobarett', 'uncommon', 'poison', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26cobarett.png'),
  ('Pythonova', 'uncommon', 'dragon', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26'),
  ('Koaninja', 'uncommon', 'fighting', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26koaninja.png'),
  ('Merlicun', 'uncommon', 'water', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26merlicun.png'),
  ('Tekagon', 'uncommon', 'steel', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26tekagon.png'),
  ('Nymbi', 'uncommon', 'bug', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26nymbi.png'),
  ('Lavare', 'uncommon', 'fire', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26lavare.png'),
  ('Crator', 'uncommon', 'fire', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26crator.png'),
  ('Hogouse', 'uncommon', 'normal', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26hogouse.png'),
  ('Hogriks', 'uncommon', 'normal', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26hogriks.png'),
  ('Criminalis', 'uncommon', 'dark', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26criminalis.png'),
  ('Maizotaur', 'uncommon', 'grass', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26maizotaur.png'),
  ('Marelstorm', 'uncommon', 'water', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26marelstorm.png'),
  ('Tormine', 'uncommon', 'rock', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26tormine.png'),
  ('Sunnydra', 'uncommon', 'grass', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26sunnydra.png'),
  ('Shorelorn', 'uncommon', 'water', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26shorelorn.png'),
  ('Cryscross', 'uncommon', 'ice', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26cryscross.png'),
  ('Cryogonal', 'uncommon', 'ice', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26cryogonal.png'),
  ('Coralya', 'uncommon', 'water', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26coralya.png'),
  ('Solacor', 'uncommon', 'water', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26solacor.png'),
  ('Dunymph', 'uncommon', 'fairy', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26dunymph.png'),
  ('Dunrago', 'uncommon', 'dragon', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26dunrago.png'),
  ('Titaneon', 'uncommon', 'steel', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26titaneon.png'),
  ('Nimbeon', 'uncommon', 'electric', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26nimbeon.png'),
  ('Gireamer', 'uncommon', 'psychic', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26gireamer.png'),
  ('Nitmarig', 'uncommon', 'dark', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26nitmarig.png'),
  ('Moosid', 'uncommon', 'normal', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26moosid.png'),
  ('Egoelk', 'uncommon', 'psychic', 0.05, 2.5, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26egoelk.png'),

  -- Rare (20 creatures)
  ('Trantima', 'rare', 'ghost', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26trantima.png'),
  ('Suprago', 'rare', 'flying', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26suprago.png'),
  ('Howliage', 'rare', 'ghost', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26howliage.png'),
  ('Botanine', 'rare', 'grass', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26botanine.png'),
  ('Dampurr', 'rare', 'water', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26dampurr.png'),
  ('Rainther', 'rare', 'water', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26rainther.png'),
  ('Bonfur', 'rare', 'fire', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26bonfur.png'),
  ('Tindursa', 'rare', 'fire', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26tindursa.png'),
  ('Saurky', 'rare', 'dragon', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26saurky.png'),
  ('Crestaka', 'rare', 'flying', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26crestaka.png'),
  ('Avipex', 'rare', 'flying', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26avipex.png'),
  ('Brewtrid', 'rare', 'grass', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26brewtrid.png'),
  ('Forbiddron', 'rare', 'dragon', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26forbiddron.png'),
  ('Plushion', 'rare', 'fairy', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26plushion.png'),
  ('Tuffettry', 'rare', 'rock', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26tuffettry.png'),
  ('Dynabit', 'rare', 'electric', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26dynabit.png'),
  ('Pompet', 'rare', 'fairy', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26pompet.png'),
  ('Pomprim', 'rare', 'fairy', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26pomprim.png'),
  ('Hoolihog', 'rare', 'normal', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26hoolihog.png'),
  ('Kankryst', 'rare', 'ice', 0.03, 3.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26kankryst.png'),

  -- Epic (8 creatures)
  ('Wolfman', 'epic', 'fighting', 0.01, 4.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26wolfman.png'),
  ('Warwolf', 'epic', 'fighting', 0.01, 4.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26warwolf.png'),
  ('Kankersaur', 'epic', 'rock', 0.01, 4.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26kankersaur.png'),
  ('Nymfusha', 'epic', 'bug', 0.01, 4.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26nymfusha.png'),
  ('Bombustoad', 'epic', 'poison', 0.01, 4.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26bombustoad.png'),
  ('Sligment', 'epic', 'poison', 0.01, 4.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26sligment.png'),
  ('Viscolor', 'epic', 'psychic', 0.01, 4.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26viscolor.png'),
  ('Drashimi', 'epic', 'water', 0.01, 4.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26drashimi.png'),

  -- Legendary (2 creatures)
  ('Tsushimi', 'legendary', 'water', 0.001, 5.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26tsushimi.png'),
  ('Tobishimi', 'legendary', 'water', 0.001, 5.0, false, NULL, 'https://pokengine.b-cdn.net/play/images/mons/fronts/{SPRITE_ID}.webp?t=26tobishimi.png');

-- Verify the insert
SELECT 
  rarity,
  COUNT(*) as count
FROM creature_types
GROUP BY rarity
ORDER BY 
  CASE rarity
    WHEN 'common' THEN 1
    WHEN 'uncommon' THEN 2
    WHEN 'rare' THEN 3
    WHEN 'epic' THEN 4
    WHEN 'legendary' THEN 5
  END;

