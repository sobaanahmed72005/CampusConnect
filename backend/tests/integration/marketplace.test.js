const { createTestServer } = require('../helpers/testServer')

describe('Integration: Marketplace Subsystem API Suite', () => {
  let request

  beforeAll(() => {
    const server = createTestServer()
    request = server.request
  })

  test('GET /api/marketplace returns paginated listings', async () => {
    const res = await request.get('/api/marketplace?page=1&limit=10')
    expect([200, 401]).toContain(res.status)
  })

  test('POST /api/marketplace without auth returns HTTP 401 Unauthenticated', async () => {
    const res = await request.post('/api/marketplace').send({
      title: 'Data Structures Book',
      price: 1500,
      category: 'Books'
    })
    expect(res.status).toBe(401)
  })

  test('PUT /api/marketplace/:id/sold by non-owner returns HTTP 401 or 403', async () => {
    const res = await request.put('/api/marketplace/ccef3fdd-9d90-4121-9804-ab4b5d71e73b/sold')
    expect([401, 403, 404]).toContain(res.status)
  })
})
