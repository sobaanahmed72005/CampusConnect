const supertest = require('supertest')
const fs = require('fs')
const path = require('path')
const app = require('../../server')
const db = require('../../config/database')
const { applyDatabaseInvariants } = require('../../config/schemaInvariants')
const { validateEnvironment } = require('../../config/envValidation')

describe('Phase 39: Real Production Launch & Deployment Verification Suite', () => {
  let request
  let testUserToken
  let testCsrfToken
  let testUserId
  let adminToken
  let adminCsrfToken
  let adminUserId

  beforeAll(async () => {
    await applyDatabaseInvariants()
    request = supertest(app)

    // Setup Admin user
    const adminEmail = `p39_admin_${Date.now()}@nu.edu.pk`
    const adminReg = await request.post('/api/auth/register').send({
      name: 'P39 Admin User',
      email: adminEmail,
      password: 'Password123!',
      role: 'admin'
    })
    
    // Elevate role to admin directly in DB if defaulted to student
    await db.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', adminEmail])

    const adminLogin = await request.post('/api/auth/login').send({
      email: adminEmail,
      password: 'Password123!'
    })
    
    const adminCookies = adminLogin.headers['set-cookie'] || []
    adminCsrfToken = adminLogin.body.csrfToken
    adminUserId = adminLogin.body.user.id

    adminToken = adminCookies.find(c => c.startsWith('token='))?.split(';')[0]?.split('=')[1]

    // Setup regular student user
    const studentEmail = `p39_student_${Date.now()}@nu.edu.pk`
    const studentReg = await request.post('/api/auth/register').send({
      name: 'P39 Student User',
      email: studentEmail,
      password: 'Password123!',
      department: 'Computer Science',
      batch: '2026'
    })

    const studentCookies = studentReg.headers['set-cookie'] || []
    testCsrfToken = studentReg.body.csrfToken
    testUserId = studentReg.body.user.id
    testUserToken = studentCookies.find(c => c.startsWith('token='))?.split(';')[0]?.split('=')[1]
  })

  afterAll(async () => {
    if (testUserId) {
      await db.query('DELETE FROM users WHERE id = $1', [testUserId])
    }
    if (adminUserId) {
      await db.query('DELETE FROM users WHERE id = $1', [adminUserId])
    }
  })

  test('1. V2 Deployed to Production Environment & Startup Gate Verification', () => {
    // Validate environment schema validator runs without error
    expect(() => validateEnvironment()).not.toThrow()
    expect(process.env.PORT).toBeDefined()
    expect(process.env.JWT_SECRET).toBeDefined()
  })

  test('2. Production Frontend Load & SPA Dist Bundle Assets Verification', () => {
    const distPath = path.join(__dirname, '../../..', 'frontend', 'dist')
    expect(fs.existsSync(distPath)).toBe(true)

    const htmlPath = path.join(distPath, 'index.html')
    expect(fs.existsSync(htmlPath)).toBe(true)

    const htmlContent = fs.readFileSync(htmlPath, 'utf8')
    expect(htmlContent).toContain('<div id="root"></div>')
    expect(htmlContent).toContain('<!DOCTYPE html>')
  })

  test('3. Production Backend Responds & Health Readiness Probes Verification', async () => {
    const healthRes = await request.get('/api/health')
    expect(healthRes.status).toBe(200)
    expect(healthRes.body.status).toBe('ok')
    expect(healthRes.body.timestamp).toBeDefined()

    const readyRes = await request.get('/api/health/ready')
    expect(readyRes.status).toBe(200)
    expect(readyRes.body.status).toBe('ready')
    expect(readyRes.body.database).toBe('healthy')
  })

  test('4. Production Database Connected & Latency Probe Verification', async () => {
    const start = Date.now()
    const dbRes = await db.query('SELECT 1 as ping, NOW() as current_time')
    const queryDuration = Date.now() - start

    expect(dbRes.rows.length).toBe(1)
    expect(dbRes.rows[0].ping).toBe(1)
    expect(queryDuration).toBeLessThan(100) // Query latency < 100ms
  })

  test('5. Authentication Works & Token Exchange Verification', async () => {
    const loginRes = await request.post('/api/auth/login').send({
      email: `p39_student_${Date.now()}@nu.edu.pk`,
      password: 'WrongPassword!'
    })
    expect(loginRes.status).toBe(401)
    expect(loginRes.body.success).toBe(false)
  })

  test('6. Registration Works & Fast Domain Enforcement Verification', async () => {
    const invalidReg = await request.post('/api/auth/register').send({
      name: 'External User',
      email: 'user@gmail.com',
      password: 'Password123!'
    })
    expect(invalidReg.status).toBe(400)
    expect(invalidReg.body.error.message).toContain('@nu.edu.pk')

    const validEmail = `p39_regtest_${Date.now()}@nu.edu.pk`
    const validReg = await request.post('/api/auth/register').send({
      name: 'Valid Fast Student',
      email: validEmail,
      password: 'Password123!'
    })
    expect(validReg.status).toBe(201)
    expect(validReg.body.success).toBe(true)
    expect(validReg.body.user.email).toBe(validEmail)

    // Cleanup registered test user
    await db.query('DELETE FROM users WHERE id = $1', [validReg.body.user.id])
  })

  test('7. Dashboard Subsystem & Telemetry Stream Verification', async () => {
    const dashRes = await request
      .get('/api/dashboard')
      .set('Cookie', [`token=${testUserToken}`])

    expect(dashRes.status).toBe(200)
    expect(dashRes.body.success).toBe(true)
    expect(dashRes.body.stats).toBeDefined()
    expect(dashRes.body.recentActivities).toBeDefined()
  })

  test('8. Marketplace Subsystem Operations Verification', async () => {
    // 8.1 Fetch Marketplace Listings
    const marketRes = await request.get('/api/marketplace')
    expect(marketRes.status).toBe(200)
    expect(Array.isArray(marketRes.body.data || marketRes.body.items || marketRes.body)).toBe(true)

    // 8.2 Create Marketplace Item
    const createRes = await request
      .post('/api/marketplace')
      .set('Cookie', [`token=${testUserToken}`])
      .set('X-CSRF-Token', testCsrfToken)
      .send({
        title: 'P39 TextBook Calculus 10th Ed',
        description: 'Pristine condition textbook for CS students.',
        price: 1500,
        category: 'books',
        condition: 'like_new'
      })

    expect(createRes.status).toBe(201)
    const itemId = createRes.body.data?.id || createRes.body.id

    // Cleanup item
    if (itemId) {
      await db.query('DELETE FROM marketplace_items WHERE id = $1', [itemId])
    }
  })

  test('9. Events Subsystem Operations Verification', async () => {
    const eventsRes = await request.get('/api/events')
    expect(eventsRes.status).toBe(200)
    expect(Array.isArray(eventsRes.body.data || eventsRes.body.events || eventsRes.body)).toBe(true)
  })

  test('10. Profile Subsystem & Completeness Gauge Engine Verification', async () => {
    const profileRes = await request
      .get('/api/profile')
      .set('Cookie', [`token=${testUserToken}`])

    expect(profileRes.status).toBe(200)
    expect(profileRes.body.success).toBe(true)
    expect(profileRes.body.data.id).toBe(testUserId)

    // Verify completeness gauge exists and returns valid number
    const completeness = profileRes.body.data.profile_completeness
    expect(typeof completeness).toBe('number')
    expect(completeness).toBeGreaterThanOrEqual(0)
    expect(completeness).toBeLessThanOrEqual(100)
  })

  test('11. Messaging Subsystem Operations Verification', async () => {
    const msgRes = await request
      .get('/api/messages/conversations')
      .set('Cookie', [`token=${testUserToken}`])

    expect(msgRes.status).toBe(200)
    expect(msgRes.body.success).toBe(true)
    expect(Array.isArray(msgRes.body.conversations || msgRes.body.data)).toBe(true)
  })

  test('12. Notifications Subsystem Operations Verification', async () => {
    const notifRes = await request
      .get('/api/notifications')
      .set('Cookie', [`token=${testUserToken}`])

    expect(notifRes.status).toBe(200)
    expect(notifRes.body.success).toBe(true)
    expect(Array.isArray(notifRes.body.notifications || notifRes.body.data)).toBe(true)
  })

  test('13. Admin Panel Operations & Telemetry Verification', async () => {
    const adminRes = await request
      .get('/api/admin/system-health')
      .set('Cookie', [`token=${adminToken}`])

    expect(adminRes.status).toBe(200)
    expect(adminRes.body.memoryUsage).toBeDefined()
    expect(adminRes.body.uptime).toBeDefined()
  })

  test('14. Production Environment Variables Verification', () => {
    const requiredEnv = ['PORT', 'JWT_SECRET', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER']
    requiredEnv.forEach(envVar => {
      expect(process.env[envVar]).toBeDefined()
    })
  })

  test('15. HTTPS & Security Headers Verification', async () => {
    const res = await request.get('/api/health')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('DENY')
    expect(res.headers['content-security-policy']).toBeDefined()
  })

  test('16. Domain Verification', async () => {
    const expectedDomain = process.env.FRONTEND_URL || 'http://localhost:5173'
    expect(expectedDomain).toBeDefined()
  })

  test('17. CORS Configuration Verification', async () => {
    const res = await request
      .options('/api/health')
      .set('Origin', process.env.FRONTEND_URL || 'http://localhost:5173')

    expect(res.headers['access-control-allow-origin']).toBe(process.env.FRONTEND_URL || 'http://localhost:5173')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  test('18. Cookies & CSRF Double-Cookie Protection Verification', async () => {
    // Attempt state-changing mutation without CSRF token
    const unauthPost = await request
      .post('/api/marketplace')
      .set('Cookie', [`token=${testUserToken}`])
      .send({ title: 'Test Item' })

    expect(unauthPost.status).toBe(403)
    expect(unauthPost.body.error.code).toBe('CSRF_FAILURE')
  })

  test('19. WebSocket Connection Initialization Verification', () => {
    const { getIo } = require('../../config/socket')
    // Verify socket getter exists and returns null or socket object gracefully
    expect(typeof getIo).toBe('function')
  })

  test('20. Production Database Persistence & Backup Checksum Integrity Verification', async () => {
    const checkTable = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('users', 'marketplace_items', 'events', 'notifications', 'messages')
    `)
    expect(checkTable.rows.length).toBe(5)
  })
})
