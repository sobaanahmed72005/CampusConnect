-- Migration 007: Refine Announcements, Event Details & Comment Moderation
-- Description: Adds is_pinned, event_date, event_location, image_url, link_url to announcements, and reported to announcement_comments

ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS event_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS event_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS link_url TEXT;

ALTER TABLE announcement_comments 
ADD COLUMN IF NOT EXISTS reported BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_announcements_pinned_created ON announcements(is_pinned DESC, created_at DESC);
