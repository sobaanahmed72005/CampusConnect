const express = require('express')
const router = express.Router()
const { query, getClient } = require('../config/database')
const { authenticate, requireAdmin } = require('../middleware/auth')
const cacheService = require('../services/cacheService')

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

// Ensure table and discussion comments exist
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)

    await query(`
      CREATE TABLE IF NOT EXISTS announcement_comments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
        author_id UUID REFERENCES users(id) ON DELETE CASCADE,
        author_name VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)
  } catch (e) {
    console.error('Failed to initialize announcements table:', e.message)
  }
}
initTable()

// GET /api/announcements (Fetch feed with category filter)
router.get('/', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50')
    const offset = parseInt(req.query.offset || '0')
    const { category } = req.query

    let sql = 'SELECT * FROM announcements'
    const params = []

    if (category && category !== 'all') {
      sql += ' WHERE category = $1'
      params.push(category)
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const result = await query(sql, params)
    res.json({ announcements: result.rows, categories: ANNOUNCEMENT_CATEGORIES })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load announcements' })
  }
})

// POST /api/announcements (Create Announcement / Student Discussion Post)
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, message, category } = req.body
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' })
    }

    const selectedCategory = ANNOUNCEMENT_CATEGORIES.includes(category)
      ? category
      : '💬 Community Notice'

    // Restrict Official & Urgent alerts to Admin users
    const isOfficialCategory = selectedCategory === '🚨 Urgent Alert' || selectedCategory === '📢 Official Announcement'
    if (isOfficialCategory && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only campus admins can post official or urgent alerts' })
    }

    const authorName = `${req.user.first_name} ${req.user.last_name}`
    const result = await query(
      `INSERT INTO announcements (title, message, category, author_id, author_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, message, selectedCategory, req.user.id, authorName]
    )

    const announcement = result.rows[0]
    res.status(201).json({ message: 'Published successfully', announcement })
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

// POST /api/announcements/:id/comments (Add Comment to Discussion Thread)
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const { message } = req.body
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Comment message cannot be empty' })
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
