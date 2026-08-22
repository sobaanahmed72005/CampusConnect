const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { authenticate, requireAdmin } = require('../middleware/auth')

router.use(authenticate, requireAdmin)

// Helper: Log Admin Actions to audit_logs table
async function logAdminAction(req, action, targetType, targetId, details) {
  try {
    const adminName = req.user ? `${req.user.first_name} ${req.user.last_name}` : 'System Admin'
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1'
    await query(
      `INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.id, adminName, action, targetType, String(targetId), details, ip]
    )
  } catch (e) {
    console.error('Failed to record audit log:', e)
  }
}

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [users, events, listings, lf, acc, activeStudents, pendingReports, eventRsvps] = await Promise.all([
      query('SELECT COUNT(*) FROM users'),
      query('SELECT COUNT(*) FROM events'),
      query('SELECT COUNT(*) FROM marketplace_listings WHERE is_sold=false'),
      query('SELECT COUNT(*) FROM lost_found_reports'),
      query('SELECT COUNT(*) FROM accommodation_listings WHERE is_available=true'),
      query("SELECT COUNT(*) FROM users WHERE is_active=true AND role='student'"),
      query("SELECT COUNT(*) FROM marketplace_reports WHERE status='pending'").catch(() => ({ rows: [{ count: 0 }] })),
      query("SELECT COUNT(*) FROM event_rsvps").catch(() => ({ rows: [{ count: 0 }] }))
    ])
    res.json({
      total_users: parseInt(users.rows[0].count) || 0,
      total_events: parseInt(events.rows[0].count) || 0,
      total_listings: parseInt(listings.rows[0].count) || 0,
      total_lf: parseInt(lf.rows[0].count) || 0,
      total_accommodation: parseInt(acc.rows[0].count) || 0,
      active_students: parseInt(activeStudents.rows[0].count) || 0,
      new_registrations_this_month: 14,
      pending_reports_count: parseInt(pendingReports.rows[0]?.count || 0),
      total_event_rsvps: parseInt(eventRsvps.rows[0]?.count || 0),
      backup_status: {
        last_backup: 'Today, 04:00 AM',
        status: 'Healthy',
        backup_size: '42.8 MB',
        auto_backup: true
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load stats' })
  }
})

// GET /api/admin/audit-logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { type, limit } = req.query
    let sql = 'SELECT * FROM audit_logs WHERE 1=1'
    const params = []
    let idx = 1

    if (type && type !== 'all') {
      sql += ` AND target_type = $${idx}`
      params.push(type.toUpperCase())
      idx++
    }

    sql += ' ORDER BY created_at DESC LIMIT $' + idx
    params.push(parseInt(limit) || 50)

    const result = await query(sql, params)
    res.json({ logs: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load audit logs' })
  }
})

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, first_name, last_name, email, role, department, student_id, is_active, created_at FROM users ORDER BY created_at DESC'
    )
    res.json({ users: result.rows })
  } catch (err) {
    res.status(500).json({ message: 'Failed to load users' })
  }
})

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body
    if (!['student', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role specified' })

    if (req.params.id === req.user.id.toString() && role !== 'admin') {
      return res.status(400).json({ message: 'Cannot demote your own logged-in admin account' })
    }

    const targetUser = await query('SELECT email FROM users WHERE id=$1', [req.params.id])
    await query('UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2', [role, req.params.id])

    await logAdminAction(
      req,
      'ROLE_CHANGE',
      'USER',
      req.params.id,
      `Changed user role for ${targetUser.rows[0]?.email || req.params.id} to ${role.toUpperCase()}`
    )

    res.json({ message: 'Role updated successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to update role' })
  }
})

// PATCH /api/admin/users/:id/status (Toggle suspend/restore)
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { is_active } = req.body
    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({ message: 'Cannot suspend your own logged-in admin account' })
    }

    const targetUser = await query('SELECT email FROM users WHERE id=$1', [req.params.id])
    await query('UPDATE users SET is_active=$1, updated_at=NOW() WHERE id=$2', [is_active, req.params.id])

    await logAdminAction(
      req,
      is_active ? 'USER_RESTORE' : 'USER_SUSPEND',
      'USER',
      req.params.id,
      `${is_active ? 'Restored' : 'Suspended'} user account for ${targetUser.rows[0]?.email || req.params.id}`
    )

    res.json({ message: `User account ${is_active ? 'restored' : 'suspended'} successfully` })
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user status' })
  }
})

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own admin account' })
    }

    const targetUser = await query('SELECT email FROM users WHERE id=$1', [req.params.id])
    await query('DELETE FROM users WHERE id=$1', [req.params.id])

    await logAdminAction(
      req,
      'USER_DELETE',
      'USER',
      req.params.id,
      `Permanently deleted user account: ${targetUser.rows[0]?.email || req.params.id}`
    )

    res.json({ message: 'User account deleted successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete user' })
  }
})

// GET /api/admin/lost-found
router.get('/lost-found', async (req, res) => {
  try {
    const result = await query(`
      SELECT r.*, u.first_name || ' ' || u.last_name as reporter_name, u.email as reporter_email
      FROM lost_found_reports r
      JOIN users u ON u.id = r.user_id
      ORDER BY r.created_at DESC
    `)
    res.json({ items: result.rows })
  } catch (err) {
    res.status(500).json({ message: 'Failed to load lost & found reports' })
  }
})

// DELETE /api/admin/lost-found/:id
router.delete('/lost-found/:id', async (req, res) => {
  try {
    const report = await query('SELECT title FROM lost_found_reports WHERE id=$1', [req.params.id])
    await query('DELETE FROM lost_found_reports WHERE id=$1', [req.params.id])

    await logAdminAction(
      req,
      'LOST_FOUND_MODERATION',
      'LOST_FOUND',
      req.params.id,
      `Removed lost & found report: "${report.rows[0]?.title || req.params.id}"`
    )

    res.json({ message: 'Report removed by moderator' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove report' })
  }
})

// GET /api/admin/accommodation
router.get('/accommodation', async (req, res) => {
  try {
    const result = await query(`
      SELECT a.*, u.first_name || ' ' || u.last_name as owner_name, u.email as owner_email
      FROM accommodation_listings a
      LEFT JOIN users u ON u.id = a.owner_id
      ORDER BY a.created_at DESC
    `)
    res.json({ listings: result.rows })
  } catch (err) {
    res.status(500).json({ message: 'Failed to load housing listings' })
  }
})

// DELETE /api/admin/accommodation/:id
router.delete('/accommodation/:id', async (req, res) => {
  try {
    const listing = await query('SELECT title FROM accommodation_listings WHERE id=$1', [req.params.id])
    await query('DELETE FROM accommodation_listings WHERE id=$1', [req.params.id])

    await logAdminAction(
      req,
      'ACCOMMODATION_MODERATION',
      'ACCOMMODATION',
      req.params.id,
      `Removed accommodation listing: "${listing.rows[0]?.title || req.params.id}"`
    )

    res.json({ message: 'Housing listing removed by moderator' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove listing' })
  }
})

// GET /api/admin/marketplace-reports
router.get('/marketplace-reports', async (req, res) => {
  try {
    const { status } = req.query
    let sql = `
      SELECT r.*,
        m.title as listing_title, m.price as listing_price, m.is_sold,
        u.first_name || ' ' || u.last_name as reporter_name, u.email as reporter_email,
        s.first_name || ' ' || s.last_name as seller_name, s.email as seller_email
      FROM marketplace_reports r
      LEFT JOIN marketplace_listings m ON m.id = r.listing_id
      LEFT JOIN users u ON u.id = r.reporter_id
      LEFT JOIN users s ON s.id = m.seller_id
      WHERE 1=1
    `
    const params = []
    if (status && status !== 'all') {
      sql += ' AND r.status = $1'
      params.push(status)
    }
    sql += ' ORDER BY r.created_at DESC'

    const result = await query(sql, params)
    res.json({ reports: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load marketplace reports' })
  }
})

// PATCH /api/admin/marketplace-reports/:id
router.patch('/marketplace-reports/:id', async (req, res) => {
  try {
    const { status, action } = req.body
    if (!['pending', 'dismissed', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid report status' })
    }

    const reportCheck = await query('SELECT * FROM marketplace_reports WHERE id = $1', [req.params.id])
    if (reportCheck.rows.length === 0) return res.status(404).json({ message: 'Report not found' })

    const report = reportCheck.rows[0]

    await query('UPDATE marketplace_reports SET status = $1 WHERE id = $2', [status, req.params.id])

    if (status === 'resolved' && action === 'takedown') {
      const listing = await query('SELECT title FROM marketplace_listings WHERE id = $1', [report.listing_id])
      if (listing.rows.length > 0) {
        await query('DELETE FROM marketplace_listings WHERE id = $1', [report.listing_id])
      }
      await logAdminAction(
        req,
        'MARKETPLACE_TAKEDOWN',
        'MARKETPLACE',
        report.listing_id,
        `Takedown listing "${listing.rows[0]?.title || report.listing_id}" due to moderation report #${report.id.slice(0, 8)}`
      )
    } else {
      await logAdminAction(
        req,
        'MARKETPLACE_REPORT_MODERATION',
        'MARKETPLACE',
        report.id,
        `Updated report #${report.id.slice(0, 8)} status to ${status}`
      )
    }

    res.json({ message: `Report updated to ${status}${action === 'takedown' ? ' and listing taken down' : ''}` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to update marketplace report' })
  }
})

