// Sliding window rate-limiting middleware for auth endpoints & API throttling
const rateLimitStore = new Map()

// Periodically clean up expired records every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.' }) {
  return (req, res, next) => {
    // In development mode, allow flexible testing while keeping production strict
    const isDev = process.env.NODE_ENV !== 'production'
    const effectiveMax = isDev ? Math.max(max, 50) : max

    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '127.0.0.1'
    const key = `${req.baseUrl}${req.path}:${ip}`
    const now = Date.now()

    let record = rateLimitStore.get(key)
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs }
    }

    record.count++
    rateLimitStore.set(key, record)

    res.setHeader('X-RateLimit-Limit', effectiveMax)
    res.setHeader('X-RateLimit-Remaining', Math.max(0, effectiveMax - record.count))
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000))

    if (record.count > effectiveMax) {
      return res.status(429).json({
        message,
        retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000)
      })
    }

    next()
  }
}

// 1. Strict rate limit for POST /api/auth/login (5 attempts / 15 minutes in production)
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts. Please try again after 15 minutes.'
})

// 2. Strict rate limit for POST /api/auth/register (3 registrations / 1 hour in production)
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many account creation attempts from this IP. Please try again in an hour.'
})

// 3. Strict rate limit for POST /api/auth/forgot-password (3 reset requests / 1 hour in production)
const forgotPasswordLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many password reset requests. Please try again in an hour.'
})

// 4. Strict rate limit for POST /api/auth/reset-password (5 reset attempts / 15 minutes in production)
const resetPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset submission attempts. Please try again after 15 minutes.'
})

// 5. Category limit for Admin Endpoints /api/admin (60 requests / 15 minutes)
const adminLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Admin endpoint request limit reached. Please slow down.'
})

// 6. Global API throttling for general endpoints (300 requests / 15 minutes)
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'API request rate limit exceeded. Please slow down.'
})

module.exports = {
  createRateLimiter,
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  adminLimiter,
  apiLimiter
}
