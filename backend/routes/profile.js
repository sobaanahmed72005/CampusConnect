const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET /api/profile
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, first_name, last_name, email, role, department, student_id, phone, bio, year_of_study, avatar_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' })
    res.json({ user: result.rows[0] })
  } catch (err) {
    res.status(500).json({ message: 'Failed' })
  }
})

// PUT /api/profile
router.put('/', async (req, res) => {
  try {
    const { first_name, last_name, phone, bio, department, year_of_study } = req.body
    const result = await query(
      `UPDATE users SET first_name=$1, last_name=$2, phone=$3, bio=$4, department=$5, year_of_study=$6, updated_at=NOW()
       WHERE id=$7
       RETURNING id, first_name, last_name, email, role, department, student_id, phone, bio, year_of_study, avatar_url`,
      [first_name, last_name, phone, bio, department, year_of_study, req.user.id]
    )
    res.json({ user: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to update profile' })
  }
})

// GET /api/profile/listings (my marketplace listings)
router.get('/listings', async (req, res) => {
  try {
    const result = await query(
      'SELECT *, CASE WHEN array_length(images, 1) > 0 THEN images[1] ELSE NULL END as image_url FROM marketplace_listings WHERE seller_id=$1 ORDER BY created_at DESC',
      [req.user.id]
    )
    res.json({ listings: result.rows })
  } catch (err) {
    res.json({ listings: [] })
  }
})

// GET /api/profile/events (my registered events)
router.get('/events', async (req, res) => {
  try {
    const result = await query(
      `SELECT e.* FROM events e
       JOIN event_registrations er ON er.event_id = e.id
       WHERE er.user_id = $1
       ORDER BY e.date ASC`,
      [req.user.id]
    )
    res.json({ events: result.rows })
  } catch (err) {
    res.json({ events: [] })
  }
})

const bcrypt = require('bcryptjs')

// POST /api/profile/change-password
router.post('/change-password', async (req, res) => {
  try {
    const { current_password, new_password } = req.body
    if (!current_password || !new_password) return res.status(400).json({ message: 'Current and new password are required' })
    if (new_password.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters long' })

    const userRes = await query('SELECT password FROM users WHERE id=$1', [req.user.id])
    if (userRes.rows.length === 0) return res.status(404).json({ message: 'User not found' })

    const valid = await bcrypt.compare(current_password, userRes.rows[0].password)
    if (!valid) return res.status(400).json({ message: 'Current password is incorrect' })

    const hash = await bcrypt.hash(new_password, 12)
    await query('UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2', [hash, req.user.id])

    res.json({ message: 'Password changed successfully!' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to change password' })
  }
})

// DELETE /api/profile/account
router.delete('/account', async (req, res) => {
  try {
    const { password } = req.body
    if (!password) return res.status(400).json({ message: 'Password confirmation is required to deactivate account' })

    const userRes = await query('SELECT password FROM users WHERE id=$1', [req.user.id])
    if (userRes.rows.length === 0) return res.status(404).json({ message: 'User not found' })

    const valid = await bcrypt.compare(password, userRes.rows[0].password)
    if (!valid) return res.status(400).json({ message: 'Password is incorrect' })

    await query('UPDATE users SET is_active=false, updated_at=NOW() WHERE id=$1', [req.user.id])
    res.clearCookie('token')
    res.json({ message: 'Account deactivated successfully.' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to deactivate account' })
  }
})

module.exports = router
