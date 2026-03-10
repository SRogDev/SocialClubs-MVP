-- Add pinned column to posts for countdown widgets
ALTER TABLE posts ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;

-- Index for efficiently fetching pinned posts per club
CREATE INDEX IF NOT EXISTS idx_posts_club_pinned ON posts (club_id, pinned)
WHERE pinned = true;
