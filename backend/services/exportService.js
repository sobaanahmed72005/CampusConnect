const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { query } = require('../config/database')

const EXPORTS_DIR = process.env.EXPORTS_DIRECTORY || path.join(__dirname, '../../exports')

function ensureExportDir() {
  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true })
  }
}

function sanitizeExportData(rows, allowlist) {
  return rows.map(row => {
    const clean = {}
    for (const key of allowlist) {
      if (Object.prototype.hasOwnProperty.call(row, key)) {
        let val = row[key]
        // Never export passwords, secrets, or tokens
        if (key.includes('password') || key.includes('token') || key.includes('secret')) {
          continue
        }
        if (val instanceof Date) val = val.toISOString()
        clean[key] = val
      }
    }
    return clean
  })
}

function jsonToCsv(items, fields) {
  if (items.length === 0) return fields.join(',') + '\n'
  const header = fields.join(',')
  const rows = items.map(item => {
    return fields.map(field => {
      let val = item[field] === undefined || item[field] === null ? '' : item[field]
      if (typeof val === 'object') val = JSON.stringify(val)
      val = String(val).replace(/"/g, '""')
      if (val.includes(',') || val.includes('\n') || val.includes('"')) {
        val = `"${val}"`
      }
      return val
    }).join(',')
  })
  return [header, ...rows].join('\n')
}

// Explicit Module Privacy Allow-lists
const MODULE_ALLOWLISTS = {
  users: ['id', 'email', 'first_name', 'last_name', 'role', 'department', 'student_id', 'is_verified', 'created_at'],
  events: ['id', 'title', 'description', 'category', 'date', 'location', 'capacity', 'organizer_id', 'created_at'],
  marketplace: ['id', 'seller_id', 'title', 'description', 'price', 'category', 'condition', 'is_sold', 'created_at'],
  'lost-found': ['id', 'reporter_id', 'item_type', 'title', 'description', 'category', 'location', 'status', 'created_at'],
  accommodation: ['id', 'owner_id', 'title', 'description', 'price', 'type', 'location', 'created_at'],
  telemetry: ['id', 'user_id', 'event_type', 'entity_type', 'entity_id', 'created_at'],
  'audit-logs': ['id', 'user_id', 'action', 'target_type', 'target_id', 'details', 'created_at']
}

async function generateModuleExport(moduleName, format = 'csv') {
  ensureExportDir()

  const safeModule = moduleName.toLowerCase()
  const allowlist = MODULE_ALLOWLISTS[safeModule]

  if (!allowlist) {
    throw new Error(`Export is not allowed or supported for module: ${moduleName}`)
  }

  let dbTable = safeModule.replace('-', '_')
  if (safeModule === 'lost-found') dbTable = 'lost_and_found'
  if (safeModule === 'audit-logs') dbTable = 'audit_logs'
  if (safeModule === 'telemetry') dbTable = 'student_activity_telemetry'
  if (safeModule === 'marketplace') dbTable = 'marketplace_listings'

  const result = await query(`SELECT * FROM "${dbTable}" ORDER BY created_at DESC LIMIT 5000`)
  const cleanRows = sanitizeExportData(result.rows, allowlist)

  const exportId = crypto.randomUUID()
  const fileExt = format.toLowerCase() === 'json' ? 'json' : 'csv'
  const filename = `export_${safeModule}_${exportId.slice(0, 8)}.${fileExt}`
  const filepath = path.join(EXPORTS_DIR, filename)

  let content = ''
  if (fileExt === 'csv') {
    content = jsonToCsv(cleanRows, allowlist)
  } else {
    content = JSON.stringify(cleanRows, null, 2)
  }

  fs.writeFileSync(filepath, content, 'utf8')
  const stats = fs.statSync(filepath)

  return {
    exportId,
    filename,
    filepath,
    module: safeModule,
    format: fileExt,
    recordCount: cleanRows.length,
    sizeBytes: stats.size,
    createdAt: new Date().toISOString()
  }
}

function getExportFilepath(filename) {
  ensureExportDir()
  const safeName = path.basename(filename)
  const filepath = path.join(EXPORTS_DIR, safeName)
  if (!fs.existsSync(filepath)) {
    throw new Error('Export file not found or expired')
  }
  return filepath
}

function cleanupExpiredExports(maxAgeMinutes = 60) {
  ensureExportDir()
  const files = fs.readdirSync(EXPORTS_DIR)
  const now = Date.now()
  let cleaned = 0

  for (const f of files) {
    const fp = path.join(EXPORTS_DIR, f)
    try {
      const stats = fs.statSync(fp)
      if ((now - stats.mtimeMs) > maxAgeMinutes * 60 * 1000) {
        fs.unlinkSync(fp)
        cleaned++
      }
    } catch {
      // Ignore cleanup error
    }
  }
  return cleaned
}

module.exports = {
  generateModuleExport,
  getExportFilepath,
  cleanupExpiredExports,
  MODULE_ALLOWLISTS,
  EXPORTS_DIR
}
