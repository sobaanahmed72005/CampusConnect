-- Migration 005: Student-Controlled Platform Cleanup
-- Description: Safely drops unused GCR and attendance tables, simplifying database schema for student-controlled operation

DROP TABLE IF EXISTS user_google_accounts CASCADE;
DROP TABLE IF EXISTS gcr_courses CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;

-- Remove GCR foreign columns from assignments
ALTER TABLE assignments DROP COLUMN IF EXISTS google_coursework_id;
ALTER TABLE assignments DROP COLUMN IF EXISTS google_course_id;
ALTER TABLE assignments DROP COLUMN IF EXISTS alternate_link;
ALTER TABLE assignments DROP COLUMN IF EXISTS synced_at;
