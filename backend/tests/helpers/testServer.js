// Supertest HTTP Gateway Server Harness
// Instantiates Express server instance without binding to external network ports for Supertest integration

const supertest = require('supertest')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')

function createTestServer() {
  const app = express()

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }))

  // Mount API Subsystem Routes
  app.use('/api/auth', require('../../routes/auth'))
  app.use('/api/announcements', require('../../routes/announcements'))
  app.use('/api/marketplace', require('../../routes/marketplace'))
  app.use('/api/events', require('../../routes/events'))
  app.use('/api/lost-found', require('../../routes/lostFound'))
  app.use('/api/accommodation', require('../../routes/accommodation'))
  app.use('/api/profile', require('../../routes/profile'))
  app.use('/api/notifications', require('../../routes/notifications'))
  app.use('/api/admin', require('../../routes/admin'))

  return {
    app,
    request: supertest(app)
  }
}

module.exports = {
  createTestServer
}
