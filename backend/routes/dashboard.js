const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id
    const [eventsJoined, notifications] = await Promise.all([
      query('SELECT COUNT(*) FROM event_registrations WHERE user_id = $1', [userId]),
      query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false', [userId]),
    ])
    res.json({
      events_joined: eventsJoined.rows[0].count,
      unread_notifications: notifications.rows[0].count,
      // Static data for demo purposes
      attendance: '19/20',
      courses: '6',
      gpa: '3.8',
      certificates: '4',
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load stats' })
  }
})

// GET /api/dashboard/assignments
router.get('/assignments', async (req, res) => {
  try {
    // Check if assignments table has user_id column
    const result = await query(
      'SELECT * FROM assignments WHERE user_id = $1 AND status != $2 ORDER BY due_date ASC LIMIT 5',
      [req.user.id, 'completed']
    ).catch(() => ({ rows: [] }))
    res.json({ assignments: result.rows || [] })
  } catch (err) {
    res.json({ assignments: [] })
  }
})

module.exports = router
