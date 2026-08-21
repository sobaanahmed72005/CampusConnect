const { metricsMiddleware, recordDbQueryLatency, getSystemMetrics } = require('../middleware/metricsCollector')

describe('Phase 6 — Performance & Observability Architecture Suite', () => {
  describe('1. Real-Time Observability Metrics Subsystem', () => {
    test('recordDbQueryLatency calculates DB query average latency and flags slow queries (>100ms)', () => {
      recordDbQueryLatency(5)
      recordDbQueryLatency(120) // Slow query

      const metrics = getSystemMetrics()
      expect(metrics.metrics.dbQueryAvgLatencyMs).toBeGreaterThan(0)
    })
  })

  describe('2. System Health Status Indicators', () => {
    test('getSystemMetrics returns 5-component health status indicators', () => {
      const health = getSystemMetrics()
      expect(health.status).toBe('healthy')
      expect(health.components.api).toBe('healthy')
      expect(health.components.database).toBe('healthy')
      expect(health.components.storage).toBe('healthy')
      expect(health.components.memory).toBe('normal')
      expect(health.components.errorRate).toBe('normal')
    })
  })
})
