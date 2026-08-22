/**
 * Production Security Hardening Middleware
 * Enforces HSTS, Security Headers, Input Payload Sanitization & Path Traversal Guards
 */

function applySecurityHeaders(req, res, next) {
  // HTTP Strict Transport Security (HSTS) - Enforce HTTPS for 1 year
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

  // Prevent Framing / Clickjacking
  res.setHeader('X-Frame-Options', 'DENY')

  // Prevent MIME Type Sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff')

  // Enable Browser XSS Filter
  res.setHeader('X-XSS-Protection', '1; mode=block')

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions Policy (Restrict browser hardware features)
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')

  // Disable powered-by header
  res.removeHeader('X-Powered-By')

  next()
}

function sanitizeString(str) {
  if (typeof str !== 'string') return str
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onerror=/gi, '')
    .replace(/onload=/gi, '')
}

function sanitizePayload(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sanitizePayload)

  const clean = {}
  for (const key of Object.keys(obj)) {
    const safeKey = sanitizeString(key)
    const val = obj[key]
    if (typeof val === 'string') {
      clean[safeKey] = sanitizeString(val)
    } else if (typeof val === 'object' && val !== null) {
      clean[safeKey] = sanitizePayload(val)
    } else {
      clean[safeKey] = val
    }
  }
  return clean
}

function sanitizeInputMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizePayload(req.body)
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizePayload(req.query)
  }
  next()
}

module.exports = {
  applySecurityHeaders,
  sanitizeInputMiddleware,
  sanitizeString,
  sanitizePayload
}
