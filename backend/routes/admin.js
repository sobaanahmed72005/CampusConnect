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
    const [users, events, listings, lf, acc] = await Promise.all([
      query('SELECT COUNT(*) FROM users'),
      query('SELECT COUNT(*) FROM events'),
      query('SELECT COUNT(*) FROM marketplace_listings WHERE is_sold=false'),
      query('SELECT COUNT(*) FROM lost_found_reports'),
      query('SELECT COUNT(*) FROM accommodation_listings WHERE is_available=true')
    ])
    res.json({
      total_users: users.rows[0].count,
      total_events: events.rows[0].count,
      total_listings: listings.rows[0].count,
      total_lf: lf.rows[0].count,
      total_accommodation: acc.rows[0].count
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

module.exports = router