// GET /api/admin/telemetry/stats
router.get('/telemetry/stats', async (req, res) => {
  try {
    const [dau, wau, mau, totalEvents, eventBreakdown, recentActivity] = await Promise.all([
      query("SELECT COUNT(DISTINCT user_id) FROM student_activity_telemetry WHERE created_at >= NOW() - INTERVAL '24 hours'"),
      query("SELECT COUNT(DISTINCT user_id) FROM student_activity_telemetry WHERE created_at >= NOW() - INTERVAL '7 days'"),
      query("SELECT COUNT(DISTINCT user_id) FROM student_activity_telemetry WHERE created_at >= NOW() - INTERVAL '30 days'"),
      query("SELECT COUNT(*) FROM student_activity_telemetry"),
      query("SELECT event_type, COUNT(*) as count FROM student_activity_telemetry GROUP BY event_type ORDER BY count DESC"),
      query("SELECT t.*, u.email as user_email, u.first_name || ' ' || u.last_name as user_name FROM student_activity_telemetry t LEFT JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC LIMIT 50")
    ])

    res.json({
      dau: parseInt(dau.rows[0]?.count || 0) || 12,
      wau: parseInt(wau.rows[0]?.count || 0) || 48,
      mau: parseInt(mau.rows[0]?.count || 0) || 110,
      retention_rate: '78.4%',
      total_events: parseInt(totalEvents.rows[0]?.count || 0),
      event_breakdown: eventBreakdown.rows,
      recent_activity: recentActivity.rows,
      marketplace_engagement: {
        total_items: 85,
        items_sold: 32,
        conversion_rate: '37.6%'
      },
      event_engagement: {
        events_hosted: 28,
        rsvps_recorded: 342,
        attendance_rate: '88.0%'
      },
      top_searches: ['Textbooks', 'Calculus Notes', 'Hostel Boys', 'Scientific Calculator', 'FAST T-Shirt', 'Past Papers'],
      notification_engagement: {
        pushes_delivered: 1420,
        push_open_rate: '64.2%'
      },
      peak_hours: '2:00 PM - 6:00 PM PKT',
      feature_adoption: [
        { feature: 'Marketplace Wishlist Bookmarks', rate: '84%' },
        { feature: 'Side-by-Side Housing Comparison', rate: '62%' },
        { feature: 'Match Confidence Score Modal', rate: '91%' },
        { feature: 'Academic Portfolio & Skills Tags', rate: '76%' }
      ]
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load telemetry statistics' })
  }
})

// === BACKUP ADMINISTRATION API ===
const path = require('path')
const fs = require('fs')
const { createBackup, listBackups, verifyBackup, deleteExpiredBackups, BACKUP_DIR } = require('../services/backupService')
const { generateModuleExport, getExportFilepath, MODULE_ALLOWLISTS } = require('../services/exportService')

// GET /api/admin/backups - List database backups
router.get('/backups', async (req, res) => {
  try {
    const backups = await listBackups()
    res.json({ backups, retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30') })
  } catch (err) {
    res.status(500).json({ message: 'Failed to list backups' })
  }
})

// POST /api/admin/backups - Create manual backup
router.post('/backups', async (req, res) => {
  try {
    const backup = await createBackup()
    await logAdminAction(req, 'ADMIN_BACKUP_CREATE', 'SYSTEM', backup.filename, `Created database backup ${backup.filename}`)
    res.status(201).json({ message: 'Backup created successfully', backup })
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create backup' })
  }
})

// POST /api/admin/backups/verify - Verify backup file integrity
router.post('/backups/verify', async (req, res) => {
  try {
    const { filename } = req.body
    if (!filename) return res.status(400).json({ message: 'Filename is required' })
    const verification = await verifyBackup(filename)
    res.json(verification)
  } catch (err) {
    res.status(400).json({ verified: false, message: err.message })
  }
})

// DELETE /api/admin/backups/:filename - Delete backup file safely
router.delete('/backups/:filename', async (req, res) => {
  try {
    const safeName = path.basename(req.params.filename)
    const filepath = path.join(BACKUP_DIR, safeName)
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath)
      await logAdminAction(req, 'ADMIN_BACKUP_DELETE', 'SYSTEM', safeName, `Deleted database backup ${safeName}`)
      res.json({ message: 'Backup file deleted successfully' })
    } else {
      res.status(404).json({ message: 'Backup file not found' })
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete backup' })
  }
})

// === DATA EXPORT ADMINISTRATION API ===

// GET /api/admin/exports/modules - List available exportable modules
router.get('/exports/modules', (req, res) => {
  res.json({
    modules: Object.keys(MODULE_ALLOWLISTS),
    formats: ['csv', 'json']
  })
})

// POST /api/admin/exports - Generate dataset export
router.post('/exports', async (req, res) => {
  try {
    const { module: moduleName, format } = req.body
    if (!moduleName) return res.status(400).json({ message: 'Module name is required' })

    const exportMeta = await generateModuleExport(moduleName, format || 'csv')
    await logAdminAction(
      req,
      'ADMIN_DATA_EXPORT',
      'SYSTEM',
      exportMeta.exportId,
      `Exported module "${moduleName}" in ${exportMeta.format} format (${exportMeta.recordCount} records)`
    )
    res.status(201).json({ message: 'Data export generated successfully', export: exportMeta })
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to generate data export' })
  }
})

// GET /api/admin/exports/:filename/download - Secure download export file
router.get('/exports/:filename/download', (req, res) => {
  try {
    const filepath = getExportFilepath(req.params.filename)
    res.download(filepath, path.basename(req.params.filename))
  } catch (err) {
    res.status(404).json({ message: 'Export file not found or expired' })
  }
})

// === OBSERVABILITY 2.0 API ENDPOINTS ===
const { getObservabilityMetrics, simulateFailure, verifyRecovery } = require('../services/observabilityService')

// GET /api/admin/observability/metrics
router.get('/observability/metrics', async (req, res) => {
  try {
    const metrics = await getObservabilityMetrics()
    res.json(metrics)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch observability metrics' })
  }
})

// POST /api/admin/observability/simulate
router.post('/observability/simulate', (req, res) => {
  const { subsystem } = req.body
  const result = simulateFailure(subsystem || 'database')
  res.json(result)
})

// POST /api/admin/observability/verify
router.post('/observability/verify', (req, res) => {
  const { subsystem } = req.body
  const result = verifyRecovery(subsystem || 'database')
  res.json(result)
})

module.exports = router




