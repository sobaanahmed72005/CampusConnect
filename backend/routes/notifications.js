const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    )
    res.json({ notifications: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load notifications' })
  }
})

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id])
    res.json({ message: 'Marked as read' })
  } catch (err) {
    res.status(500).json({ message: 'Failed' })
  }
})

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read=true WHERE user_id=$1', [req.user.id])
    res.json({ message: 'All marked as read' })
  } catch (err) {
    res.status(500).json({ message: 'Failed' })
  }
})

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM notifications WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id])
    res.json({ message: 'Notification deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Failed' })
  }
})

module.exports = router
