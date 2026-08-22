const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')
const { uploadSingle, deleteFiles } = require('../middleware/upload')

// GET /api/marketplace
router.get('/', authenticate, async (req, res) => {
  try {
    const { q, category, condition, sort, status, seller_id } = req.query
    const userId = req.user ? req.user.id : null

    let sql = `
      SELECT m.*,
        u.first_name || ' ' || u.last_name as seller_name,
        u.email as seller_email,
        u.department as seller_department,
        u.student_id as seller_student_id,
        u.id as seller_id,
        CASE WHEN array_length(m.images, 1) > 0 THEN m.images[1] ELSE NULL END as image_url,
        EXISTS(SELECT 1 FROM marketplace_favorites f WHERE f.listing_id = m.id AND f.user_id = $1) as is_favorite
      FROM marketplace_listings m
      JOIN users u ON u.id = m.seller_id
      WHERE 1=1
    `
    const params = [userId]
    let idx = 2

    if (status === 'available') {
      sql += ` AND m.is_sold = false`
    } else if (status === 'sold') {
      sql += ` AND m.is_sold = true`
    } else if (!status) {
      sql += ` AND m.is_sold = false`
    }

    if (seller_id) {
      sql += ` AND m.seller_id = $${idx}`
      params.push(seller_id)
      idx++
    }

    if (q) {
      sql += ` AND (m.title ILIKE $${idx} OR m.description ILIKE $${idx} OR m.location ILIKE $${idx})`
      params.push(`%${q}%`)
      idx++
    }
    if (category && category !== 'All') {
      sql += ` AND m.category = $${idx}`
      params.push(category)
      idx++
    }
    if (condition && condition !== 'All') {
      sql += ` AND m.condition = $${idx}`
      params.push(condition)
      idx++
    }

    // Count total matching items before pagination limit
    const countSql = `SELECT COUNT(*) FROM (${sql}) as count_tbl`
    const countResult = await query(countSql, params)
    const total = parseInt(countResult.rows[0].count)

    // Sort order
    if (sort === 'price_asc') {
      sql += ` ORDER BY m.price ASC`
    } else if (sort === 'price_desc') {
      sql += ` ORDER BY m.price DESC`
    } else {
      sql += ` ORDER BY m.created_at DESC`
    }

    const pageNum = parseInt(req.query.page) || 1
    const limitNum = parseInt(req.query.limit) || 12
    const offsetNum = (pageNum - 1) * limitNum

    sql += ` LIMIT $${idx} OFFSET $${idx + 1}`
    params.push(limitNum, offsetNum)

    const result = await query(sql, params)
    res.json({
      products: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load listings' })
  }
})

// GET /api/marketplace/favorites
router.get('/favorites', authenticate, async (req, res) => {
  try {
    const pageNum = parseInt(req.query.page) || 1
    const limitNum = parseInt(req.query.limit) || 12
    const offsetNum = (pageNum - 1) * limitNum

    const countSql = `SELECT COUNT(*) FROM marketplace_favorites WHERE user_id = $1`
    const countResult = await query(countSql, [req.user.id])
    const total = parseInt(countResult.rows[0].count)

    const sql = `
      SELECT m.*,
        u.first_name || ' ' || u.last_name as seller_name,
        u.email as seller_email,
        u.department as seller_department,
        u.student_id as seller_student_id,
        u.id as seller_id,
        CASE WHEN array_length(m.images, 1) > 0 THEN m.images[1] ELSE NULL END as image_url,
        true as is_favorite
      FROM marketplace_favorites f
      JOIN marketplace_listings m ON m.id = f.listing_id
      JOIN users u ON u.id = m.seller_id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `
    const result = await query(sql, [req.user.id, limitNum, offsetNum])
    res.json({
      products: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load favorite listings' })
  }
})

// POST /api/marketplace/:id/favorite (Toggle favorite state)
router.post('/:id/favorite', authenticate, async (req, res) => {
  try {
    const listingId = req.params.id
    const userId = req.user.id

    const checkListing = await query('SELECT id FROM marketplace_listings WHERE id = $1', [listingId])
    if (checkListing.rows.length === 0) return res.status(404).json({ message: 'Listing not found' })

    const existing = await query(
      'SELECT 1 FROM marketplace_favorites WHERE user_id = $1 AND listing_id = $2',
      [userId, listingId]
    )

    if (existing.rows.length > 0) {
      await query('DELETE FROM marketplace_favorites WHERE user_id = $1 AND listing_id = $2', [userId, listingId])
      return res.json({ favorited: false, message: 'Removed from favorites' })
    } else {
      await query('INSERT INTO marketplace_favorites (user_id, listing_id) VALUES ($1, $2)', [userId, listingId])
      return res.json({ favorited: true, message: 'Saved to favorites' })
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to toggle favorite status' })
  }
})

// DELETE /api/marketplace/:id/favorite
router.delete('/:id/favorite', authenticate, async (req, res) => {
  try {
    const listingId = req.params.id
    const userId = req.user.id

    await query('DELETE FROM marketplace_favorites WHERE user_id = $1 AND listing_id = $2', [userId, listingId])
    res.json({ favorited: false, message: 'Removed from favorites' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to remove favorite' })
  }
})

// GET /api/marketplace/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null
    const result = await query(`
      SELECT m.*,
        u.first_name || ' ' || u.last_name as seller_name,
        u.email as seller_email,
        u.department as seller_department,
        u.student_id as seller_student_id,
        u.phone as seller_phone,
        u.id as seller_id,
        CASE WHEN array_length(m.images, 1) > 0 THEN m.images[1] ELSE NULL END as image_url,
        EXISTS(SELECT 1 FROM marketplace_favorites f WHERE f.listing_id = m.id AND f.user_id = $2) as is_favorite
      FROM marketplace_listings m
      JOIN users u ON u.id = m.seller_id
      WHERE m.id = $1
    `, [req.params.id, userId])
    if (result.rows.length === 0) return res.status(404).json({ message: 'Listing not found' })

    const product = result.rows[0]

    // Fetch other listings by this seller
    const otherListings = await query(`
      SELECT id, title, price, condition, category,
        CASE WHEN array_length(images, 1) > 0 THEN images[1] ELSE NULL END as image_url
      FROM marketplace_listings
      WHERE seller_id = $1 AND id != $2 AND is_sold = false
      LIMIT 4
    `, [product.seller_id, product.id])

    res.json({ product, sellerListings: otherListings.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load product' })
  }
})

// POST /api/marketplace/:id/report
router.post('/:id/report', authenticate, async (req, res) => {
  try {
    const { reason, details } = req.body
    if (!reason) return res.status(400).json({ message: 'Reason is required' })

    const listingId = req.params.id
    const reporterId = req.user.id

    const listingCheck = await query('SELECT id FROM marketplace_listings WHERE id = $1', [listingId])
    if (listingCheck.rows.length === 0) return res.status(404).json({ message: 'Listing not found' })

    const reportId = crypto.randomUUID()

    await query(
      `INSERT INTO marketplace_reports (id, listing_id, reporter_id, reason, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [reportId, listingId, reporterId, reason, details || '']
    )

    const admins = await query("SELECT id FROM users WHERE role = 'admin'")
    for (const admin of admins.rows) {
      await query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
        [
          admin.id,
          'Listing Reported ⚠️',
          `Listing #${listingId.slice(0, 8)} reported by user: ${reason} - ${details || 'No details'}`,
          'system'
        ]
      )
    }

    res.json({ message: 'Listing reported successfully. Our team will review it.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to submit report' })
  }
})


// POST /api/marketplace (Uses magic-byte protected file upload)
router.post('/', authenticate, uploadSingle('image'), async (req, res) => {
  let uploadedPath = null
  try {
    const { title, description, price, category, condition, location } = req.body
    if (!title || !price) {
      if (req.file) deleteFiles([req.file.path])
      return res.status(400).json({ message: 'Title and price are required' })
    }

    const images = req.file ? [`/uploads/marketplace/${req.file.filename}`] : []
    if (req.file) uploadedPath = req.file.path

    const result = await query(
      `INSERT INTO marketplace_listings (title, description, price, category, condition, images, location, seller_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, description, parseFloat(price), category, condition, images, location || 'Campus Main Library', req.user.id]
    )
    res.status(201).json({ product: result.rows[0] })
  } catch (err) {
    if (uploadedPath) deleteFiles([uploadedPath])
    console.error(err)
    res.status(500).json({ message: 'Failed to create listing' })
  }
})

// PUT /api/marketplace/:id
router.put('/:id', authenticate, uploadSingle('image'), async (req, res) => {
  let uploadedPath = null
  try {
    const { id } = req.params
    const existing = await query('SELECT * FROM marketplace_listings WHERE id=$1 AND seller_id=$2', [id, req.user.id])
    if (existing.rows.length === 0) {
      if (req.file) deleteFiles([req.file.path])
      return res.status(403).json({ message: 'Not authorized or not found' })
    }

    const { title, description, price, category, condition, location, is_sold } = req.body
    const images = req.file ? [`/uploads/marketplace/${req.file.filename}`] : existing.rows[0].images
    if (req.file) uploadedPath = req.file.path

    const result = await query(
      `UPDATE marketplace_listings SET title=$1,description=$2,price=$3,category=$4,condition=$5,images=$6,location=$7,is_sold=$8,updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [title, description, parseFloat(price), category, condition, images, location || existing.rows[0].location, is_sold === 'true' || is_sold === true, id]
    )
    res.json({ product: result.rows[0] })
  } catch (err) {
    if (uploadedPath) deleteFiles([uploadedPath])
    res.status(500).json({ message: 'Failed to update' })
  }
})

// PATCH /api/marketplace/:id/sold
router.patch('/:id/sold', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const check = await query('SELECT * FROM marketplace_listings WHERE id=$1 AND seller_id=$2', [id, req.user.id])
    if (check.rows.length === 0) return res.status(403).json({ message: 'Not authorized or listing not found' })

    const updated = await query(
      'UPDATE marketplace_listings SET is_sold = NOT is_sold, updated_at=NOW() WHERE id=$1 RETURNING *',
      [id]
    )
    res.json({ product: updated.rows[0], message: `Status updated to ${updated.rows[0].is_sold ? 'Sold' : 'Available'}` })
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status' })
  }
})

// DELETE /api/marketplace/:id (Cleanup files from disk on deletion)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const isAdmin = req.user.role === 'admin'
    const check = isAdmin
      ? await query('SELECT * FROM marketplace_listings WHERE id=$1', [id])
      : await query('SELECT * FROM marketplace_listings WHERE id=$1 AND seller_id=$2', [id, req.user.id])

    if (check.rows.length === 0) return res.status(403).json({ message: 'Not authorized' })

    const listing = check.rows[0]
    if (listing.images && Array.isArray(listing.images)) {
      deleteFiles(listing.images)
    }

    await query('DELETE FROM marketplace_listings WHERE id=$1', [id])
    res.json({ message: 'Listing deleted permanently and image files cleaned up' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete' })
  }
})

module.exports = router
