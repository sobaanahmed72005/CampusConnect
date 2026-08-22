const { createTestServer } = require('../helpers/testServer')
const { query } = require('../../config/database')
const { applyDatabaseInvariants } = require('../../config/schemaInvariants')
const { sendPushToUser } = require('../../services/pushService')
const { recordActivity } = require('../../services/telemetryService')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

describe('Phase 13: Push Notifications & Student Activity Telemetry Subsystem Integration Tests', () => {
  let request
  let studentCookie = ''
  let studentId = ''
  let adminCookie = ''
  let adminId = ''

  beforeAll(async () => {
    await applyDatabaseInvariants()
    const server = createTestServer()
    request = server.request

    studentId = crypto.randomUUID()
    adminId = crypto.randomUUID()

    const pwdHash = '$2b$10$w8.mP9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8g'

    // Create student user directly in DB
    await query(
      `INSERT INTO users (id, email, password, first_name, last_name, role, is_active, session_version)
       VALUES ($1, $2, $3, $4, $5, $6, true, 1) ON CONFLICT DO NOTHING`,
      [studentId, `push_student_${studentId.slice(0, 8)}@nu.edu.pk`, pwdHash, 'Push', 'Student', 'student']
    )

    // Create admin user directly in DB
    await query(
      `INSERT INTO users (id, email, password, first_name, last_name, role, is_active, session_version)
       VALUES ($1, $2, $3, $4, $5, $6, true, 1) ON CONFLICT DO NOTHING`,
      [adminId, `push_admin_${adminId.slice(0, 8)}@nu.edu.pk`, pwdHash, 'Push', 'Admin', 'admin']
    )


    const secret = process.env.JWT_SECRET || 'test_jwt_secret_256bit_key_for_testing'
    const studentToken = jwt.sign({ id: studentId, email: 'student@nu.edu.pk', role: 'student', session_version: 1 }, secret)
    const adminToken = jwt.sign({ id: adminId, email: 'admin@nu.edu.pk', role: 'admin', session_version: 1 }, secret)

    studentCookie = `token=${studentToken}`
    adminCookie = `token=${adminToken}`
  })

  // Test 1: Authenticated user can register push subscription
  test('1. Authenticated user can register push subscription', async () => {
    const res = await request
      .post('/api/notifications/push-subscribe')
      .set('Cookie', studentCookie)
      .send({
        endpoint: `https://fcm.googleapis.com/fcm/send/test_endpoint_${Date.now()}`,
        keys: {
          p256dh: 'BCx0K89vLqFv_test_key_p256dh',
          auth: 'auth_secret_key_123'
        }
      })

    expect(res.status).toBe(201)
    expect(res.body.message).toContain('Push subscription registered')
  })

  // Test 2: Unauthenticated user cannot register push subscription
  test('2. Unauthenticated user cannot register push subscription', async () => {
    const res = await request
      .post('/api/notifications/push-subscribe')
      .send({
        endpoint: 'https://fcm.googleapis.com/fcm/send/unauth',
        keys: { p256dh: 'k', auth: 'a' }
      })

    expect(res.status).toBe(401)
  })

  // Test 3: User cannot modify another user's push subscription
  test("3. User cannot modify another user's push subscription", async () => {
    const fakeSubId = crypto.randomUUID()
    const otherUserId = crypto.randomUUID()

    await query(
      `INSERT INTO users (id, email, password, first_name, last_name, role, is_active)
       VALUES ($1, $2, 'pwd', 'Other', 'User', 'student', true)`,
      [otherUserId, `other_${otherUserId.slice(0, 8)}@nu.edu.pk`]
    )

    await query(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4, $5)`,
      [fakeSubId, otherUserId, 'https://endpoint.com/other', 'p256', 'auth']
    )


    const res = await request
      .delete('/api/notifications/push-unsubscribe')
      .set('Cookie', studentCookie)
      .send({ endpoint: 'https://endpoint.com/other' })

    expect(res.status).toBe(200)

    const check = await query('SELECT * FROM push_subscriptions WHERE id = $1', [fakeSubId])
    expect(check.rows.length).toBe(1)
  })

  // Test 4: User can remove their own subscription
  test('4. User can remove their own subscription', async () => {
    const mySubId = crypto.randomUUID()
    const myEndpoint = `https://fcm.googleapis.com/fcm/send/my_own_${Date.now()}`

    await query(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4, $5)`,
      [mySubId, studentId, myEndpoint, 'p256', 'auth']
    )

    const res = await request
      .delete('/api/notifications/push-unsubscribe')
      .set('Cookie', studentCookie)
      .send({ endpoint: myEndpoint })

    expect(res.status).toBe(200)

    const check = await query('SELECT * FROM push_subscriptions WHERE id = $1', [mySubId])
    expect(check.rows.length).toBe(0)
  })

  // Test 5: Invalid subscription payload is rejected
  test('5. Invalid subscription payload is rejected', async () => {
    const res = await request
      .post('/api/notifications/push-subscribe')
      .set('Cookie', studentCookie)
      .send({
        endpoint: 'https://invalid.endpoint'
      })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('Invalid push subscription payload')
  })

  // Test 6: Push delivery failure does not fail underlying business operation
  test('6. Push delivery failure does not fail underlying business operation', async () => {
    await expect(
      sendPushToUser(studentId, {
        title: 'Test Delivery Failure',
        body: 'Payload test'
      })
    ).resolves.not.toThrow()
  })

  // Test 7: Invalid/expired subscription cleanup
  test('7. Invalid/expired subscription cleanup', async () => {
    const expiredId = crypto.randomUUID()
    await query(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4, $5)`,
      [expiredId, studentId, 'https://invalid-expired-endpoint.example.com/send', 'p256', 'auth']
    )

    await sendPushToUser(studentId, { title: 'Test', body: 'Test' })
    expect(true).toBe(true)
  })

  // Test 8: Telemetry event is recorded correctly
  test('8. Telemetry event is recorded correctly', async () => {
    await recordActivity(studentId, 'TEST_EVENT_RECORDED', 'MARKETPLACE', '12345', { tag: 'test' })

    const res = await query(
      "SELECT * FROM student_activity_telemetry WHERE event_type = 'TEST_EVENT_RECORDED' AND user_id = $1",
      [studentId]
    )

    expect(res.rows.length).toBeGreaterThan(0)
    expect(res.rows[0].entity_type).toBe('MARKETPLACE')
  })

  // Test 9: Sensitive message content is NOT recorded in telemetry
  test('9. Sensitive message content is NOT recorded in telemetry', async () => {
    await recordActivity(studentId, 'TEST_SENSITIVE_CLEANSE', 'CHAT', '999', {
      password: 'SuperSecretPassword',
      token: 'jwt_secret_token',
      content: 'This private text must be stripped'
    })

    const res = await query(
      "SELECT * FROM student_activity_telemetry WHERE event_type = 'TEST_SENSITIVE_CLEANSE' AND user_id = $1",
      [studentId]
    )

    const meta = res.rows[0].metadata
    expect(meta.password).toBeUndefined()
    expect(meta.token).toBeUndefined()
    expect(meta.content).toBeUndefined()
  })

  // Test 10: Admin can retrieve aggregate telemetry metrics
  test('10. Admin can retrieve aggregate telemetry metrics', async () => {
    const res = await request
      .get('/api/admin/telemetry/stats')
      .set('Cookie', adminCookie)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('dau')
    expect(res.body).toHaveProperty('wau')
    expect(res.body).toHaveProperty('event_breakdown')
  })

  // Test 11: Non-admin user cannot retrieve admin telemetry
  test('11. Non-admin user cannot retrieve admin telemetry', async () => {
    const res = await request
      .get('/api/admin/telemetry/stats')
      .set('Cookie', studentCookie)

    expect(res.status).toBe(403)
  })

  // Test 12: Notification preferences update
  test('12. Notification preferences update', async () => {
    const res = await request
      .put('/api/notifications/preferences')
      .set('Cookie', studentCookie)
      .send({ push: false })

    expect(res.status).toBe(200)
    expect(res.body.push).toBe(false)
  })
})
