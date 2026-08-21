require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const path = require('path')

const crypto = require('crypto')

const app = express()

// Request ID Tracing Middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID()
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

// Structured Global Error Handler with Observability Tracing
app.use((err, req, res, next) => {
  const statusCode = err.status || 500
  const errorResponse = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Internal server error',
      requestId: req.id,
      timestamp: new Date().toISOString()
    }
  }
  console.error(`❌ [${req.id}] ${req.method} ${req.url} - Error ${statusCode}:`, err.stack || err.message)
  res.status(statusCode).json(errorResponse)
})

const { applyDatabaseInvariants } = require('./config/schemaInvariants')

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`🚀 CampusConnect Backend running on http://localhost:${PORT}`)
  console.log(`📦 Environment: ${process.env.NODE_ENV}`)
  applyDatabaseInvariants()
})

module.exports = app
