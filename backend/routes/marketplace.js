const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')
const { uploadSingle, deleteFiles } = require('../middleware/upload')

// GET /api/marketplace
router.get('/', authenticate, async (req, res) => {
  try {
    const { q, category, condition, sort, status, seller_id } = req.query
    let sql = `
      SELECT m.*,
        u.first_name || ' ' || u.last_name as seller_name,
        u.email as seller_email,
        u.department as seller_department,
        u.student_id as seller_student_id,
        u.id as seller_id,
        CASE WHEN array_length(m.images, 1) > 0 THEN m.images[1] ELSE NULL END as image_url
      FROM marketplace_listings m
      JOIN users u ON u.id = m.seller_id
      WHERE 1=1
    `
    const params = []
    let idx = 1

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

    // -------------------------------------------------------------------------
    // ARCHITECTURAL SCALABILITY ROADMAP:
    // Server-Side LIMIT / OFFSET Pagination.
    // For current campus datasets (thousands of listings), OFFSET pagination provides
    // instant query response times and clean page navigation UI.
    // Scalability Note: When scaling to millions of records, transition to
    // Keyset / Cursor Pagination (WHERE created_at < $cursor ORDER BY created_at DESC LIMIT $limit)
    // to eliminate O(N) offset table scan costs.
    // -------------------------------------------------------------------------
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

// GET /api/marketplace/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(`
      SELECT m.*,
        u.first_name || ' ' || u.last_name as seller_name,
        u.email as seller_email,
        u.department as seller_department,
        u.student_id as seller_student_id,
        u.phone as seller_phone,
        u.id as seller_id,
        CASE WHEN array_length(m.images, 1) > 0 THEN m.images[1] ELSE NULL END as image_url
      FROM marketplace_listings m
      JOIN users u ON u.id = m.seller_id
      WHERE m.id = $1
    `, [req.params.id])
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

    const admins = await query("SELECT id FROM users WHERE role = 'admin'")
    for (const admin of admins.rows) {
      await query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
        [
          admin.id,
          'Listing Reported ⚠️',
          `Listing #${req.params.id.slice(0, 8)} reported by user: ${reason} - ${details || 'No details'}`,
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
