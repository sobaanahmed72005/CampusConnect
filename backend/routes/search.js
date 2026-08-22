const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

// GET /api/search?q=query&category=all
router.get('/', authenticate, async (req, res) => {
  try {
    const { q, category } = req.query
    if (!q || q.trim().length === 0) {
      return res.json({
        results: {
          marketplace: [],
          events: [],
          accommodation: [],
          lostFound: [],
          announcements: [],
          users: []
        }
      })
    }

    const searchPattern = `%${q.trim()}%`

    // 1. Marketplace search
    const mkt = await query(`
      SELECT id, title, price, category, 'marketplace' as item_type,
        CASE WHEN array_length(images, 1) > 0 THEN images[1] ELSE NULL END as image_url
      FROM marketplace_listings
      WHERE is_sold = false AND (title ILIKE $1 OR description ILIKE $1 OR category ILIKE $1)
      LIMIT 5
    `, [searchPattern]).catch(() => ({ rows: [] }))

    // 2. Events search
    const events = await query(`
      SELECT id, title, location, category, date, 'events' as item_type
      FROM events
      WHERE title ILIKE $1 OR description ILIKE $1 OR location ILIKE $1
      LIMIT 5
    `, [searchPattern]).catch(() => ({ rows: [] }))

    // 3. Accommodation search
    const acc = await query(`
      SELECT id, title, rent as price, type, location, 'accommodation' as item_type
      FROM accommodation_listings
      WHERE is_available = true AND (title ILIKE $1 OR description ILIKE $1 OR location ILIKE $1)
      LIMIT 5
    `, [searchPattern]).catch(() => ({ rows: [] }))

    // 4. Lost & Found search
    const lf = await query(`
      SELECT id, title, location, type, category, 'lostFound' as item_type
      FROM lost_found_reports
      WHERE is_resolved = false AND (title ILIKE $1 OR description ILIKE $1 OR location ILIKE $1)
      LIMIT 5
    `, [searchPattern]).catch(() => ({ rows: [] }))

    // 5. Announcements search
    const anc = await query(`
      SELECT id, title, content, created_at, 'announcement' as item_type
      FROM announcements
      WHERE title ILIKE $1 OR content ILIKE $1
      LIMIT 5
    `, [searchPattern]).catch(() => ({ rows: [] }))

    // 6. Users / Directory search
    const users = await query(`
      SELECT id, first_name, last_name, email, department, role, 'user' as item_type
      FROM users
      WHERE is_active = true AND (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1 OR department ILIKE $1)
      LIMIT 5
    `, [searchPattern]).catch(() => ({ rows: [] }))

    res.json({
      results: {
        marketplace: mkt.rows || [],
        events: events.rows || [],
        accommodation: acc.rows || [],
        lostFound: lf.rows || [],
        announcements: anc.rows || [],
        users: users.rows || []
      }
    })
  } catch (err) {
    console.error('Global search error:', err)
    res.status(500).json({ message: 'Search failed' })
  }
})

module.exports = router
