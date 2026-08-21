const { getSystemMetrics } = require('../middleware/metricsCollector')

describe('System Observability & Metrics Subsystem Suite', () => {
  test('getSystemMetrics() returns valid components status indicators', () => {
    const health = getSystemMetrics()

    expect(health.status).toBeDefined()
    expect(['healthy', 'degraded']).toContain(health.status)
    expect(health.components.api).toBe('healthy')
    expect(health.components.database).toBe('healthy')
    expect(health.components.storage).toBe('healthy')
    expect(health.components.memory).toBeDefined()
    expect(health.components.errorRate).toBeDefined()
  })

  test('getSystemMetrics() tracks HTTP request counts, average latency, and memory metrics', () => {
    const health = getSystemMetrics()

    expect(typeof health.metrics.httpRequestsTotal).toBe('number')
    expect(typeof health.metrics.http4xxTotal).toBe('number')
    expect(typeof health.metrics.http5xxTotal).toBe('number')
    expect(typeof health.metrics.avgResponseTimeMs).toBe('number')
    expect(typeof health.metrics.dbQueryAvgLatencyMs).toBe('number')
    expect(typeof health.metrics.authFailuresTotal).toBe('number')
    expect(typeof health.metrics.rateLimitEventsTotal).toBe('number')
    expect(typeof health.metrics.heapUsedMb).toBe('number')
    expect(typeof health.metrics.uptimeSeconds).toBe('number')
  })
})
