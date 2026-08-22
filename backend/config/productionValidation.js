function validateProductionConfig() {
  const isProd = process.env.NODE_ENV === 'production'
  const errors = []
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'FRONTEND_URL'
  ]

  if (isProd) {
    requiredVars.push('VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY')
  }

  for (const varName of requiredVars) {
    if (!process.env[varName] || process.env[varName].trim() === '') {
      errors.push(`Required environment variable ${varName} is missing or empty`)
    }
  }

  // Security checks for weak default secrets in production
  if (isProd) {
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long in production')
    }
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.includes('test_jwt_secret')) {
      errors.push('JWT_SECRET must not use development default values in production')
    }
  }

  const isValid = errors.length === 0

  if (!isValid && isProd) {
    console.error('❌ Production Configuration Validation Failed:')
    errors.forEach(err => console.error(`   - ${err}`))
  }

  return {
    valid: isValid,
    errors
  }
}

module.exports = { validateProductionConfig }
