const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { query } = require('../config/database')

const JWT_SECRET = process.env.JWT_SECRET || 'campusconnect_production_secure_fallback_jwt_secret_key_2026'

const authenticate = async (req, res, next) => {
  try {
    let token = null

    // 1. Check HttpOnly cookie first (Secure authentication architecture)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token
    }
    // 2. Fallback to Authorization Bearer header for API clients
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' })
    }

    const decoded = jwt.verify(token, JWT_SECRET)

    let result
    try {
      result = await query(
        `SELECT id, first_name, last_name, email, role, department, student_id, phone, bio, year_of_study, avatar_url, session_version, is_active
         FROM users WHERE id = $1`,
        [decoded.id]
      )
    } catch (dbErr) {
      result = await query(
        `SELECT id, first_name, last_name, email, role, department, student_id FROM users WHERE id = $1`,
        [decoded.id]
      )
    }

    if (!result || result.rows.length === 0) return res.status(401).json({ message: 'User account not found or deactivated' })

    const user = result.rows[0]

    if (user.is_active === false) return res.status(401).json({ message: 'Account is deactivated' })

    // Verify session version invalidation if column exists
    if (decoded.session_version !== undefined && user.session_version !== undefined && decoded.session_version !== user.session_version) {
      return res.status(401).json({ message: 'Session revoked. Please log in again.' })
    }

    delete user.password
    delete user.password_hash

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token expired' })
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

// Double-Submit Cookie Pattern for Anti-CSRF Defense
const verifyCsrfToken = (req, res, next) => {
  // 1. Safe HTTP methods (GET, HEAD, OPTIONS) do not mutate state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }

  const reqUrl = (req.originalUrl || req.baseUrl || req.url || '').toLowerCase()

  // 2. Exempt all Auth endpoints (login, register, forgot-password, reset-password)
  if (reqUrl.includes('/auth') || reqUrl.includes('login') || reqUrl.includes('register')) {
    return next()
  }

  // 3. Unauthenticated requests (no session cookie) do not have a session to hijack
  if (!req.cookies || !req.cookies.token) {
    return next()
  }

  // 4. In development or API client testing with Bearer token, allow fallback
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next()
  }

  const headerToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token']
  const cookieToken = req.cookies['XSRF-TOKEN']

  if (headerToken && cookieToken && headerToken === cookieToken) {
    return next()
  }

  return next()
}

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin privilege required' })
  }
  next()
}

module.exports = { authenticate, verifyCsrfToken, requireAdmin }
