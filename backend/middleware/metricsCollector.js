// System Metrics & Observability Collector
// Tracks HTTP Request Counts, 4xx/5xx Error Rates, Response Latency, DB Query Timing & Subsystem Counters

const metrics = {
  httpRequestsTotal: 0,
  http4xxTotal: 0,
  http5xxTotal: 0,
  totalResponseTimeMs: 0,
  dbQueriesTotal: 0,
  dbTotalLatencyMs: 0,
  authFailuresTotal: 0,
  rateLimitEventsTotal: 0
}

function metricsMiddleware(req, res, next) {
  const startTime = Date.now()
  metrics.httpRequestsTotal++

  res.on('finish', () => {
    const duration = Date.now() - startTime
    metrics.totalResponseTimeMs += duration

    if (res.statusCode >= 400 && res.statusCode < 500) {
      metrics.http4xxTotal++
      if (res.statusCode === 401 || res.statusCode === 403) {
        metrics.authFailuresTotal++
      }
      if (res.statusCode === 429) {
        metrics.rateLimitEventsTotal++
      }
    } else if (res.statusCode >= 500) {
      metrics.http5xxTotal++
    }
  })

  next()
}

function recordDbQueryLatency(durationMs) {
  metrics.dbQueriesTotal++
  metrics.dbTotalLatencyMs += durationMs
}

function getSystemMetrics() {
  const avgResponseTimeMs = metrics.httpRequestsTotal > 0
    ? Math.round((metrics.totalResponseTimeMs / metrics.httpRequestsTotal) * 100) / 100
    : 0

  const dbQueryAvgLatencyMs = metrics.dbQueriesTotal > 0
    ? Math.round((metrics.dbTotalLatencyMs / metrics.dbQueriesTotal) * 100) / 100
    : 0

  const errorRate = metrics.httpRequestsTotal > 0
    ? (metrics.http5xxTotal / metrics.httpRequestsTotal)
    : 0

  const memoryUsage = process.memoryUsage()
  const heapUsedMb = Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100

  return {
    status: errorRate < 0.05 ? 'healthy' : 'degraded',
    components: {
      api: 'healthy',
      database: 'healthy',
      storage: 'healthy',
      memory: heapUsedMb < 500 ? 'normal' : 'warning',
      errorRate: errorRate < 0.05 ? 'normal' : 'high'
    },
    metrics: {
      httpRequestsTotal: metrics.httpRequestsTotal,
      http4xxTotal: metrics.http4xxTotal,
      http5xxTotal: metrics.http5xxTotal,
      avgResponseTimeMs,
      dbQueryAvgLatencyMs,
      authFailuresTotal: metrics.authFailuresTotal,
      rateLimitEventsTotal: metrics.rateLimitEventsTotal,
      heapUsedMb,
      uptimeSeconds: Math.round(process.uptime())
    }
  }
}

module.exports = {
  metricsMiddleware,
  recordDbQueryLatency,
  getSystemMetrics
}
