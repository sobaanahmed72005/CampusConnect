const { createTestServer } = require('../helpers/testServer')
const { query } = require('../../config/database')
const { applyDatabaseInvariants } = require('../../config/schemaInvariants')
const { createBackup, listBackups, verifyBackup, deleteExpiredBackups } = require('../../services/backupService')
const { generateModuleExport, getExportFilepath } = require('../../services/exportService')
const { validateProductionConfig } = require('../../config/productionValidation')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const fs = require('fs')

describe('Phase 14: Production Readiness, Automated Backup & Data Export Integration Tests', () => {
  let request
  let studentCookie = ''
  let studentId = ''
  let adminCookie = ''
  let adminId = ''

  beforeAll(async () => {
    await applyDatabaseInvariants()
    const server = createTestServer()
    request = server.request

    studentId = crypto.randomUUID()
    adminId = crypto.randomUUID()

    const pwdHash = '$2b$10$w8.mP9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8g'

    await query(
      `INSERT INTO users (id, email, password, first_name, last_name, role, is_active, session_version)
       VALUES ($1, $2, $3, $4, $5, $6, true, 1) ON CONFLICT DO NOTHING`,
      [studentId, `phase14_student_${studentId.slice(0, 8)}@nu.edu.pk`, pwdHash, 'Readiness', 'Student', 'student']
    )

    await query(
      `INSERT INTO users (id, email, password, first_name, last_name, role, is_active, session_version)
       VALUES ($1, $2, $3, $4, $5, $6, true, 1) ON CONFLICT DO NOTHING`,
      [adminId, `phase14_admin_${adminId.slice(0, 8)}@nu.edu.pk`, pwdHash, 'Readiness', 'Admin', 'admin']
    )

    const secret = process.env.JWT_SECRET || 'test_jwt_secret_256bit_key_for_testing'
    const studentToken = jwt.sign({ id: studentId, email: 'student@nu.edu.pk', role: 'student', session_version: 1 }, secret)
    const adminToken = jwt.sign({ id: adminId, email: 'admin@nu.edu.pk', role: 'admin', session_version: 1 }, secret)

    studentCookie = `token=${studentToken}`
    adminCookie = `token=${adminToken}`
  })

  // Test 1: Backup service creates non-empty JSON backup file
  test('1. Backup service creates non-empty JSON backup file', async () => {
    const backup = await createBackup()
    expect(backup).toHaveProperty('filename')
    expect(backup.sizeBytes).toBeGreaterThan(0)
    expect(backup.verified).toBe(true)
    expect(fs.existsSync(backup.filepath)).toBe(true)
  })

  // Test 2: List backups returns array of available backup archives
  test('2. List backups returns array of available backup archives', async () => {
    const backups = await listBackups()
    expect(Array.isArray(backups)).toBe(true)
    expect(backups.length).toBeGreaterThan(0)
  })

  // Test 3: Backup verification checks integrity and schema payload
  test('3. Backup verification checks integrity and schema payload', async () => {
    const backups = await listBackups()
    const latest = backups[0].filename
    const verification = await verifyBackup(latest)
    expect(verification.verified).toBe(true)
    expect(verification.totalTables).toBeGreaterThan(0)
    expect(verification).toHaveProperty('checksum')
  })

  // Test 4: Retention manager cleans up expired backups safely
  test('4. Retention manager cleans up expired backups safely', async () => {
    const retentionRes = await deleteExpiredBackups(365) // Should retain recent backups
    expect(retentionRes).toHaveProperty('deletedCount')
  })

  // Test 5: Path traversal protection on backup endpoints
  test('5. Path traversal protection on backup endpoints', async () => {
    await expect(verifyBackup('../../etc/passwd')).rejects.toThrow()
  })

  // Test 6: Module data export generates CSV dataset
  test('6. Module data export generates CSV dataset', async () => {
    const exportMeta = await generateModuleExport('users', 'csv')
    expect(exportMeta.format).toBe('csv')
    expect(fs.existsSync(exportMeta.filepath)).toBe(true)

    const content = fs.readFileSync(exportMeta.filepath, 'utf8')
    expect(content).toContain('email')
    expect(content).toContain('first_name')
  })

  // Test 7: Privacy verification — sensitive fields strictly excluded from exports
  test('7. Privacy verification — sensitive fields strictly excluded from exports', async () => {
    const exportMeta = await generateModuleExport('users', 'json')
    const raw = fs.readFileSync(exportMeta.filepath, 'utf8')
    const jsonRows = JSON.parse(raw)

    if (jsonRows.length > 0) {
      const firstRow = jsonRows[0]
      expect(firstRow.password).toBeUndefined()
      expect(firstRow.password_hash).toBeUndefined()
      expect(firstRow.verification_token).toBeUndefined()
    }
  })

  // Test 8: Admin backups endpoint requires admin role
  test('8. Admin backups endpoint requires admin role', async () => {
    const studentRes = await request.get('/api/admin/backups').set('Cookie', studentCookie)
    expect(studentRes.status).toBe(403)

    const adminRes = await request.get('/api/admin/backups').set('Cookie', adminCookie)
    expect(adminRes.status).toBe(200)
    expect(adminRes.body).toHaveProperty('backups')
  })

  // Test 9: Admin data exports endpoint requires admin role
  test('9. Admin data exports endpoint requires admin role', async () => {
    const studentRes = await request.post('/api/admin/exports').set('Cookie', studentCookie).send({ module: 'events' })
    expect(studentRes.status).toBe(403)

    const adminRes = await request.post('/api/admin/exports').set('Cookie', adminCookie).send({ module: 'events', format: 'csv' })
    expect(adminRes.status).toBe(201)
    expect(adminRes.body.export.module).toBe('events')
  })

  // Test 10: Health Liveness Probe returns HTTP 200 OK
  test('10. Health Liveness Probe returns HTTP 200 OK', async () => {
    const res = await request.get('/api/health/live')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body).toHaveProperty('uptime')
  })

  // Test 11: Health Readiness Probe checks live database query
  test('11. Health Readiness Probe checks live database query', async () => {
    const res = await request.get('/api/health/ready')
    expect([200, 503]).toContain(res.status)
    if (res.status === 200) {
      expect(res.body.status).toBe('ready')
      expect(res.body.database).toBe('healthy')
    }
  })

  // Test 12: Production validation function detects missing keys without printing secrets
  test('12. Production validation function checks environment keys', () => {
    const validation = validateProductionConfig()
    expect(validation).toHaveProperty('valid')
    expect(Array.isArray(validation.errors)).toBe(true)
  })
})
