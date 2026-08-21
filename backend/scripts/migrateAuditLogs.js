require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../config/database');

async function migrateAuditLogs() {
  const c = await pool.connect();
  try {
    console.log('🔧 Creating audit_logs table...');

    await c.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
        admin_name VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50) NOT NULL,
        target_id VARCHAR(255),
        details TEXT,
        ip_address VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    console.log('✅ audit_logs table created.');

    // Seed sample audit log records
    const adminRes = await c.query("SELECT id, first_name, last_name FROM users WHERE role='admin' LIMIT 1");
    if (adminRes.rows.length > 0) {
      const admin = adminRes.rows[0];
      const adminName = `${admin.first_name} ${admin.last_name}`;

      const sampleLogs = [
        { action: 'ROLE_CHANGE', target_type: 'USER', target_id: 'student-01', details: 'Promoted user student@campus.edu to Administrator' },
        { action: 'EVENT_CREATE', target_type: 'EVENT', target_id: 'ev-101', details: 'Created campus event: Entrepreneurship Workshop' },
        { action: 'MARKETPLACE_MODERATION', target_type: 'LISTING', target_id: 'item-88', details: 'Removed reported listing: Disguised phone case' },
        { action: 'USER_SUSPEND', target_type: 'USER', target_id: 'user-99', details: 'Suspended user account for spam activity' },
      ];

      for (const log of sampleLogs) {
        await c.query(`
          INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, details, ip_address)
          VALUES ($1, $2, $3, $4, $5, $6, '127.0.0.1')
        `, [admin.id, adminName, log.action, log.target_type, log.target_id, log.details]);
      }

      console.log('✅ Seeded sample admin audit logs.');
    }

  } catch (err) {
    console.error('❌ Audit logs migration error:', err.message);
  } finally {
    c.release();
    pool.end();
  }
}

migrateAuditLogs();
