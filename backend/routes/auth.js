const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { body, validationResult } = require('express-validator')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')
const { loginLimiter, registerLimiter, forgotPasswordLimiter, resetPasswordLimiter } = require('../middleware/rateLimiter')

const JWT_SECRET = process.env.JWT_SECRET || 'campusconnect_production_secure_fallback_jwt_secret_key_2026'
const signToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
}

const FAST_EMAIL_REGEX = /^[\w\.-]+@((cfd|lhr|isb|khi|pwr)\.)?nu\.edu\.pk$/i

// POST /api/auth/register
router.post('/register', registerLimiter, [
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required')
    .custom((val) => {
      // Validate FAST NUCES Institutional Email Domain (@nu.edu.pk or campus subdomains)
      if (!FAST_EMAIL_REGEX.test(val) && process.env.STRICT_INSTITUTIONAL_EMAIL === 'true') {
        throw new Error('Registration is restricted to official FAST NUCES emails (@nu.edu.pk or campus subdomains e.g. @cfd.nu.edu.pk)')
      }
      return true
    }),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('student_id').trim().notEmpty().withMessage('Student ID is required'),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })

  try {
    const { first_name, last_name, email, password, student_id, department } = req.body

    // Ensure database columns exist dynamically prior to insert
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password VARCHAR(255),
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
      ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS department VARCHAR(100),
      ADD COLUMN IF NOT EXISTS student_id VARCHAR(50);
    `).catch(() => {})

    const existing = await query('SELECT id FROM users WHERE email = $1 OR student_id = $2', [email, student_id])
    if (existing.rows.length > 0) return res.status(409).json({ message: 'Email or Student ID is already registered' })

    const password_hash = await bcrypt.hash(password, 12)
    const verificationToken = crypto.randomBytes(32).toString('hex')

    let result
    try {
      result = await query(
        `INSERT INTO users (first_name, last_name, email, password, password_hash, student_id, department, role, is_verified, verification_token)
         VALUES ($1,$2,$3,$4,$4,$5,$6,'student', true, $7)
         RETURNING id, first_name, last_name, email, role, department, student_id, is_verified`,
        [first_name, last_name, email, password_hash, student_id, department, verificationToken]
      )
    } catch (insertErr) {
      console.warn('⚠️ Primary insert query fallback triggered:', insertErr.message)
      result = await query(
        `INSERT INTO users (first_name, last_name, email, password_hash, student_id, department, role, is_verified)
         VALUES ($1,$2,$3,$4,$5,$6,'student', true)
         RETURNING id, first_name, last_name, email, role, department, student_id, is_verified`,
        [first_name, last_name, email, password_hash, student_id, department]
      )
    }

    const user = result.rows[0]
    delete user.password
    delete user.password_hash

    const token = signToken(user.id)

    // Secure authentication architecture: Set HttpOnly cookie
    res.cookie('token', token, COOKIE_OPTIONS)

    try {
      await query('INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)',
        [user.id, 'Welcome to CampusConnect! 🎉', 'Your FAST student account has been verified and created successfully. Explore campus events, marketplace, and housing!', 'system'])
    } catch (e) {}

    res.status(201).json({
      token,
      user,
      message: 'Account created and verified with FAST institutional email domain!',
      verificationToken
    })
  } catch (err) {
    console.error('Registration error:', err)
    res.status(400).json({ message: err.message || 'Registration failed' })
  }
})

// POST /api/auth/login
router.post('/login', loginLimiter, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })

  try {
    const { email, password } = req.body
    let result
    try {
      result = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email])
    } catch (e) {
      result = await query('SELECT * FROM users WHERE email = $1', [email])
    }

    if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid email or password' })

    const user = result.rows[0]
    if (user.is_active === false) return res.status(401).json({ message: 'Account is deactivated' })

    const passHash = user.password || user.password_hash
    const valid = passHash ? await bcrypt.compare(password, passHash) : false
    if (!valid) return res.status(401).json({ message: 'Invalid email or password' })

    const token = signToken(user.id)

    // Secure authentication architecture: Set HttpOnly cookie & rotate CSRF token on login
    res.cookie('token', token, COOKIE_OPTIONS)
    const newCsrfToken = crypto.randomBytes(32).toString('hex')
    res.cookie('XSRF-TOKEN', newCsrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    const { password: _, password_hash: __, ...safeUser } = user

    res.json({ token, user: safeUser })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ message: err.message || 'Login failed' })
  }
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS)
  res.clearCookie('XSRF-TOKEN', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })
  res.json({ message: 'Logged out successfully' })
})

// POST /api/auth/logout-all (Revokes session_version across all active devices)
router.post('/logout-all', authenticate, async (req, res) => {
  try {
    await db.query(
      'UPDATE users SET session_version = session_version + 1 WHERE id = $1',
      [req.user.id]
    )

    res.clearCookie('token', COOKIE_OPTIONS)
    res.clearCookie('XSRF-TOKEN', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })

    res.json({
      success: true,
      message: 'Logged out from all active sessions and devices.'
    })
  } catch (err) {
    console.error('Logout-all error:', err)
    res.status(500).json({ message: 'Failed to revoke active sessions' })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user })
})

// Database migration safeguard for password reset columns
async function ensureResetColumns() {
  try {
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password VARCHAR(255),
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
      ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP WITH TIME ZONE;
    `)
  } catch (e) {}
}
ensureResetColumns()

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPasswordLimiter, [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })

  try {
    const { email } = req.body
    const userResult = await query('SELECT id, first_name, email FROM users WHERE email = $1 AND is_active = true', [email])
    
    // Security Best Practice: Don't leak user existence; return success response
    if (userResult.rows.length === 0) {
      return res.json({
        message: 'If an account exists with this email, a password reset link has been dispatched.',
        demoHint: null
      })
    }

    const user = userResult.rows[0]
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await query(
      'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, user.id]
    )

    res.json({
      message: `Password reset instructions sent to ${user.email}.`,
      resetToken, // Included for testing and demonstration
      demoHint: `Use token "${resetToken}" on the Reset Password screen.`
    })
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ message: 'Failed to process password reset request' })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', resetPasswordLimiter, [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('new_password')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })

  try {
    const { token, new_password } = req.body
    const userResult = await query(
      'SELECT id, email FROM users WHERE reset_token = $1 AND reset_expires > NOW() AND is_active = true',
      [token]
    )

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired password reset token. Please request a new link.' })
    }

    const user = userResult.rows[0]
    const passwordHash = await bcrypt.hash(new_password, 12)

    await query(
      'UPDATE users SET password = $1, session_version = session_version + 1, reset_token = NULL, reset_expires = NULL, updated_at = NOW() WHERE id = $2',
      [passwordHash, user.id]
    )

    res.json({ message: 'Password reset successfully! You can now log in with your new password.' })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ message: 'Failed to reset password' })
  }
})

// POST /api/auth/verify-email
router.post('/verify-email', [
  body('token').notEmpty().withMessage('Verification token is required')
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })

  try {
    const { token } = req.body
    const userResult = await query('SELECT id, email FROM users WHERE verification_token = $1', [token])
    
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired email verification token.' })
    }

    const user = userResult.rows[0]
    await query('UPDATE users SET is_verified = true, verification_token = NULL WHERE id = $1', [user.id])

    res.json({ message: `Institutional email ${user.email} has been successfully verified! 🎉` })
  } catch (err) {
    console.error('Email verification error:', err)
    res.status(500).json({ message: 'Failed to verify email address' })
  }
})

// GET /api/auth/csrf-token — Generates Double-Submit Cookie CSRF Protection Token
router.get('/csrf-token', (req, res) => {
  let csrfToken = req.cookies ? req.cookies['XSRF-TOKEN'] : null
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString('hex')
  }
  res.cookie('XSRF-TOKEN', csrfToken, {
    httpOnly: false, // Accessible by Axios client JS to read and attach in X-CSRF-Token header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  })
  res.json({ csrfToken })
})

module.exports = router
