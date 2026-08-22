const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { query } = require('../config/database')

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

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Explicitly select non-sensitive columns + session_version
    const result = await query(
      `SELECT id, first_name, last_name, email, role, department, student_id, phone, bio, year_of_study, avatar_url, session_version
       FROM users WHERE id = $1 AND is_active = true`,
      [decoded.id]
    )

    if (result.rows.length === 0) return res.status(401).json({ message: 'User account not found or deactivated' })

    const user = result.rows[0]

    // Verify session version invalidation (Instant revocation across all devices if session_version incremented)
    if (decoded.session_version !== undefined && decoded.session_version !== user.session_version) {
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
  // Safe HTTP methods (GET, HEAD, OPTIONS) do not mutate state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }

  const url = (req.originalUrl || req.url || '').toLowerCase()
  // Exempt all unauthenticated Auth endpoints (/api/auth/*)
  if (url.includes('/auth/')) {
    return next()
  }

  const headerToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token']
  const cookieToken = req.cookies ? req.cookies['XSRF-TOKEN'] : null

  // In local development or API client testing with Bearer token, allow fallback
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next()
  }

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ message: 'CSRF security verification failed: Invalid or missing CSRF token' })
  }

  next()
}

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin privilege required' })
  }
  next()
}

module.exports = { authenticate, verifyCsrfToken, requireAdmin }
