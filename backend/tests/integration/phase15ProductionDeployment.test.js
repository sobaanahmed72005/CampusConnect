const path = require('path')
const fs = require('fs')
const { createTestServer } = require('../helpers/testServer')
const { applyDatabaseInvariants } = require('../../config/schemaInvariants')
const { sanitizeLogObject } = require('../../middleware/errorLogger')
const { runProductionSmokeTests } = require('../../scripts/productionSmokeTest')
const { verifyBackup, createBackup } = require('../../services/backupService')

describe('Phase 15: Full Production Deployment, CI/CD & Production Monitoring Integration Tests', () => {
  let request

  beforeAll(async () => {
    await applyDatabaseInvariants()
    const server = createTestServer()
    request = server.request
  })

  // Test 1: GitHub Actions CI/CD Pipeline Configuration File Exists
  test('1. GitHub Actions CI/CD Pipeline Configuration File Exists', () => {
    const workflowPath = path.join(__dirname, '../../../.github/workflows/ci-cd-pipeline.yml')
    expect(fs.existsSync(workflowPath)).toBe(true)

    const content = fs.readFileSync(workflowPath, 'utf8')
    expect(content).toContain('test-and-build')
    expect(content).toContain('deploy-production')
    expect(content).toContain('npm test')
    expect(content).toContain('npm run build')
  })

  // Test 2: Structured Log Sanitizer removes sensitive credentials
  test('2. Structured Log Sanitizer removes sensitive credentials', () => {
    const rawData = {
      user_id: '123',
      password: 'MySecretPassword123',
      token: 'bearer_token_xyz',
      authorization: 'Bearer jwt_secret_key',
      email: 'student@nu.edu.pk'
    }

    const clean = sanitizeLogObject(rawData)
    expect(clean.user_id).toBe('123')
    expect(clean.email).toBe('student@nu.edu.pk')
    expect(clean.password).toBe('[REDACTED]')
    expect(clean.token).toBe('[REDACTED]')
    expect(clean.authorization).toBe('[REDACTED]')
  })

  // Test 3: Production Smoke Test Suite executes successfully
  test('3. Production Smoke Test Suite executes successfully', async () => {
    const smokeRes = await runProductionSmokeTests()
    expect(smokeRes.passed).toBeGreaterThan(0)
    expect(smokeRes.failed).toBe(0)
  })

  // Test 4: Pre-deployment Backup & Verification
  test('4. Pre-deployment Backup & Verification', async () => {
    const backup = await createBackup()
    expect(backup.verified).toBe(true)

    const verification = await verifyBackup(backup.filename)
    expect(verification.verified).toBe(true)
    expect(verification.totalTables).toBeGreaterThan(0)
  })

  // Test 5: Health & Readiness Endpoints in Test Gateway
  test('5. Health & Readiness Endpoints in Test Gateway', async () => {
    const liveRes = await request.get('/api/health/live')
    expect(liveRes.status).toBe(200)
    expect(liveRes.body.status).toBe('ok')

    const readyRes = await request.get('/api/health/ready')
    expect([200, 503]).toContain(readyRes.status)
  })
})
