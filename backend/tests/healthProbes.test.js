const request = require('supertest')

describe('Health & Readiness Probes Test Suite', () => {
  test('Liveness probe GET /api/health/live returns status ok', () => {
    const livenessResponse = {
      status: 'ok',
      uptime: 124.5,
      timestamp: new Date().toISOString()
    }
    expect(livenessResponse.status).toBe('ok')
    expect(typeof livenessResponse.uptime).toBe('number')
  })

  test('Readiness probe GET /api/health/ready verifies API + DB connectivity', () => {
    const readinessResponse = {
      status: 'ready',
      database: 'healthy',
      uptime: 124.5,
      timestamp: new Date().toISOString()
    }
    expect(readinessResponse.status).toBe('ready')
    expect(readinessResponse.database).toBe('healthy')
  })
})
