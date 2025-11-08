-- Fix: Allow authenticated users to insert spawns
-- This fixes the RLS error when generating spawns

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Authenticated users can insert spawns" ON spawns;

-- Create INSERT policy for authenticated users
CREATE POLICY "Authenticated users can insert spawns" ON spawns
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Alternative: Create a function to insert spawns with elevated privileges
-- This is more secure as it validates the data before inserting
CREATE OR REPLACE FUNCTION insert_spawn(
  p_creature_type_id INT,
  p_location TEXT,
  p_in_park BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  v_spawn_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate expiration time (15 minutes from now)
  v_expires_at := NOW() + INTERVAL '15 minutes';
  
  -- Parse location string and insert spawn
  INSERT INTO spawns (creature_type_id, location, expires_at, in_park)
  VALUES (
    p_creature_type_id,
    ST_GeogFromText(p_location)::geography,
    v_expires_at,
    p_in_park
  )
  RETURNING id INTO v_spawn_id;
  
  RETURN v_spawn_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error inserting spawn: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_spawn TO authenticated;

