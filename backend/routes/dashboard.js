const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id
    const [eventsJoined, notifications, activeTasks, activeListings] = await Promise.all([
      query('SELECT COUNT(*) FROM event_registrations WHERE user_id = $1', [userId]),
      query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false', [userId]),
      query("SELECT COUNT(*) FROM assignments WHERE user_id = $1 AND status != 'completed'", [userId]).catch(() => ({ rows: [{ count: 0 }] })),
      query('SELECT COUNT(*) FROM marketplace_listings WHERE seller_id = $1 AND is_sold = false', [userId]).catch(() => ({ rows: [{ count: 0 }] })),
    ])
    res.json({
      events_joined: eventsJoined.rows[0].count,
      unread_notifications: notifications.rows[0].count,
      active_tasks: activeTasks.rows[0].count,
      active_listings: activeListings.rows[0].count
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load stats' })
  }
})

// GET /api/dashboard/assignments
router.get('/assignments', async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM assignments WHERE user_id = $1 AND status != 'completed' ORDER BY due_date ASC LIMIT 5",
      [req.user.id]
    ).catch(() => ({ rows: [] }))
    res.json({ assignments: result.rows || [] })
  } catch (err) {
    res.json({ assignments: [] })
  }
})

module.exports = router
