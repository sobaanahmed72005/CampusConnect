// Environment Startup Validation & Production Readiness Gate
// Enforces mandatory configuration environment variables prior to Express server startup

const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'FRONTEND_URL'
]

function validateEnvironment() {
  const isProd = process.env.NODE_ENV === 'production'
  const missing = []

  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET')
  if (!process.env.FRONTEND_URL) missing.push('FRONTEND_URL')

  const hasDbUrl = !!process.env.DATABASE_URL
  const hasIndividualDb = process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER
  if (!hasDbUrl && !hasIndividualDb) {
    missing.push('DATABASE_URL (or DB_HOST, DB_NAME, DB_USER)')
  }

  if (isProd && missing.length > 0) {
    console.error(`🚨 FATAL: Missing required production environment variables: ${missing.join(', ')}`)
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`)
  }

  if (isProd && process.env.JWT_SECRET === 'fallback-dev-secret-key-change-in-production') {
    console.error('🚨 FATAL: Default development JWT secret detected in production environment!')
    throw new Error('Default development JWT secret detected in production environment!')
  }

  return {
    valid: true,
    environment: process.env.NODE_ENV || 'development',
    missingInDev: missing
  }
}

module.exports = {
  validateEnvironment,
  REQUIRED_ENV_VARS
}
