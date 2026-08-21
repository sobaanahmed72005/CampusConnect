const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET /api/accommodation
router.get('/', async (req, res) => {
  try {
    const { q, type, gender, furnishing } = req.query
    let sql = `
      SELECT a.*,
        u.first_name || ' ' || u.last_name as owner_name,
        u.email as owner_email,
        u.phone as owner_phone,
        CASE WHEN array_length(a.images, 1) > 0 THEN a.images[1] ELSE NULL END as image_url
      FROM accommodation_listings a
      LEFT JOIN users u ON u.id = a.owner_id
      WHERE a.is_available = true
    `
    const params = []
    let idx = 1

    if (q) {
      sql += ` AND (a.title ILIKE $${idx} OR a.description ILIKE $${idx} OR a.location ILIKE $${idx})`
      params.push(`%${q}%`)
      idx++
    }
    if (type && type !== 'all') {
      sql += ` AND a.type = $${idx}`
      params.push(type.toLowerCase().replace(' ', '_'))
      idx++
    }
    if (gender && gender !== 'All') {
      sql += ` AND a.gender_preference ILIKE $${idx}`
      params.push(gender)
      idx++
    }
    if (furnishing && furnishing !== 'All') {
      sql += ` AND a.furnishing_status ILIKE $${idx}`
      params.push(furnishing)
      idx++
    }

    sql += ` ORDER BY a.created_at DESC`
    const result = await query(sql, params)
    res.json({ listings: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load accommodation' })
  }
})

// GET /api/accommodation/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT a.*,
        u.first_name || ' ' || u.last_name as owner_name,
        u.email as owner_email,
        u.phone as owner_phone,
        CASE WHEN array_length(a.images, 1) > 0 THEN a.images[1] ELSE NULL END as image_url
      FROM accommodation_listings a
      LEFT JOIN users u ON u.id = a.owner_id
      WHERE a.id = $1
    `, [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ message: 'Listing not found' })

    const listing = result.rows[0]

    // Fetch similar accommodation listings
    const similar = await query(`
      SELECT id, title, type, price, price_period, location, distance_to_campus, gender_preference, furnishing_status, rooms_available,
        CASE WHEN array_length(images, 1) > 0 THEN images[1] ELSE NULL END as image_url
      FROM accommodation_listings
      WHERE id != $1 AND is_available = true
      LIMIT 3
    `, [listing.id])

    res.json({ listing, similarListings: similar.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load listing details' })
  }
})

// POST /api/accommodation/inquiry
router.post('/inquiry', async (req, res) => {
  try {
    const { listing_id, message, move_in_date, preferred_contact } = req.body
    const listing = await query('SELECT * FROM accommodation_listings WHERE id=$1', [listing_id])
    if (listing.rows.length === 0) return res.status(404).json({ message: 'Listing not found' })
    const l = listing.rows[0]

    if (l.owner_id) {
      try {
        await query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)',
          [
            l.owner_id,
            'New Housing Inquiry 🏠',
            `Inquiry from ${req.user.first_name} for "${l.title}". Preferred Move-in: ${move_in_date || 'Immediate'}. Contact: ${preferred_contact || req.user.email}`,
            'accommodation'
          ]
        )
      } catch (e) {}
    }

    res.json({ message: 'Housing inquiry sent successfully!' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to send inquiry' })
  }
})

module.exports = router
