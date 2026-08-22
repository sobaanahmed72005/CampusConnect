const { createTestServer } = require('../helpers/testServer')
const { query } = require('../../config/database')
const { applyDatabaseInvariants } = require('../../config/schemaInvariants')
const { sanitizeString, sanitizePayload } = require('../../middleware/securityHardening')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

describe('Phase 16: Production Security Hardening & Vulnerability Audit Suite', () => {
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
      [studentId, `sec_student_${studentId.slice(0, 8)}@nu.edu.pk`, pwdHash, 'Security', 'Student', 'student']
    )

    const secret = process.env.JWT_SECRET || 'test_jwt_secret_256bit_key_for_testing'
    const studentToken = jwt.sign({ id: studentId, email: 'student@nu.edu.pk', role: 'student', session_version: 1 }, secret)
    studentCookie = `token=${studentToken}`
  })

  // Test 1: Unauthenticated request to protected endpoints returns HTTP 401
  test('1. Unauthenticated request to protected endpoints returns HTTP 401', async () => {
    const res = await request.get('/api/notifications')
    expect(res.status).toBe(401)
  })

  // Test 2: Non-admin privilege escalation attempt on /api/admin/* returns HTTP 403
  test('2. Non-admin privilege escalation attempt on /api/admin/* returns HTTP 403', async () => {
    const res = await request.get('/api/admin/backups').set('Cookie', studentCookie)
    expect(res.status).toBe(403)

    const res2 = await request.post('/api/admin/exports').set('Cookie', studentCookie).send({ module: 'users' })
    expect(res2.status).toBe(403)
  })

  // Test 3: Path traversal attempt rejection on export download
  test('3. Path traversal attempt rejection on export download', async () => {
    const res = await request.get('/api/admin/exports/..%2F..%2Fetc%2Fpasswd/download').set('Cookie', studentCookie)
    expect([400, 403, 404]).toContain(res.status)
  })

  // Test 4: SQL Injection payload resilience
  test('4. SQL Injection payload resilience', async () => {
    const res = await request
      .post('/api/auth/login')
      .send({
        email: "' OR '1'='1",
        password: "password' OR '1'='1"
      })

    expect([400, 401]).toContain(res.status)
    expect(res.status).not.toBe(500) // Must handle cleanly without SQL syntax exception
  })

  // Test 5: XSS payload sanitization
  test('5. XSS payload sanitization middleware', () => {
    const maliciousInput = '<script>alert("xss")</script>Hello World'
    const cleanStr = sanitizeString(maliciousInput)
    expect(cleanStr).not.toContain('<script>')
    expect(cleanStr).toContain('Hello World')

    const payloadObj = {
      title: '<script>eval("malicious")</script>Listing Title',
      description: 'Clean description text'
    }
    const cleanObj = sanitizePayload(payloadObj)
    expect(cleanObj.title).not.toContain('<script>')
  })

  // Test 6: HTTP Security Headers Enforcement
  test('6. HTTP Security Headers Enforcement', async () => {
    const res = await request.get('/api/health/live')
    expect(res.headers).toHaveProperty('strict-transport-security')
    expect(res.headers['x-frame-options']).toBe('DENY')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
  })

  // Test 7: Session Version Revocation Check
  test('7. Session Version Revocation Check', async () => {
    const secret = process.env.JWT_SECRET || 'test_jwt_secret_256bit_key_for_testing'
    const revokedToken = jwt.sign({ id: studentId, email: 'student@nu.edu.pk', role: 'student', session_version: 999 }, secret)

    const res = await request.get('/api/notifications').set('Cookie', `token=${revokedToken}`)
    expect(res.status).toBe(401)
  })
})
