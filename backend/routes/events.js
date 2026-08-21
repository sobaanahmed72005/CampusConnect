const express = require('express')
const router = express.Router()
const { query, getClient } = require('../config/database')
const { authenticate, requireAdmin } = require('../middleware/auth')

router.use(authenticate)

// GET /api/events
router.get('/', async (req, res) => {
  try {
    const { q, category, upcoming, limit } = req.query
    let sql = `
      SELECT e.*,
        u.first_name || ' ' || u.last_name as organizer_name,
        COUNT(er.id) as registered_count,
        MAX(CASE WHEN er.user_id = $1 THEN 1 ELSE 0 END)::boolean as is_registered
      FROM events e
      LEFT JOIN users u ON u.id = e.created_by
      LEFT JOIN event_registrations er ON er.event_id = e.id
      WHERE 1=1
    `
    const params = [req.user.id]
    let idx = 2
    if (q) { sql += ` AND (e.title ILIKE $${idx} OR e.description ILIKE $${idx})`; params.push(`%${q}%`); idx++ }
    if (category) { sql += ` AND e.category = $${idx}`; params.push(category); idx++ }
    if (upcoming === 'true') { sql += ` AND e.date >= CURRENT_DATE` }
    sql += ` GROUP BY e.id, u.first_name, u.last_name ORDER BY e.date ASC`
    if (limit) { sql += ` LIMIT $${idx}`; params.push(parseInt(limit)); idx++ }
    const result = await query(sql, params)
    res.json({ events: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load events' })
  }
})

// GET /api/events/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(`
      SELECT e.*,
        u.first_name || ' ' || u.last_name as organizer_name,
        COUNT(er.id) as registered_count,
        MAX(CASE WHEN er.user_id = $1 THEN 1 ELSE 0 END)::boolean as is_registered
      FROM events e
      LEFT JOIN users u ON u.id = e.created_by
      LEFT JOIN event_registrations er ON er.event_id = e.id
      WHERE e.id = $2
      GROUP BY e.id, u.first_name, u.last_name
    `, [req.user.id, req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ message: 'Event not found' })
    res.json({ event: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed' })
  }
})

// POST /api/events/:id/register (ACID Transactional Endpoint)
router.post('/:id/register', async (req, res) => {
  const client = await getClient()
  try {
    const { id } = req.params
    await client.query('BEGIN')

    const event = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [id])
    if (event.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Event not found' })
    }
    const ev = event.rows[0]

    const registered = await client.query('SELECT COUNT(*) FROM event_registrations WHERE event_id = $1', [id])
    if (parseInt(registered.rows[0].count) >= ev.capacity) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Event is full' })
    }

    await client.query(
      'INSERT INTO event_registrations (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, req.user.id]
    )

    await client.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)',
      [
        req.user.id,
        'Event Registration Confirmed 🎉',
        `You're registered for "${ev.title}". Location: ${ev.location}, Time: ${ev.time || 'Check schedule'}`,
        'event'
      ]
    )

    await client.query('COMMIT')
    res.json({ message: 'Registered successfully' })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Transactional event registration error:', err)
    res.status(500).json({ message: 'Registration failed' })
  } finally {
    client.release()
  }
})

// DELETE /api/events/:id/register (ACID Transactional Cancellation Endpoint)
router.delete('/:id/register', async (req, res) => {
  const client = await getClient()
  try {
    const { id } = req.params
    await client.query('BEGIN')

    const event = await client.query('SELECT title FROM events WHERE id = $1', [id])
    const title = event.rows[0]?.title || 'Event'

    await client.query('DELETE FROM event_registrations WHERE event_id = $1 AND user_id = $2', [id, req.user.id])

    await client.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'Registration Cancelled ℹ️', `Your registration for "${title}" has been cancelled.`, 'event']
    )

    await client.query('COMMIT')
    res.json({ message: 'Registration cancelled' })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Transactional cancellation error:', err)
    res.status(500).json({ message: 'Failed to cancel registration' })
  } finally {
    client.release()
  }
})

// POST /api/events (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, description, category, date, time, location, capacity } = req.body
    if (!title) return res.status(400).json({ message: 'Title is required' })
    const result = await query(
      `INSERT INTO events (title, description, category, date, time, location, capacity, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, description, category, date, time, location, capacity || 100, req.user.id]
    )

    // Notify users about new campus event
    try {
      const users = await query('SELECT id FROM users LIMIT 50')
      for (const u of users.rows) {
        if (u.id !== req.user.id) {
          await query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)',
            [u.id, 'New Campus Event Published 📅', `"${title}" has been scheduled for ${new Date(date).toLocaleDateString()}. Register now!`, 'event']
          )
        }
      }
    } catch (e) {}

    res.status(201).json({ event: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to create event' })
  }
})

// PUT /api/events/:id (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { title, description, category, date, time, location, capacity } = req.body
    const result = await query(
      `UPDATE events SET title=$1,description=$2,category=$3,date=$4,time=$5,location=$6,capacity=$7,updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [title, description, category, date, time, location, capacity, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ message: 'Event not found' })
    res.json({ event: result.rows[0] })
  } catch (err) {
    res.status(500).json({ message: 'Failed to update' })
  }
})

// DELETE /api/events/:id (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM events WHERE id = $1', [req.params.id])
    res.json({ message: 'Event deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Failed' })
  }
})

module.exports = router
