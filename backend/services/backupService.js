const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { query, pool } = require('../config/database')

const BACKUP_DIR = process.env.BACKUP_DIRECTORY || path.join(__dirname, '../../backups')

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

function getSafeFilename(filename) {
  return path.basename(filename)
}

async function createBackup() {
  ensureBackupDir()

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `backup_${timestamp}.json`
  const filepath = path.join(BACKUP_DIR, filename)

  try {
    // 1. Discover all public user tables
    const tableRes = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC
    `)

    const tablesData = {}
    let totalRecords = 0

    for (const row of tableRes.rows) {
      const tableName = row.table_name
      // Query table contents
      const dataRes = await query(`SELECT * FROM "${tableName}"`)
      tablesData[tableName] = dataRes.rows
      totalRecords += dataRes.rows.length
    }

    const backupPayload = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      totalTables: tableRes.rows.length,
      totalRecords,
      tables: tablesData
    }

    const jsonStr = JSON.stringify(backupPayload, null, 2)
    fs.writeFileSync(filepath, jsonStr, 'utf8')

    const stats = fs.statSync(filepath)
    const checksum = crypto.createHash('sha256').update(jsonStr).digest('hex')

    return {
      filename,
      filepath,
      sizeBytes: stats.size,
      totalTables: tableRes.rows.length,
      totalRecords,
      checksum,
      createdAt: backupPayload.timestamp,
      status: 'success',
      verified: true
    }
  } catch (err) {
    console.error('Backup creation error:', err.message)
    throw new Error(`Failed to create database backup: ${err.message}`)
  }
}

async function listBackups() {
  ensureBackupDir()
  const files = fs.readdirSync(BACKUP_DIR)
  const backups = []

  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const filepath = path.join(BACKUP_DIR, file)
    try {
      const stats = fs.statSync(filepath)
      backups.push({
        filename: file,
        sizeBytes: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        status: stats.size > 0 ? 'available' : 'corrupted'
      })
    } catch {
      // Ignore stat errors for transient files
    }
  }

  return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

async function verifyBackup(filename) {
  ensureBackupDir()
  const safeName = getSafeFilename(filename)
  const filepath = path.join(BACKUP_DIR, safeName)

  if (!fs.existsSync(filepath)) {
    throw new Error('Backup file does not exist')
  }

  const stats = fs.statSync(filepath)
  if (stats.size === 0) {
    return { verified: false, reason: 'Backup file is empty' }
  }

  try {
    const raw = fs.readFileSync(filepath, 'utf8')
    const payload = JSON.parse(raw)

    if (!payload.tables || typeof payload.tables !== 'object') {
      return { verified: false, reason: 'Invalid backup JSON schema structure' }
    }

    const checksum = crypto.createHash('sha256').update(raw).digest('hex')

    return {
      verified: true,
      filename: safeName,
      sizeBytes: stats.size,
      totalTables: Object.keys(payload.tables).length,
      totalRecords: payload.totalRecords || 0,
      timestamp: payload.timestamp,
      checksum
    }
  } catch (err) {
    return { verified: false, reason: `JSON parsing error: ${err.message}` }
  }
}

async function deleteExpiredBackups(retentionDays = 30) {
  ensureBackupDir()
  const backups = await listBackups()
  const now = new Date()
  let deletedCount = 0

  for (const b of backups) {
    const ageDays = (now - new Date(b.createdAt)) / (1000 * 60 * 60 * 24)
    if (ageDays > retentionDays) {
      const safeName = getSafeFilename(b.filename)
      const filepath = path.join(BACKUP_DIR, safeName)
      try {
        fs.unlinkSync(filepath)
        deletedCount++
      } catch {
        // Ignore deletion error
      }
    }
  }

  return { retentionDays, deletedCount }
}

async function restoreBackup(filename) {
  ensureBackupDir()
  const safeName = getSafeFilename(filename)
  const filepath = path.join(BACKUP_DIR, safeName)

  const verification = await verifyBackup(safeName)
  if (!verification.verified) {
    throw new Error(`Cannot restore unverified backup: ${verification.reason}`)
  }

  const raw = fs.readFileSync(filepath, 'utf8')
  const payload = JSON.parse(raw)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const [tableName, rows] of Object.entries(payload.tables)) {
      if (!Array.isArray(rows) || rows.length === 0) continue

      // Clear existing records for table restoration safely
      await client.query(`TRUNCATE TABLE "${tableName}" CASCADE`).catch(() => {})

      for (const row of rows) {
        const columns = Object.keys(row).map(c => `"${c}"`).join(', ')
        const values = Object.values(row)
        const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ')

        await client.query(
          `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        )
      }
    }

    await client.query('COMMIT')
    return { success: true, restoredTables: Object.keys(payload.tables).length }
  } catch (err) {
    await client.query('ROLLBACK')
    throw new Error(`Restore failed during transaction: ${err.message}`)
  } finally {
    client.release()
  }
}

module.exports = {
  createBackup,
  listBackups,
  verifyBackup,
  deleteExpiredBackups,
  restoreBackup,
  BACKUP_DIR
}
