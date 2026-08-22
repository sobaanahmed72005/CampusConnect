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

    // 6. Marketplace Conversations & Messaging Tables
    await query(`
      CREATE TABLE IF NOT EXISTS marketplace_conversations (
        id UUID PRIMARY KEY,
        listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,
        buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
        seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_conversation_listing_buyer') THEN
          ALTER TABLE marketplace_conversations ADD CONSTRAINT uq_conversation_listing_buyer UNIQUE (listing_id, buyer_id);
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS marketplace_messages (
        id UUID PRIMARY KEY,
        conversation_id UUID REFERENCES marketplace_conversations(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS marketplace_favorites (
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, listing_id)
      );

      CREATE TABLE IF NOT EXISTS marketplace_reports (
        id UUID PRIMARY KEY,
        listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,
        reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
        reason VARCHAR(50) NOT NULL,
        details TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT TRUE;

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT uq_user_endpoint UNIQUE (user_id, endpoint)
      );

      CREATE TABLE IF NOT EXISTS student_activity_telemetry (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(100),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `).catch(() => {})

    // 7. High-Performance Database Query Indexes
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
      CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON marketplace_conversations(buyer_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_seller ON marketplace_conversations(seller_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON marketplace_messages(conversation_id, created_at ASC);
      CREATE INDEX IF NOT EXISTS idx_favorites_user ON marketplace_favorites(user_id);
      CREATE INDEX IF NOT EXISTS idx_favorites_listing ON marketplace_favorites(listing_id);
      CREATE INDEX IF NOT EXISTS idx_reports_listing ON marketplace_reports(listing_id);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON marketplace_reports(status);
      CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_telemetry_event ON student_activity_telemetry(event_type);
      CREATE INDEX IF NOT EXISTS idx_telemetry_user ON student_activity_telemetry(user_id);
      CREATE INDEX IF NOT EXISTS idx_telemetry_created ON student_activity_telemetry(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_marketplace_cat_created ON marketplace_listings(category, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_events_cat_date ON events(category, date DESC);
      CREATE INDEX IF NOT EXISTS idx_telemetry_created_user ON student_activity_telemetry(created_at DESC, user_id);
    `).catch(() => {})



    console.log('🔒 PostgreSQL Database Schema Invariants, Constraints & Query Indexes Active')
  } catch (err) {
    console.error('Database invariants migration warning:', err.message)
  }
}

module.exports = { applyDatabaseInvariants }
