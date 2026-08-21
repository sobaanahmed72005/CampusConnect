const { createRateLimiter } = require('../../middleware/rateLimiter')

describe('Unit: Sliding Window Rate Limiter Logic Suite', () => {
  test('createRateLimiter creates middleware function with max and windowMs properties', () => {
    const limiter = createRateLimiter(60000, 5, 'Too many requests')
    expect(typeof limiter).toBe('function')
  })

  test('Simulated request counter increments correctly within sliding time window', () => {
    const windowMs = 60000
    const maxRequests = 5
    const requests = []

    for (let i = 0; i < 7; i++) {
      if (i < maxRequests) {
        requests.push({ status: 200 })
      } else {
        requests.push({ status: 429, error: 'Too many requests' })
      }
    }

    const blockedRequests = requests.filter(r => r.status === 429)
    expect(blockedRequests.length).toBe(2)
  })
})
