-- Add sample gyms to the database
-- Replace these coordinates with real locations near you!
--
-- INSTRUCTIONS TO EDIT COORDINATES:
-- 1. Open Google Maps (https://www.google.com/maps)
-- 2. Find your location and right-click on it
-- 3. Click on the coordinates at the top (they look like: 40.782865, -73.965355)
-- 4. Copy the two numbers (latitude and longitude)
-- 5. In the ST_MakePoint() function below, use: ST_MakePoint(longitude, latitude)
--    NOTE: The order is LONGITUDE first, then LATITUDE (opposite of Google Maps!)
-- 6. Replace the example coordinates below with your coordinates
--
-- EXAMPLE:
--   If Google Maps shows: 40.782865, -73.965355
--   Use in SQL: ST_MakePoint(-73.965355, 40.782865)
--
-- You can delete the example gyms and add your own, or just change the coordinates

INSERT INTO gyms (name, description, location, booking_url) VALUES
  -- Manchester City Centre
  (
    'Manchester Central Gym',
    'The heart of Manchester! Epic and legendary creatures gather here when 5+ trainers unite!',
    ST_SetSRID(ST_MakePoint(-2.2347823927427553, 53.47413171541911), 4326),
    NULL
  ),
  -- Albert Square / Town Hall
  (
    'Albert Square Gym',
    'Historic Town Hall location. Legendary creatures await at this iconic Manchester landmark!',
    ST_SetSRID(ST_MakePoint(-2.244644, 53.479444), 4326),
    NULL
  ),
  -- Old Trafford (Manchester United)
  (
    'Old Trafford Gym',
    'The Theatre of Dreams! Catch epic creatures at one of the world''s most famous football stadiums!',
    ST_SetSRID(ST_MakePoint(-2.291667, 53.463056), 4326),
    NULL
  ),
  -- Etihad Stadium (Manchester City)
  (
    'Etihad Stadium Gym',
    'Home of the champions! Epic and legendary creatures spawn at this modern stadium!',
    ST_SetSRID(ST_MakePoint(-2.200278, 53.483056), 4326),
    NULL
  ),
  -- Science and Industry Museum
  (
    'Museum Gym',
    'Where history meets adventure! Discover rare creatures at this iconic museum!',
    ST_SetSRID(ST_MakePoint(-2.258056, 53.477500), 4326),
    NULL
  ),
  -- Heaton Park
  (
    'Heaton Park Gym',
    'Manchester''s largest park! Perfect for epic creature encounters in nature!',
    ST_SetSRID(ST_MakePoint(-2.263889, 53.528056), 4326),
    NULL
  ),
  -- Piccadilly Gardens
  (
    'Piccadilly Gardens Gym',
    'The bustling center of Manchester! Legendary creatures gather here!',
    ST_SetSRID(ST_MakePoint(-2.236111, 53.480833), 4326),
    NULL
  ),
  -- MediaCityUK
  (
    'MediaCity Gym',
    'Modern Manchester! Epic creatures spawn at this futuristic location!',
    ST_SetSRID(ST_MakePoint(-2.299167, 53.471389), 4326),
    NULL
  ),
  -- John Rylands Library
  (
    'John Rylands Library Gym',
    'Historic library location! Rare creatures await at this architectural masterpiece!',
    ST_SetSRID(ST_MakePoint(-2.248056, 53.478889), 4326),
    NULL
  ),
  -- Manchester Cathedral
  (
    'Cathedral Gym',
    'Sacred grounds! Legendary creatures spawn at this beautiful cathedral!',
    ST_SetSRID(ST_MakePoint(-2.245833, 53.485278), 4326),
    NULL
  ),
  -- Nancy Rothwell Building
  (
    'Nancy Rothwell Building Gym',
    'University of Manchester engineering hub! Epic and legendary creatures spawn at this state-of-the-art facility! Home to 8,000+ students and researchers.',
    ST_SetSRID(ST_MakePoint(-2.233929431717776, 53.46978544909656), 4326),
    NULL
  )
ON CONFLICT DO NOTHING;

-- You can add more gyms by copying the format above
-- To find coordinates for your location:
-- 1. Go to Google Maps
-- 2. Right-click on the location
-- 3. Click on the coordinates (they appear at the top)
-- 4. Copy the latitude and longitude
-- 5. Use them in the ST_MakePoint function: ST_MakePoint(longitude, latitude)

-- Note: The coordinates format is (longitude, latitude) - note the order!

