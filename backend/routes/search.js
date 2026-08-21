const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

// GET /api/search?q=laptop
router.get('/', authenticate, async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.trim().length === 0) {
      return res.json({ results: { marketplace: [], events: [], accommodation: [], lostFound: [] } })
    }

    const searchPattern = `%${q.trim()}%`

    // 1. Marketplace search
    const mkt = await query(`
      SELECT id, title, price, category, 'marketplace' as item_type,
        CASE WHEN array_length(images, 1) > 0 THEN images[1] ELSE NULL END as image_url
      FROM marketplace_listings
      WHERE is_sold = false AND (title ILIKE $1 OR description ILIKE $1 OR category ILIKE $1)
      LIMIT 4
    `, [searchPattern])

    // 2. Events search
    const events = await query(`
      SELECT id, title, location, category, date, 'events' as item_type
      FROM events
      WHERE title ILIKE $1 OR description ILIKE $1 OR location ILIKE $1
      LIMIT 4
    `, [searchPattern])

    // 3. Accommodation search
    const acc = await query(`
      SELECT id, title, price, type, location, 'accommodation' as item_type
      FROM accommodation_listings
      WHERE is_available = true AND (title ILIKE $1 OR description ILIKE $1 OR location ILIKE $1)
      LIMIT 4
    `, [searchPattern])

    // 4. Lost & Found search
    const lf = await query(`
      SELECT id, title, location, type, category, 'lostFound' as item_type
      FROM lost_found_reports
      WHERE is_resolved = false AND (title ILIKE $1 OR description ILIKE $1 OR location ILIKE $1)
      LIMIT 4
    `, [searchPattern])

    res.json({
      results: {
        marketplace: mkt.rows,
        events: events.rows,
        accommodation: acc.rows,
        lostFound: lf.rows
      }
    })
  } catch (err) {
    console.error('Global search error:', err)
    res.status(500).json({ message: 'Search failed' })
  }
})

module.exports = router
