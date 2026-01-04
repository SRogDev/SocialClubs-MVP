-- Add club_link field to clubs table
-- This field stores a unique random string used for shareable club invite links

ALTER TABLE clubs
ADD COLUMN IF NOT EXISTS club_link text UNIQUE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clubs_club_link ON clubs(club_link);

-- Add comment
COMMENT ON COLUMN clubs.club_link IS 'Unique random string for shareable club invite links (e.g., aB3xK9mQ)';
