/**
 * Live Production Smoke Test Suite
 * Validates critical subsystem workflows on live/staging instances.
 */

const { query } = require('../config/database')

async function runProductionSmokeTests() {
  console.log('==================================================')
  console.log('CAMPUSCONNECT PRODUCTION SMOKE TEST SUITE')
  console.log('==================================================')

  let passed = 0
  let failed = 0

  async function check(name, fn) {
    try {
      await fn()
      console.log(`  ✅ PASS: ${name}`)
      passed++
    } catch (err) {
      console.error(`  ❌ FAIL: ${name} (${err.message})`)
      failed++
    }
  }

  // 1. Database Connectivity & Readiness
  await check('Database Readiness Ping', async () => {
    const res = await query('SELECT 1')
    if (res.rows.length === 0) throw new Error('Query returned 0 rows')
  })

  // 2. Schema Invariants Integrity
  await check('Users & Marketplace Tables Schema Integrity', async () => {
    const res = await query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('users', 'marketplace_listings', 'push_subscriptions', 'student_activity_telemetry')
    `)
    if (res.rows.length < 4) throw new Error('One or more required schema invariant tables missing')
  })

  // 3. Marketplace Feed Active Listings Query
  await check('Marketplace Listings Feed Integrity', async () => {
    const res = await query('SELECT COUNT(*) FROM marketplace_listings')
    if (!res.rows) throw new Error('Failed to query marketplace listings')
  })

  // 4. Push Subscriptions & Telemetry Tables
  await check('Push Subscriptions & Telemetry Readiness', async () => {
    const res = await query('SELECT COUNT(*) FROM push_subscriptions')
    const res2 = await query('SELECT COUNT(*) FROM student_activity_telemetry')
    if (!res.rows || !res2.rows) throw new Error('Failed telemetry/push table query')
  })

  // 5. Audit Log System Active
  await check('Audit Log Subsystem Verification', async () => {
    const res = await query('SELECT COUNT(*) FROM audit_logs')
    if (!res.rows) throw new Error('Audit logs query failed')
  })

  // 6. User Account Table Integrity
  await check('User Authentication Subsystem Verification', async () => {
    const res = await query('SELECT id, email, role FROM users LIMIT 1')
    if (res.rows.length === 0) throw new Error('User table query returned zero rows')
  })

  console.log('==================================================')
  console.log(`SMOKE TEST RESULTS: ${passed} Passed, ${failed} Failed (${passed + failed} Total)`)
  console.log('==================================================')

  if (failed > 0) {
    throw new Error(`${failed} smoke tests failed`)
  }

  return { passed, failed }
}

if (require.main === module) {
  runProductionSmokeTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

module.exports = { runProductionSmokeTests }
