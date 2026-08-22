// Supertest HTTP Gateway Server Harness
// Instantiates Express server instance without binding to external network ports for Supertest integration

const supertest = require('supertest')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const { applySecurityHeaders } = require('../../middleware/securityHardening')

function createTestServer() {
  const app = express()

  app.use(applySecurityHeaders)
  app.use(express.json())

  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }))

  // Mount API Subsystem Routes
  app.use('/api/auth', require('../../routes/auth'))
  app.use('/api/dashboard', require('../../routes/dashboard'))
  app.use('/api/academic', require('../../routes/academic'))
  app.use('/api/announcements', require('../../routes/announcements'))
  app.use('/api/marketplace', require('../../routes/marketplace'))
  app.use('/api/events', require('../../routes/events'))
  app.use('/api/lost-found', require('../../routes/lostFound'))
  app.use('/api/accommodation', require('../../routes/accommodation'))
  app.use('/api/profile', require('../../routes/profile'))
  app.use('/api/notifications', require('../../routes/notifications'))
  app.use('/api/admin', require('../../routes/admin'))
  app.use('/api/messages', require('../../routes/messages'))
  app.use('/api/search', require('../../routes/search'))

  app.get(['/api/health', '/api/health/live'], (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() })
  })

  app.get('/api/health/ready', async (req, res) => {
    try {
      const { query: dbQuery } = require('../../config/database')
      const dbResult = await dbQuery('SELECT 1')
      if (dbResult && dbResult.rows.length > 0) {
        return res.json({ status: 'ready', database: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() })
      }
      throw new Error('Database ping yielded zero rows')
    } catch (err) {
      return res.status(503).json({ status: 'unhealthy', database: 'disconnected', error: err.message, timestamp: new Date().toISOString() })
    }
  })

  app.use((req, res) => res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      timestamp: new Date().toISOString()
    }
  }))

  return {


    app,
    request: supertest(app)
  }
}

module.exports = {
  createTestServer
}
