const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { authenticate, requireAdmin } = require('../middleware/auth')

// Ensure announcements table exists automatically
async function initTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        author_id UUID REFERENCES users(id) ON DELETE SET NULL,
        author_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)
  } catch (e) {
    console.error('Failed to initialize announcements table:', e.message)
  }
}
initTable()

// GET /api/announcements (Public/Authenticated)
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM announcements ORDER BY created_at DESC LIMIT 20'
    )
    res.json({ announcements: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load announcements' })
  }
})

// POST /api/announcements (Admin Only — ACID Transactional Endpoint)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const client = await getClient()
  try {
    const { title, message, category } = req.body
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' })
    }

    await client.query('BEGIN')

    const authorName = `${req.user.first_name} ${req.user.last_name}`
    const result = await client.query(
      `INSERT INTO announcements (title, message, category, author_id, author_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, message, category || 'general', req.user.id, authorName]
    )

    const announcement = result.rows[0]

    // Log admin audit action inside transaction
    const ip = req.ip || '127.0.0.1'
    await client.query(
      'INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.user.id, authorName, 'ANNOUNCEMENT_POST', 'SYSTEM', announcement.id, `Broadcasted campus announcement: "${title}"`, ip]
    )

    await client.query('COMMIT')

    // Non-blocking in-process notification batching for active students
    setImmediate(async () => {
      try {
        const users = await query("SELECT id FROM users WHERE is_active = true")
        if (users.rows.length === 0) return

        const chunkSize = 100
        for (let i = 0; i < users.rows.length; i += chunkSize) {
          const chunk = users.rows.slice(i, i + chunkSize)
          const valueClauses = chunk.map((u, idx) => `($${idx * 4 + 1}, $${idx * 4 + 2}, $${idx * 4 + 3}, $${idx * 4 + 4})`).join(', ')
          const params = []
          chunk.forEach(u => {
            params.push(u.id, `📢 ${title}`, message.slice(0, 120), 'system')
          })

          await query(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ${valueClauses}`,
            params
          )
        }
      } catch (queueErr) {
        console.error('Async notification fan-out background task error:', queueErr.message)
      }
    })

    res.status(201).json({ message: 'Announcement published successfully', announcement })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Transactional announcement error:', err)
    res.status(500).json({ message: 'Failed to publish announcement' })
  } finally {
    client.release()
  }
})

// DELETE /api/announcements/:id (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM announcements WHERE id=$1', [req.params.id])
    res.json({ message: 'Announcement deleted successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete announcement' })
  }
})

module.exports = router
