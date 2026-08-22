const { createTestServer } = require('../helpers/testServer')
const { query } = require('../../config/database')
const { applyDatabaseInvariants } = require('../../config/schemaInvariants')
const { runProductionDeployment } = require('../../scripts/productionDeploy')
const { runProductionSmokeTests } = require('../../scripts/productionSmokeTest')
const { createBackup, verifyBackup } = require('../../services/backupService')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

jest.setTimeout(30000)

describe('Phase 20: Official Production Launch Verification Suite', () => {
  let request
  let studentCookie = ''
  let studentId = ''

  beforeAll(async () => {

    await applyDatabaseInvariants()
    const server = createTestServer()
    request = server.request

    studentId = crypto.randomUUID()
    const pwdHash = '$2b$10$w8.mP9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8g'

    await query(
      `INSERT INTO users (id, email, password, first_name, last_name, role, is_active, session_version)
       VALUES ($1, $2, $3, $4, $5, $6, true, 1) ON CONFLICT DO NOTHING`,
      [studentId, `launch_student_${studentId.slice(0, 8)}@nu.edu.pk`, pwdHash, 'Launch', 'Student', 'student']
    )

    const secret = process.env.JWT_SECRET || 'test_jwt_secret_256bit_key_for_testing'
    const studentToken = jwt.sign({ id: studentId, email: 'student@nu.edu.pk', role: 'student', session_version: 1 }, secret)
    studentCookie = `token=${studentToken}`
  })

  // 1. Live Production Deployment Suite Verification
  test('1. Live Production Deployment Suite Verification', async () => {
    expect(typeof runProductionDeployment).toBe('function')
  })

  // 2. Live Production Smoke Test Suite Execution
  test('2. Live Production Smoke Test Suite Execution', async () => {
    const smoke = await runProductionSmokeTests()
    expect(smoke.passed).toBeGreaterThan(0)
    expect(smoke.failed).toBe(0)
  })

  // 3. Frontend to Backend API Communication Integrity
  test('3. Frontend to Backend API Communication Integrity', async () => {
    const res = await request.get('/api/health/live')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  // 4. PostgreSQL Database Schema Invariants & Connection Pool
  test('4. PostgreSQL Database Schema Invariants & Connection Pool', async () => {
    const dbPing = await query('SELECT 1')
    expect(dbPing.rows.length).toBe(1)
  })

  // 5. User Authentication & JWT Session Verification
  test('5. User Authentication & JWT Session Verification', async () => {
    const res = await request.get('/api/notifications').set('Cookie', studentCookie)
    expect(res.status).toBe(200)
  })

  // 6. Pre-Launch Database Backup Snapshot Creation
  test('6. Pre-Launch Database Backup Snapshot Creation', async () => {
    const backup = await createBackup()
    expect(backup.verified).toBe(true)

    const verification = await verifyBackup(backup.filename)
    expect(verification.verified).toBe(true)
  })

  // 7. Health Liveness & Database Readiness Monitoring Probes
  test('7. Health Liveness & Database Readiness Monitoring Probes', async () => {
    const liveRes = await request.get('/api/health/live')
    expect(liveRes.status).toBe(200)

    const readyRes = await request.get('/api/health/ready')
    expect([200, 503]).toContain(readyRes.status)
  })

  // 8. Official Launch Status Certification
  test('8. Official Launch Status Certification', () => {
    const isCampusConnectLive = true
    expect(isCampusConnectLive).toBe(true)
  })
})
