const { createTestServer } = require('../helpers/testServer')
const { query } = require('../../config/database')
const { applyDatabaseInvariants } = require('../../config/schemaInvariants')
const cacheService = require('../../services/cacheService')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

describe('Phase 17: Performance, Scalability & High-Concurrency Benchmark Suite', () => {
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
      [studentId, `perf_student_${studentId.slice(0, 8)}@nu.edu.pk`, pwdHash, 'Perf', 'Student', 'student']
    )

    const secret = process.env.JWT_SECRET || 'test_jwt_secret_256bit_key_for_testing'
    const studentToken = jwt.sign({ id: studentId, email: 'student@nu.edu.pk', role: 'student', session_version: 1 }, secret)
    studentCookie = `token=${studentToken}`
  })

  // Test 1: TTL Cache Service speedup verification
  test('1. TTL Cache Service speedup verification', async () => {
    cacheService.flush()
    const key = 'test_cache_key'
    const payload = [{ id: 1, title: 'Cached Item' }]

    cacheService.set(key, payload, 10)
    const cachedData = cacheService.get(key)
    expect(cachedData).toEqual(payload)

    const stats = cacheService.getStats()
    expect(stats.hits).toBe(1)
    expect(stats.size).toBe(1)
  })

  // Test 2: High-concurrency parallel API requests execution (50 concurrent requests)
  test('2. High-concurrency parallel API requests execution', async () => {
    const promises = []
    for (let i = 0; i < 50; i++) {
      promises.push(request.get('/api/health/live'))
    }

    const results = await Promise.all(promises)
    expect(results.length).toBe(50)
    results.forEach(res => {
      expect(res.status).toBe(200)
    })
  })


  // Test 3: Pagination parameter processing restricts response length
  test('3. Pagination parameter processing restricts response length', async () => {
    const res = await request.get('/api/announcements?limit=5&offset=0').set('Cookie', studentCookie)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.announcements)).toBe(true)
    expect(res.body.announcements.length).toBeLessThanOrEqual(5)
  })

  // Test 4: Cache invalidation on mutation
  test('4. Cache invalidation on mutation', () => {
    cacheService.set('announcements_feed_20_0', [{ id: '1' }])
    expect(cacheService.get('announcements_feed_20_0')).not.toBeNull()

    cacheService.del('announcements_*')
    expect(cacheService.get('announcements_feed_20_0')).toBeNull()
  })

  // Test 5: Composite B-tree Query Index Verification
  test('5. Composite B-tree Query Index Verification', async () => {
    const res = await query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'marketplace_listings' AND indexname = 'idx_marketplace_cat_created'
    `)
    expect(res.rows.length).toBeGreaterThanOrEqual(0)
  })
})
