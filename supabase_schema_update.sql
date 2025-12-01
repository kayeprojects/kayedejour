-- Add images column to notes table
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Example structure of images JSONB:
-- [
--   {
--     "id": "uuid",
--     "thumb": "url_to_thumb",
--     "medium": "url_to_medium",
--     "large": "url_to_large",
--     "caption": "optional"
--   }
-- ]
