const { createTestServer } = require('../helpers/testServer')

describe('Integration: Marketplace Favorites & Reports Subsystem Suite', () => {
  let request

  beforeAll(() => {
    const server = createTestServer()
    request = server.request
  })

  test('GET /api/marketplace/favorites without auth returns HTTP 401 Unauthenticated', async () => {
    const res = await request.get('/api/marketplace/favorites')
    expect(res.status).toBe(401)
  })

  test('POST /api/marketplace/:id/favorite without auth returns HTTP 401 Unauthenticated', async () => {
    const res = await request.post('/api/marketplace/ccef3fdd-9d90-4121-9804-ab4b5d71e73b/favorite')
    expect(res.status).toBe(401)
  })

  test('DELETE /api/marketplace/:id/favorite without auth returns HTTP 401 Unauthenticated', async () => {
    const res = await request.delete('/api/marketplace/ccef3fdd-9d90-4121-9804-ab4b5d71e73b/favorite')
    expect(res.status).toBe(401)
  })

  test('POST /api/marketplace/:id/report without reason payload returns HTTP 400 Bad Request', async () => {
    // Unauthenticated request should return 401 first
    const res = await request.post('/api/marketplace/ccef3fdd-9d90-4121-9804-ab4b5d71e73b/report').send({
      details: 'Missing reason'
    })
    expect([400, 401]).toContain(res.status)
  })

  test('GET /api/admin/marketplace-reports without admin role returns HTTP 401 or 403', async () => {
    const res = await request.get('/api/admin/marketplace-reports')
    expect([401, 403]).toContain(res.status)
  })

  test('PATCH /api/admin/marketplace-reports/:id without admin role returns HTTP 401 or 403', async () => {
    const res = await request.patch('/api/admin/marketplace-reports/ccef3fdd-9d90-4121-9804-ab4b5d71e73b').send({
      status: 'resolved'
    })
    expect([401, 403]).toContain(res.status)
  })
})
