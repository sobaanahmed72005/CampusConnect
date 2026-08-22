const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

const ANNOUNCEMENT_CATEGORIES = [
  '🚨 Urgent Alert',
  '📢 Official Announcement',
  '🎓 Society Announcement',
  '🎉 Event Announcement',
  '📅 Event Update',
  '🔔 General Update',
  '💬 Community Notice',
  '🗣️ Rumours'
]

// Ensure table and columns exist
async function initTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        category VARCHAR(100) DEFAULT '🔔 General Update',
        author_id UUID REFERENCES users(id) ON DELETE SET NULL,
        author_name VARCHAR(100),
        is_pinned BOOLEAN DEFAULT false,
        event_date TIMESTAMP WITH TIME ZONE,
        event_location VARCHAR(255),
        image_url TEXT,
        link_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)

    await query(`
      CREATE TABLE IF NOT EXISTS announcement_comments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
        author_id UUID REFERENCES users(id) ON DELETE CASCADE,
        author_name VARCHAR(100) NOT NULL,
        message VARCHAR(500) NOT NULL,
        reported BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)
  } catch (e) {
    console.error('Failed to initialize announcements table:', e.message)
  }
}
initTable()

// GET /api/announcements (Unified search, filter, sort, pagination)
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1')
    const limit = parseInt(req.query.limit || '20')
    const offset = (page - 1) * limit
    const { category, search, sort } = req.query

    let sql = 'SELECT * FROM announcements'
    const whereClauses = []
    const params = []

    if (category && category !== 'All') {
      params.push(category)
      whereClauses.push(`category = $${params.length}`)
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`)
      whereClauses.push(`(title ILIKE $${params.length} OR message ILIKE $${params.length})`)
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ')
    }

    // Sort logic (Pinned posts always stay at top)
    let orderBy = 'ORDER BY is_pinned DESC, created_at DESC'
    if (sort === 'oldest') {
      orderBy = 'ORDER BY is_pinned DESC, created_at ASC'
    }

    sql += ` ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const result = await query(sql, params)
    res.json({
      announcements: result.rows,
      categories: ANNOUNCEMENT_CATEGORIES,
      page,
      limit
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load announcements feed' })
  }
})

// POST /api/announcements (Create Announcement / Discussion Post)
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, message, category, is_pinned, event_date, event_location, image_url, link_url } = req.body
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message details are required' })
    }

    const selectedCategory = ANNOUNCEMENT_CATEGORIES.includes(category)
      ? category
      : '💬 Community Notice'

    // Restrict Urgent / Official alerts & pinning to Admin users
    const isOfficialCategory = selectedCategory === '🚨 Urgent Alert' || selectedCategory === '📢 Official Announcement'
    if ((isOfficialCategory || is_pinned) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only campus admins can post official/urgent alerts or pin posts' })
    }

    // Event fields allowed ONLY for event categories
    const isEventCategory = selectedCategory === '🎉 Event Announcement' || selectedCategory === '📅 Event Update'
    const finalEventDate = isEventCategory && event_date ? event_date : null
    const finalEventLocation = isEventCategory && event_location ? event_location : null

    const authorName = `${req.user.first_name} ${req.user.last_name}`
    const result = await query(
      `INSERT INTO announcements (title, message, category, author_id, author_name, is_pinned, event_date, event_location, image_url, link_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        title,
        message,
        selectedCategory,
        req.user.id,
        authorName,
        Boolean(is_pinned),
        finalEventDate,
        finalEventLocation,
        image_url || null,
        link_url || null
      ]
    )

    res.status(201).json({ message: 'Published successfully', announcement: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to publish post' })
  }
})

// GET /api/announcements/:id/comments (Fetch Discussion Comments)
router.get('/:id/comments', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM announcement_comments WHERE announcement_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    )
    res.json({ comments: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load comments' })
  }
})

// POST /api/announcements/:id/comments (Add Comment with 500-char limit)
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const { message } = req.body
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Comment message cannot be empty' })
    }

    if (message.trim().length > 500) {
      return res.status(400).json({ message: 'Comment cannot exceed 500 characters' })
    }

    const authorName = `${req.user.first_name} ${req.user.last_name}`
    const result = await query(
      `INSERT INTO announcement_comments (announcement_id, author_id, author_name, message)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, req.user.id, authorName, message.trim()]
    )

    res.status(201).json({ comment: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to post comment' })
  }
})

// DELETE /api/announcements/:id/comments/:commentId (Author or Admin)
router.delete('/:id/comments/:commentId', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      await query('DELETE FROM announcement_comments WHERE id = $1', [req.params.commentId])
    } else {
      await query('DELETE FROM announcement_comments WHERE id = $1 AND author_id = $2', [req.params.commentId, req.user.id])
    }
    res.json({ message: 'Comment deleted successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete comment' })
  }
})

// POST /api/announcements/:id/comments/:commentId/report (Report Comment)
router.post('/:id/comments/:commentId/report', authenticate, async (req, res) => {
  try {
    await query('UPDATE announcement_comments SET reported = true WHERE id = $1', [req.params.commentId])
    res.json({ message: 'Comment reported for moderation' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to report comment' })
  }
})

// DELETE /api/announcements/:id (Admin or Author)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      await query('DELETE FROM announcements WHERE id = $1', [req.params.id])
    } else {
      await query('DELETE FROM announcements WHERE id = $1 AND author_id = $2', [req.params.id, req.user.id])
    }
    res.json({ message: 'Post deleted successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete post' })
  }
})

module.exports = router
