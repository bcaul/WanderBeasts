-- COMPLETE FIX FOR SPAWN INSERT RLS ERROR
-- Run this in Supabase SQL Editor

-- Option 1: Add INSERT policy (Simple - allows authenticated users to insert)
DROP POLICY IF EXISTS "Authenticated users can insert spawns" ON spawns;

CREATE POLICY "Authenticated users can insert spawns" ON spawns
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Option 2: Create a function to insert spawns (More secure - bypasses RLS)
-- This function uses SECURITY DEFINER, so it can insert even with RLS enabled
CREATE OR REPLACE FUNCTION insert_spawn_batch(
  spawns_data JSONB
)
RETURNS TABLE (spawn_id UUID, success BOOLEAN) AS $$
DECLARE
  spawn_item JSONB;
  v_spawn_id UUID;
  v_location GEOGRAPHY;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Loop through each spawn in the batch
  FOR spawn_item IN SELECT * FROM jsonb_array_elements(spawns_data)
  LOOP
    BEGIN
      -- Parse location from POINT string
      v_location := ST_GeogFromText(spawn_item->>'location')::geography;
      v_expires_at := (spawn_item->>'expires_at')::TIMESTAMP WITH TIME ZONE;
      
      -- Insert spawn
      INSERT INTO spawns (
        creature_type_id,
        location,
        expires_at,
        in_park
      )
      VALUES (
        (spawn_item->>'creature_type_id')::INT,
        v_location,
        v_expires_at,
        COALESCE((spawn_item->>'in_park')::BOOLEAN, false)
      )
      RETURNING id INTO v_spawn_id;
      
      -- Return success
      RETURN QUERY SELECT v_spawn_id, true;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Return failure for this spawn
        RETURN QUERY SELECT NULL::UUID, false;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION insert_spawn_batch TO authenticated;

-- Verify policies exist
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'spawns'
ORDER BY policyname;

