-- Keep ONLY creatures with WORKING sprite URLs
-- Remove all creatures with failing sprites
-- Based on browser console errors showing which sprites actually load

-- Step 1: Update creatures with correct sprite URLs (only those that work)
-- These are the creatures that have WORKING sprites (27 creatures)
-- Removed: Sunkern, Koaninja, Wolfman, Hayog, Marelstorm, Merlicun, Warwolf,
--          Tekagon, Deember, Ninoala, Webruiser, Cobarett, Hogouse, Sunflora, 
--          Nymbi, Tobishimi, Spinarak, Varanitor, Goanopy, Shorelorn, Cryogonal, Tsushimi, Hogriks, Cryscross

UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00xjjwow.webp?t=1' WHERE name = 'Geckrow';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00ptxzlq.webp?t=1' WHERE name = 'Hissiorite';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00rgw87i.webp?t=1' WHERE name = 'Pythonova';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00whcgac.webp?t=1' WHERE name = 'Anu';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00qaw4vt.webp?t=1' WHERE name = 'Firomenis';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00w4ht43.webp?t=1' WHERE name = 'Baoby';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00acorxf.webp?t=1' WHERE name = 'Baobaraffe';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00mi3mop.webp?t=1' WHERE name = 'Nuenflu';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/000kt6km.webp?t=1' WHERE name = 'Drashimi';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/009ghbgo.webp?t=1' WHERE name = 'Baulder';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00czmr0r.webp?t=1' WHERE name = 'Dreadrock';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00vjdmsm.webp?t=1' WHERE name = 'Lavee';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/001291eg.webp?t=1' WHERE name = 'Lavare';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00s1rbp7.webp?t=1' WHERE name = 'Crator';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00ytz84z.webp?t=1' WHERE name = 'Efflutal';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/000jcvv9.webp?t=1' WHERE name = 'Pilfetch';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00n7m78l.webp?t=1' WHERE name = 'Criminalis';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00gyfbhn.webp?t=1' WHERE name = 'Pasturlo';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00u9jl5b.webp?t=1' WHERE name = 'Brambull';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00vu9xqu.webp?t=1' WHERE name = 'Maizotaur';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00rofohd.webp?t=1' WHERE name = 'Minamai';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00czwms2.webp?t=1' WHERE name = 'Ariados';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/009f30og.webp?t=1' WHERE name = 'Torkoal';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00gmc3cs.webp?t=1' WHERE name = 'Tormine';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00yys19h.webp?t=1' WHERE name = 'Sunnydra';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00pt51k2.webp?t=1' WHERE name = 'Luvdisc';
UPDATE creature_types SET image_url = 'https://pokengine.b-cdn.net/play/images/mons/icons/00di4vdx.webp?t=1' WHERE name = 'Corsola';

-- Step 2: List of 27 creatures to KEEP (these have WORKING sprite URLs)
-- Working creatures: Geckrow, Hissiorite, Pythonova, Anu, Firomenis, Baoby, Baobaraffe,
--                    Nuenflu, Drashimi, Baulder, Dreadrock, Lavee, Lavare,
--                    Crator, Efflutal, Pilfetch, Criminalis, Pasturlo, Brambull,
--                    Maizotaur, Minamai, Ariados, Torkoal, Tormine, Sunnydra, Luvdisc,
--                    Corsola

-- Step 3: Delete catches for creatures NOT in the working list
DELETE FROM catches
WHERE creature_type_id IN (
  SELECT id FROM creature_types
  WHERE name NOT IN (
    'Geckrow', 'Hissiorite', 'Pythonova', 'Anu', 'Firomenis', 'Baoby', 'Baobaraffe',
    'Nuenflu', 'Drashimi', 'Baulder', 'Dreadrock', 'Lavee', 'Lavare',
    'Crator', 'Efflutal', 'Pilfetch', 'Criminalis', 'Pasturlo', 'Brambull',
    'Maizotaur', 'Minamai', 'Ariados', 'Torkoal', 'Tormine', 'Sunnydra', 'Luvdisc',
    'Corsola'
  )
);

-- Step 4: Delete spawns for creatures NOT in the working list
DELETE FROM spawns
WHERE creature_type_id IN (
  SELECT id FROM creature_types
  WHERE name NOT IN (
    'Geckrow', 'Hissiorite', 'Pythonova', 'Anu', 'Firomenis', 'Baoby', 'Baobaraffe',
    'Nuenflu', 'Drashimi', 'Baulder', 'Dreadrock', 'Lavee', 'Lavare',
    'Crator', 'Efflutal', 'Pilfetch', 'Criminalis', 'Pasturlo', 'Brambull',
    'Maizotaur', 'Minamai', 'Ariados', 'Torkoal', 'Tormine', 'Sunnydra', 'Luvdisc',
    'Corsola'
  )
);

-- Step 5: Delete creatures NOT in the working list
DELETE FROM creature_types
WHERE name NOT IN (
  'Geckrow', 'Hissiorite', 'Pythonova', 'Anu', 'Firomenis', 'Baoby', 'Baobaraffe',
  'Nuenflu', 'Drashimi', 'Baulder', 'Dreadrock', 'Lavee', 'Lavare',
  'Crator', 'Efflutal', 'Pilfetch', 'Criminalis', 'Pasturlo', 'Brambull',
  'Maizotaur', 'Minamai', 'Ariados', 'Torkoal', 'Tormine', 'Sunnydra', 'Luvdisc',
  'Corsola'
);

-- Step 6: Verify - should show exactly 27 creatures
SELECT 
  COUNT(*) as total_creatures,
  COUNT(*) FILTER (WHERE image_url LIKE '%pokengine.b-cdn.net%') as with_sprites
FROM creature_types;

-- Step 7: Show all remaining creatures (should be exactly 27)
SELECT name, rarity, type, image_url
FROM creature_types
ORDER BY 
  CASE rarity
    WHEN 'common' THEN 1
    WHEN 'uncommon' THEN 2
    WHEN 'rare' THEN 3
    WHEN 'epic' THEN 4
    WHEN 'legendary' THEN 5
  END,
  name;

-- Step 8: Show rarity distribution
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
