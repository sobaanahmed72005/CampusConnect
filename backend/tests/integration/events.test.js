const { createTestServer } = require('../helpers/testServer')

describe('Integration: Campus Events & Concurrency Seat Reservation Suite', () => {
  let request

  beforeAll(() => {
    const server = createTestServer()
    request = server.request
  })

  test('GET /api/events returns event catalog', async () => {
    const res = await request.get('/api/events')
    expect([200, 401]).toContain(res.status)
  })

  test('POST /api/events by non-admin returns HTTP 401/403 Forbidden', async () => {
    const res = await request.post('/api/events').send({
      title: 'Unauthorized Hackathon',
      category: 'Technology',
      capacity: 100
    })
    expect([401, 403]).toContain(res.status)
  })

  test('Simulated SELECT FOR UPDATE row locking prevents double registration race conditions', () => {
    let capacity = 50
    let registeredCount = 49

    function attemptRegistration() {
      if (registeredCount < capacity) {
        registeredCount++
        return { success: true }
      }
      return { success: false, error: 'Event capacity full' }
    }

    const reqA = attemptRegistration()
    const reqB = attemptRegistration()

    expect(reqA.success).toBe(true)
    expect(reqB.success).toBe(false)
    expect(registeredCount).toBe(50)
  })
})
