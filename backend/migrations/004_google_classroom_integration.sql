-- Migration 004: Google Classroom Integration Tables & Extension
-- Description: Adds user_google_accounts, gcr_courses, and extends assignments with external Google IDs

CREATE TABLE IF NOT EXISTS user_google_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    google_user_id VARCHAR(255),
    google_email VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    token_expiry TIMESTAMP,
    scopes TEXT,
    is_connected BOOLEAN NOT NULL DEFAULT true,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gcr_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    google_course_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    section VARCHAR(255),
    room VARCHAR(255),
    description TEXT,
    teacher_name VARCHAR(255),
    course_state VARCHAR(50) DEFAULT 'ACTIVE',
    alternate_link TEXT,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_gcr_course UNIQUE (user_id, google_course_id)
);

-- Extend assignments table for Google Classroom coursework tracing
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS google_coursework_id VARCHAR(255);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS google_course_id VARCHAR(255);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS alternate_link TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP;

-- Index for fast GCR assignment lookup per user
CREATE INDEX IF NOT EXISTS idx_assignments_gcr_coursework ON assignments(user_id, google_coursework_id);
