-- Add sprite_id column to store Pokengine sprite IDs
-- Pokengine sprite URLs use IDs like "0016spl5" in the format:
-- https://pokengine.b-cdn.net/play/images/mons/fronts/{ID}.webp?t=26

ALTER TABLE creature_types 
ADD COLUMN IF NOT EXISTS sprite_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS creature_types_sprite_id_idx ON creature_types(sprite_id);

-- Add comment explaining the column
COMMENT ON COLUMN creature_types.sprite_id IS 'Pokengine sprite ID (e.g., "0016spl5") used to construct sprite URLs';

