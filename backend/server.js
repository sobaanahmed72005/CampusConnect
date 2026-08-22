require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const { validateEnvironment } = require('./config/envValidation')
const { requestLogger } = require('./middleware/errorLogger')
const { applySecurityHeaders, sanitizeInputMiddleware } = require('./middleware/securityHardening')

// Enforce Phase 3 Environment Validation Gate
validateEnvironment()

const app = express()

// Structured Request Logging & Request ID Tracing Middleware
app.use(requestLogger)
app.use(applySecurityHeaders)
app.use(sanitizeInputMiddleware)
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || req.id || crypto.randomUUID()
  res.setHeader('X-Request-ID', req.id)
  next()
})



// Security & Middleware (Helmet CSP & HTTP Security Headers)
const isProd = process.env.NODE_ENV === 'production'
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: isProd ? ["'self'"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: isProd
        ? ["'self'", process.env.FRONTEND_URL || 'https://campusconnect.edu.pk']
        : ["'self'", 'http://localhost:5000', 'http://localhost:5173', 'ws://localhost:5173', 'wss://localhost:5173'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xFrameOptions: { action: 'deny' },
  xContentTypeOptions: true,
  strictTransportSecurity: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}))
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Request-ID']
}))
app.use(morgan('dev'))
app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const { apiLimiter, adminLimiter } = require('./middleware/rateLimiter')

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

const { verifyCsrfToken } = require('./middleware/auth')

// Apply Anti-CSRF verification to state-changing API requests
app.use('/api', verifyCsrfToken)

const { metricsMiddleware, getSystemMetrics } = require('./middleware/metricsCollector')

// Track system observability metrics across all requests
app.use(metricsMiddleware)

// Apply API Rate Limiting
app.use('/api', apiLimiter)
app.use('/api/admin', adminLimiter)

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/dashboard', require('./routes/dashboard'))
app.use('/api/academic', require('./routes/academic'))
app.use('/api/events', require('./routes/events'))
app.use('/api/marketplace', require('./routes/marketplace'))
app.use('/api/lost-found', require('./routes/lostFound'))
app.use('/api/accommodation', require('./routes/accommodation'))
app.use('/api/profile', require('./routes/profile'))
app.use('/api/notifications', require('./routes/notifications'))
app.use('/api/announcements', require('./routes/announcements'))
app.use('/api/admin', require('./routes/admin'))
app.use('/api/search', require('./routes/search'))
app.use('/api/messages', require('./routes/messages'))

// Production Frontend Static SPA Asset Serving
const frontendDistPath = path.join(__dirname, '../frontend/dist')
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next()
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'))
  })
}

// Health & Readiness Probes for Observability and Container Orchestration
const { query: dbQuery } = require('./config/database')

app.get(['/api/health', '/api/health/live'], (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

app.get('/api/health/ready', async (req, res) => {
  try {
    const dbResult = await dbQuery('SELECT 1')
    const isDbConnected = dbResult && dbResult.rows.length > 0
    
    if (isDbConnected) {
      return res.json({
        status: 'ready',
        database: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      })
    }
    throw new Error('Database ping yielded zero rows')
  } catch (err) {
    console.error('Readiness probe failed:', err.message)
    return res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString()
    })
  }
})


app.get(['/api/admin/system-health', '/api/admin/metrics'], (req, res) => {

  const systemHealth = getSystemMetrics()
  res.json(systemHealth)
})

// 404 Route Handler
app.use((req, res) => res.status(404).json({
  success: false,
  error: {
    code: 'NOT_FOUND',
    message: 'Route not found',
    requestId: req.id,
    timestamp: new Date().toISOString()
  }
}))

// Classified Error Category Resolver
function classifyError(err, statusCode) {
  if (err.code === 'EBADCSRFTOKEN' || err.message?.includes('CSRF')) return 'CSRF_FAILURE'
  if (statusCode === 400) return 'VALIDATION_ERROR'
  if (statusCode === 401) return 'AUTHENTICATION_ERROR'
  if (statusCode === 403) return 'AUTHORIZATION_ERROR'
  if (statusCode === 404) return 'NOT_FOUND'
  if (statusCode === 409) return 'CONFLICT'
  if (statusCode === 429) return 'RATE_LIMITED'
  
  // Check if error is a raw PostgreSQL database error
  if (err.severity || err.routine || (typeof err.code === 'string' && err.code.length === 5)) {
    return 'DATABASE_ERROR'
  }
  
  return 'INTERNAL_ERROR'
}

// Structured Global Error Handler with Classification & Database Error Sanitization
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500
  const classification = err.classification || classifyError(err, statusCode)

  // Server-side detailed logging for operational debugging & audit trail
  console.error(`❌ [${req.id}] ${req.method} ${req.url} - Code: ${classification} (HTTP ${statusCode}):`, {
    message: err.message,
    code: err.code,
    detail: err.detail || null,
    stack: process.env.NODE_ENV === 'production' ? '[Redacted in Prod]' : err.stack
  })

  // Client-facing response payload (Strictly sanitizes raw internal DB / stack details)
  let safeMessage = err.message || 'An unexpected error occurred.'
  if (classification === 'DATABASE_ERROR') {
    safeMessage = 'A database operation error occurred. Please contact system support with your Reference ID.'
  } else if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    safeMessage = 'An internal system error occurred. Please try again later.'
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: classification,
      message: safeMessage,
      requestId: req.id,
      timestamp: new Date().toISOString()
    }
  })
})

const { applyDatabaseInvariants } = require('./config/schemaInvariants')
const db = require('./config/database')

const { initSocket } = require('./config/socket')

const PORT = process.env.PORT || 5000
const server = app.listen(PORT, () => {
  console.log(`🚀 CampusConnect Backend running on http://localhost:${PORT}`)
  console.log(`📦 Environment: ${process.env.NODE_ENV}`)
  applyDatabaseInvariants()
})

const io = initSocket(server)

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM. Closing server gracefully...')
  server.close(() => {
    console.log('✅ HTTP server closed.')
  })
})

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT. Closing server gracefully...')
  server.close(() => {
    console.log('✅ HTTP server closed.')
  })
})

module.exports = app
