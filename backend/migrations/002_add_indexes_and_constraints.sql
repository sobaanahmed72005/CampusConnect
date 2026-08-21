-- Migration 002: Add Indexes & Schema Invariants
-- Description: Adds B-Tree query indexes, CHECK constraints, and UNIQUE constraints

-- CHECK Constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('student', 'admin'));

ALTER TABLE marketplace_listings DROP CONSTRAINT IF EXISTS chk_marketplace_price;
ALTER TABLE marketplace_listings ADD CONSTRAINT chk_marketplace_price CHECK (price >= 0);

ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_events_capacity;
ALTER TABLE events ADD CONSTRAINT chk_events_capacity CHECK (capacity > 0);

ALTER TABLE accommodation_listings DROP CONSTRAINT IF EXISTS chk_accommodation_rent;
ALTER TABLE accommodation_listings ADD CONSTRAINT chk_accommodation_rent CHECK (rent_monthly >= 0);

-- UNIQUE Constraints
ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS uq_event_user;
ALTER TABLE event_registrations ADD CONSTRAINT uq_event_user UNIQUE (event_id, user_id);

-- High-Performance B-Tree Query Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_marketplace_created ON marketplace_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_sold ON marketplace_listings(is_sold);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date DESC);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
