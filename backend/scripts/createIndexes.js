require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../config/database');

async function createIndexes() {
  const c = await pool.connect();
  try {
    console.log('⚡ Creating database performance indexes...');

    const indexes = [
      // Users indexes
      "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
      "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
      "CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id)",

      // Events indexes
      "CREATE INDEX IF NOT EXISTS idx_events_date ON events(date)",
      "CREATE INDEX IF NOT EXISTS idx_events_category ON events(category)",
      "CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by)",
      "CREATE INDEX IF NOT EXISTS idx_event_reg_user_event ON event_registrations(user_id, event_id)",

      // Marketplace indexes
      "CREATE INDEX IF NOT EXISTS idx_marketplace_cat_sold ON marketplace_listings(category, is_sold)",
      "CREATE INDEX IF NOT EXISTS idx_marketplace_price ON marketplace_listings(price)",
      "CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON marketplace_listings(seller_id)",
      "CREATE INDEX IF NOT EXISTS idx_marketplace_created ON marketplace_listings(created_at DESC)",

      // Lost & Found indexes
      "CREATE INDEX IF NOT EXISTS idx_lf_type_resolved ON lost_found_reports(type, is_resolved)",
      "CREATE INDEX IF NOT EXISTS idx_lf_category ON lost_found_reports(category)",
      "CREATE INDEX IF NOT EXISTS idx_lf_created ON lost_found_reports(created_at DESC)",

      // Accommodation indexes
      "CREATE INDEX IF NOT EXISTS idx_acc_type_avail ON accommodation_listings(type, is_available)",
      "CREATE INDEX IF NOT EXISTS idx_acc_gender ON accommodation_listings(gender_preference)",
      "CREATE INDEX IF NOT EXISTS idx_acc_price ON accommodation_listings(price)",

      // Notifications indexes
      "CREATE INDEX IF NOT EXISTS idx_notif_user_read ON notifications(user_id, is_read, created_at DESC)",

      // Audit Logs indexes
      "CREATE INDEX IF NOT EXISTS idx_audit_type_date ON audit_logs(target_type, created_at DESC)"
    ];

    for (const sql of indexes) {
      await c.query(sql);
    }

    console.log('✅ Performance indexes created successfully!');
  } catch (err) {
    console.error('❌ Error creating indexes:', err.message);
  } finally {
    c.release();
    pool.end();
  }
}

createIndexes();
