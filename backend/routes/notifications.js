const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

const crypto = require('crypto')
const { vapidPublicKey } = require('../services/pushService')

router.use(authenticate)

// GET /api/notifications/vapid-public-key
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidPublicKey })
})

// POST /api/notifications/push-subscribe
router.post('/push-subscribe', async (req, res) => {
  try {
    const { endpoint, keys } = req.body
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ message: 'Invalid push subscription payload' })
    }

    const subId = crypto.randomUUID()

    await query(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, endpoint) DO UPDATE
       SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, updated_at = NOW()`,
      [subId, req.user.id, endpoint, keys.p256dh, keys.auth]
    )

    res.status(201).json({ message: 'Push subscription registered successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to register push subscription' })
  }
})

// DELETE /api/notifications/push-unsubscribe
router.delete('/push-unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body
    if (!endpoint) return res.status(400).json({ message: 'Endpoint is required' })

    await query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [req.user.id, endpoint])
    res.json({ message: 'Push subscription removed successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove push subscription' })
  }
})

// GET /api/notifications/preferences
router.get('/preferences', async (req, res) => {
  try {
    const result = await query('SELECT push_notifications_enabled FROM users WHERE id = $1', [req.user.id])
    const enabled = result.rows[0]?.push_notifications_enabled !== false
    res.json({
      inApp: true,
      push: enabled,
      categories: { messages: true, events: true, marketplace: true, lostFound: true }
    })
  } catch (err) {
    res.status(500).json({ message: 'Failed to load preferences' })
  }
})

// PUT /api/notifications/preferences
router.put('/preferences', async (req, res) => {
  try {
    const { push } = req.body
    const enabled = push === true || push === 'true'
    await query('UPDATE users SET push_notifications_enabled = $1 WHERE id = $2', [enabled, req.user.id])
    res.json({ message: 'Preferences updated successfully', push: enabled })
  } catch (err) {
    res.status(500).json({ message: 'Failed to update preferences' })
  }
})

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
