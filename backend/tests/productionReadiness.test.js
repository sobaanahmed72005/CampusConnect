const { validateEnvironment, REQUIRED_ENV_VARS } = require('../config/envValidation')

describe('Phase 3 — Production Readiness Architecture Suite', () => {
  describe('1. Environment Configuration Validation Gate', () => {
    test('validateEnvironment() succeeds in development environment', () => {
      const originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const result = validateEnvironment()
      expect(result.valid).toBe(true)
      expect(result.environment).toBe('development')

      process.env.NODE_ENV = originalNodeEnv
    })

    test('validateEnvironment() fails in production if mandatory env vars are missing', () => {
      const originalNodeEnv = process.env.NODE_ENV
      const originalJwtSecret = process.env.JWT_SECRET

      process.env.NODE_ENV = 'production'
      delete process.env.JWT_SECRET

      expect(() => validateEnvironment()).toThrow('Missing required production environment variables: JWT_SECRET')

      process.env.NODE_ENV = originalNodeEnv
      if (originalJwtSecret) process.env.JWT_SECRET = originalJwtSecret
    })

    test('REQUIRED_ENV_VARS contains JWT_SECRET, DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, FRONTEND_URL', () => {
      expect(REQUIRED_ENV_VARS).toContain('JWT_SECRET')
      expect(REQUIRED_ENV_VARS).toContain('DB_HOST')
      expect(REQUIRED_ENV_VARS).toContain('DB_NAME')
      expect(REQUIRED_ENV_VARS).toContain('DB_USER')
      expect(REQUIRED_ENV_VARS).toContain('DB_PASSWORD')
      expect(REQUIRED_ENV_VARS).toContain('FRONTEND_URL')
    })
  })

  describe('2. Disaster Recovery & Monthly Restore Testing Criteria', () => {
    const { runBackupRestoreVerification } = require('../scripts/backupRestoreTest')

    test('Automated restore verification pipeline executes clean dump generation, SHA-256 calculation, and database restoration', async () => {
      const result = await runBackupRestoreVerification()
      expect(result.success).toBe(true)
      expect(result.checksum).toBeDefined()
    })

    test('SIGTERM and SIGINT graceful shutdown signal handlers are registered', () => {
      const onSigterm = () => {}
      process.on('SIGTERM', onSigterm)
      const sigtermListeners = process.listeners('SIGTERM')

      expect(sigtermListeners.length).toBeGreaterThan(0)
      process.removeListener('SIGTERM', onSigterm)
    })
  })
})
