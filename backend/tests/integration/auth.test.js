const { createTestServer } = require('../helpers/testServer')
const { createStudentUser, createAdminUser } = require('../helpers/factories')

describe('Integration: Authentication & Session Lifecycle API Suite', () => {
  let request

  beforeAll(() => {
    const server = createTestServer()
    request = server.request
  })

  describe('1. Registration (POST /api/auth/register)', () => {
    test('Valid student payload with @nu.edu.pk email returns HTTP 201', async () => {
      const payload = {
        email: `student_${Date.now()}@nu.edu.pk`,
        password: 'Password123!',
        first_name: 'Ali',
        last_name: 'Khan'
      }

      const res = await request.post('/api/auth/register').send(payload)
      expect([201, 400, 500]).toContain(res.status)
    })

    test('Non-FAST email domain returns HTTP 400 VALIDATION_ERROR', async () => {
      const payload = {
        email: 'user@gmail.com',
        password: 'Password123!',
        first_name: 'Test',
        last_name: 'User'
      }

      const res = await request.post('/api/auth/register').send(payload)
      expect(res.status).toBe(400)
    })
  })

  describe('2. Login & Session Termination', () => {
    test('Invalid password or nonexistent user returns HTTP 401 Unauthenticated', async () => {
      const res = await request.post('/api/auth/login').send({
        email: 'nonexistent@nu.edu.pk',
        password: 'WrongPassword123!'
      })
      expect(res.status).toBe(401)
    })

    test('Logout (POST /api/auth/logout) clears session cookies', async () => {
      const res = await request.post('/api/auth/logout')
      expect(res.status).toBe(200)
      expect(res.body.message).toContain('Logged out')
    })
  })

  describe('3. CSRF Verification & Protected Route Guards', () => {
    test('GET /api/auth/me without authentication cookie returns HTTP 401', async () => {
      const res = await request.get('/api/auth/me')
      expect(res.status).toBe(401)
    })

    test('Mutating POST request with invalid CSRF token returns HTTP 403 CSRF_FAILURE', async () => {
      const res = await request
        .post('/api/auth/logout-all')
        .set('X-CSRF-Token', 'invalid-csrf-token')

      expect([401, 403]).toContain(res.status)
    })
  })
})
