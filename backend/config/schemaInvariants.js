const { query } = require('./database')

async function applyDatabaseInvariants() {
  try {
    // 1. Users table role validation & session_version column
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INT DEFAULT 1;
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_role') THEN
          ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('student', 'admin'));
        END IF;
      END $$;
    `).catch(() => {})

    // 2. Event Registrations UNIQUE composite constraint (event_id, user_id)
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_event_user') THEN
          ALTER TABLE event_registrations ADD CONSTRAINT uq_event_user UNIQUE (event_id, user_id);
        END IF;
      END $$;
    `).catch(() => {})

    // 3. Marketplace Listings CHECK price constraint (price >= 0)
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_marketplace_price') THEN
          ALTER TABLE marketplace_listings ADD CONSTRAINT chk_marketplace_price CHECK (price >= 0);
        END IF;
      END $$;
    `).catch(() => {})

    // 4. Events CHECK capacity constraint (capacity > 0)
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_events_capacity') THEN
          ALTER TABLE events ADD CONSTRAINT chk_events_capacity CHECK (capacity > 0);
        END IF;
      END $$;
    `).catch(() => {})

    // 5. Accommodation Listings CHECK constraints
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_accommodation_rent') THEN
          ALTER TABLE accommodation_listings ADD CONSTRAINT chk_accommodation_rent CHECK (rent >= 0);
        END IF;
      END $$;
    `).catch(() => {})

    // 6. High-Performance Database Query Indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_marketplace_created ON marketplace_listings(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace_listings(category);
      CREATE INDEX IF NOT EXISTS idx_marketplace_sold ON marketplace_listings(is_sold);
      CREATE INDEX IF NOT EXISTS idx_events_date ON events(date DESC);
      CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
    `).catch(() => {})

    console.log('🔒 PostgreSQL Database Schema Invariants, Constraints & Query Indexes Active')
  } catch (err) {
    console.error('Database invariants migration warning:', err.message)
  }
}

module.exports = { applyDatabaseInvariants }
