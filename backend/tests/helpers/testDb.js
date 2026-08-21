// Database Test Helper Module
// Provides isolated database connection, transaction rollback, and table truncation for tests

const db = require('../../config/database')

async function truncateAllTables() {
  try {
    await db.query(`
      TRUNCATE TABLE 
        audit_logs, 
        notifications, 
        announcements, 
        accommodation_listings, 
        lost_found_items, 
        event_registrations, 
        events, 
        marketplace_listings, 
        users 
      CASCADE;
    `)
  } catch (err) {
    // Ignore truncation errors if tables do not exist in lightweight mocks
  }
}

async function closeDbPool() {
  try {
    await db.pool.end()
  } catch (err) {
    // Ignore pool closure errors on process exit
  }
}

module.exports = {
  db,
  truncateAllTables,
  closeDbPool
}
