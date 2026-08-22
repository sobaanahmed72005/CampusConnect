const fs = require('fs')
const path = require('path')
const { getClient } = require('../config/database')

async function runMigrations() {
  const client = await getClient()
  try {
    console.log('🔄 Starting Database Migration Pipeline...')

    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // 2. Read migration files sequentially
    const migrationsDir = path.join(__dirname, '..', 'migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      // Check if migration has already executed
      const check = await client.query('SELECT filename FROM schema_migrations WHERE filename = $1', [file])
      if (check.rows.length > 0) {
        console.log(` ⏭️  Skipping migration: ${file} (Already applied)`)
        continue
      }

      console.log(` 🚀 Executing migration: ${file}...`)
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')

      // Execute migration inside atomic SQL transaction
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])
      await client.query('COMMIT')

      console.log(` ✅ Successfully applied: ${file}`)
    }

    console.log('🎉 Database Migration Pipeline Completed Successfully!')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('⚠️ Migration notice:', err.message || err)
  } finally {
    client.release()
  }
}

if (require.main === module) {
  runMigrations().then(() => process.exit(0))
}

module.exports = { runMigrations }
