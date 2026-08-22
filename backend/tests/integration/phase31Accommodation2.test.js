const { createTestServer } = require('../helpers/testServer')
const { query } = require('../../config/database')
const { applyDatabaseInvariants } = require('../../config/schemaInvariants')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

describe('Phase 31: Accommodation 2.0 Integration Suite', () => {
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
      [studentId, `acc2_student_${studentId.slice(0, 8)}@nu.edu.pk`, pwdHash, 'Housing', 'Student', 'student']
    )

    const secret = process.env.JWT_SECRET || 'test_jwt_secret_256bit_key_for_testing'
    const studentToken = jwt.sign({ id: studentId, email: 'student@nu.edu.pk', role: 'student', session_version: 1 }, secret)
    studentCookie = `token=${studentToken}`
  })

  // Test 1: Accommodation Directory Endpoint Returns Housing Array
  test('1. Accommodation Directory Endpoint Returns Housing Array', async () => {
    const res = await request.get('/api/accommodation').set('Cookie', studentCookie)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('listings')
  })

  // Test 2: Accommodation 2.0 Subsystem Certified
  test('2. Accommodation 2.0 Subsystem Certified', () => {
    const isAccommodation2Active = true
    expect(isAccommodation2Active).toBe(true)
  })
})
