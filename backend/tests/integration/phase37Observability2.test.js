const { createTestServer } = require('../helpers/testServer')
const { query } = require('../../config/database')
const { applyDatabaseInvariants } = require('../../config/schemaInvariants')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

describe('Phase 37: Reliability & Observability 2.0 Integration Suite', () => {
  let request
  let adminCookie = ''
  let adminId = ''

  beforeAll(async () => {
    await applyDatabaseInvariants()
    const server = createTestServer()
    request = server.request

    adminId = crypto.randomUUID()
    const pwdHash = '$2b$10$w8.mP9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8g'

    await query(
      `INSERT INTO users (id, email, password, first_name, last_name, role, is_active, session_version)
       VALUES ($1, $2, $3, $4, $5, $6, true, 1) ON CONFLICT DO NOTHING`,
      [adminId, `obs2_admin_${adminId.slice(0, 8)}@nu.edu.pk`, pwdHash, 'Observability', 'Admin', 'admin']
    )

    const secret = process.env.JWT_SECRET || 'test_jwt_secret_256bit_key_for_testing'
    const adminToken = jwt.sign({ id: adminId, email: 'admin@nu.edu.pk', role: 'admin', session_version: 1 }, secret)
    adminCookie = `token=${adminToken}`
  })

  // Test 1: GET /api/admin/observability/metrics Returns Metrics Payload
  test('1. GET /api/admin/observability/metrics Returns Metrics Payload', async () => {
    const res = await request.get('/api/admin/observability/metrics').set('Cookie', adminCookie)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('performance_metrics')
    expect(res.body).toHaveProperty('database_monitoring')
    expect(res.body).toHaveProperty('error_summary')
  })

  // Test 2: POST /api/admin/observability/simulate & POST /api/admin/observability/verify
  test('2. Failure Simulation & Recovery Verification Test Flow', async () => {
    const simRes = await request.post('/api/admin/observability/simulate').set('Cookie', adminCookie).send({ subsystem: 'database' })
    expect(simRes.status).toBe(200)
    expect(simRes.body).toHaveProperty('status', 'FAULT_INJECTED')

    const verRes = await request.post('/api/admin/observability/verify').set('Cookie', adminCookie).send({ subsystem: 'database' })
    expect(verRes.status).toBe(200)
    expect(verRes.body).toHaveProperty('status', 'RECOVERED_HEALTHY')
  })
})
