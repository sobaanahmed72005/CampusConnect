const webpush = require('web-push')
const { query } = require('../config/database')

// VAPID Configuration from environment variables
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BCx0K89vLqFv-xM8e5k8kQ_5kZ5kZ5kZ5kZ5kZ5kZ5kZ5kZ5kZ5kZ5kZ5kZ5kZ5kZ5kZ5kZ5kZ5kZ5k'
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'sample_private_key_for_dev_mode_testing_only'
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@campusconnect.edu.pk'

try {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
} catch (e) {
  // Silent fallback for test environments without VAPID keys configured
}

async function sendPushToUser(userId, payload) {
  if (!userId) return
  try {
    // Check if user has push notifications enabled in preferences
    const userCheck = await query('SELECT push_notifications_enabled FROM users WHERE id = $1', [userId])
    if (userCheck.rows.length === 0 || userCheck.rows[0].push_notifications_enabled === false) {
      return
    }

    const subs = await query('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1', [userId])
    if (subs.rows.length === 0) return

    const pushPayload = JSON.stringify({
      title: payload.title || 'CampusConnect Notification',
      body: payload.body || payload.message || '',
      icon: payload.icon || '/logo.png',
      url: payload.url || '/dashboard',
      data: payload.data || {}
    })

    const sendPromises = subs.rows.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }

      try {
        await webpush.sendNotification(pushSub, pushPayload)
      } catch (err) {
        // Prune expired or invalid subscriptions (HTTP 404 or 410)
        if (err.statusCode === 404 || err.statusCode === 410) {
          await query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]).catch(() => {})
        }
      }
    })

    await Promise.all(sendPromises)
  } catch (err) {
    // Push delivery failure MUST NOT crash the main application
    console.error('Push delivery warning:', err.message)
  }
}

module.exports = {
  sendPushToUser,
  vapidPublicKey
}
