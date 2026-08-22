-- Migration 006: Standardize Announcement Categories & Add Discussion Threads
-- Description: Updates announcements table with 8 standardized categories and creates announcement_comments for student discussion threads

-- Map legacy categories to new standardized names
UPDATE announcements SET category = '🔔 General Update' WHERE category IN ('general', 'General', 'default');
UPDATE announcements SET category = '🚨 Urgent Alert' WHERE category IN ('urgent', 'Urgent');
UPDATE announcements SET category = '📢 Official Announcement' WHERE category IN ('academic', 'Academic', 'official', 'Official');
UPDATE announcements SET category = '🎉 Event Announcement' WHERE category IN ('events', 'Events');
UPDATE announcements SET category = '🎓 Society Announcement' WHERE category IN ('society', 'Society', 'clubs');

-- Create discussion comments table for student conversations
CREATE TABLE IF NOT EXISTS announcement_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    author_name VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcement_comments_id ON announcement_comments(announcement_id, created_at DESC);
