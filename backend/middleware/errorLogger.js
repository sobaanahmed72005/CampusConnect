const crypto = require('crypto')

function sanitizeLogObject(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const clean = { ...obj }
  const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'cookie', 'p256dh', 'auth']

  for (const key of Object.keys(clean)) {
    const lower = key.toLowerCase()
    if (sensitiveKeys.some(s => lower.includes(s))) {
      clean[key] = '[REDACTED]'
    } else if (typeof clean[key] === 'object' && clean[key] !== null) {
      clean[key] = sanitizeLogObject(clean[key])
    }
  }
  return clean
}

function requestLogger(req, res, next) {
  req.id = req.id || crypto.randomUUID()
  const start = Date.now()

  res.on('finish', () => {
    const durationMs = Date.now() - start
    const logEntry = {
      level: res.statusCode >= 500 ? 'error' : (res.statusCode >= 400 ? 'warn' : 'info'),
      timestamp: new Date().toISOString(),
      requestId: req.id,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
      clientIp: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    }

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry))
    }
  })

  next()
}

function errorLogger(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500
  const logEntry = {
    level: 'error',
    timestamp: new Date().toISOString(),
    requestId: req?.id || crypto.randomUUID(),
    method: req?.method,
    url: req?.originalUrl || req?.url,
    statusCode,
    errorName: err.name || 'Error',
    errorMessage: err.message || 'Internal Server Error',
    errorStack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    params: sanitizeLogObject(req?.params),
    query: sanitizeLogObject(req?.query)
  }

  console.error(JSON.stringify(logEntry))

  if (res.headersSent) {
    return next(err)
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR'),
      message: statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'An internal server error occurred'
        : err.message,
      requestId: req?.id
    }
  })
}

module.exports = {
  requestLogger,
  errorLogger,
  sanitizeLogObject
}
