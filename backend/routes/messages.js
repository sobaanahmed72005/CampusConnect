// Real-Time Marketplace Messaging Subsystem Route Gateway
// Enforces Participant Authorization Boundaries, Input Validation & Sanitization

const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')
const { isUuid, isValidString } = require('../middleware/validate')

router.use(authenticate)

// POST /api/messages/conversations - Start or retrieve conversation for a marketplace listing
router.post('/conversations', async (req, res) => {
  try {
    const { listing_id } = req.body
    if (!listing_id || !isUuid(listing_id)) {
      return res.status(400).json({ message: 'Valid listing_id UUID is required' })
    }

    const listingRes = await query('SELECT id, seller_id, title, price FROM marketplace_listings WHERE id = $1', [listing_id])
    if (listingRes.rows.length === 0) {
      return res.status(404).json({ message: 'Marketplace listing not found' })
    }

    const listing = listingRes.rows[0]
    const buyerId = req.user.id
    const sellerId = listing.seller_id

    if (buyerId === sellerId) {
      return res.status(400).json({ message: 'You cannot initiate a conversation on your own listing' })
    }

    // Check existing conversation
    let convRes = await query(
      'SELECT * FROM marketplace_conversations WHERE listing_id = $1 AND buyer_id = $2',
      [listing_id, buyerId]
    )

    let conversation
    if (convRes.rows.length > 0) {
      conversation = convRes.rows[0]
    } else {
      const id = crypto.randomUUID()
      const insertRes = await query(
        `INSERT INTO marketplace_conversations (id, listing_id, buyer_id, seller_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [id, listing_id, buyerId, sellerId]
      )
      conversation = insertRes.rows[0]
    }

    res.status(201).json({ conversation, listing })
  } catch (err) {
    console.error('Error starting conversation:', err)
    res.status(500).json({ message: 'Failed to start conversation' })
  }
})

// GET /api/messages/conversations - Get all active conversations for the authenticated user
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user.id
    const result = await query(
      `SELECT 
         c.id, c.listing_id, c.buyer_id, c.seller_id, c.created_at, c.updated_at,
         l.title as listing_title, l.price as listing_price, l.is_sold,
         bu.first_name as buyer_first_name, bu.last_name as buyer_last_name,
         su.first_name as seller_first_name, su.last_name as seller_last_name,
         (SELECT content FROM marketplace_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
         (SELECT COUNT(*)::int FROM marketplace_messages m WHERE m.conversation_id = c.id AND m.sender_id != $1 AND m.is_read = false) as unread_count
       FROM marketplace_conversations c
       JOIN marketplace_listings l ON l.id = c.listing_id
       JOIN users bu ON bu.id = c.buyer_id
       JOIN users su ON su.id = c.seller_id
       WHERE c.buyer_id = $1 OR c.seller_id = $1
       ORDER BY c.updated_at DESC`,
      [userId]
    )

    res.json({ conversations: result.rows })
  } catch (err) {
    console.error('Error fetching conversations:', err)
    res.status(500).json({ message: 'Failed to fetch conversations' })
  }
})

// GET /api/messages/conversations/:id/messages - Get message history (Participant authorization required)
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params
    if (!isUuid(id)) return res.status(400).json({ message: 'Invalid conversation ID' })

    const convRes = await query('SELECT * FROM marketplace_conversations WHERE id = $1', [id])
    if (convRes.rows.length === 0) return res.status(404).json({ message: 'Conversation not found' })

    const conv = convRes.rows[0]
    if (conv.buyer_id !== req.user.id && conv.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: You are not a participant in this conversation' })
    }

    const messagesRes = await query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.is_read, m.created_at,
              u.first_name as sender_first_name, u.last_name as sender_last_name
       FROM marketplace_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [id]
    )

    res.json({ messages: messagesRes.rows, conversation: conv })
  } catch (err) {
    console.error('Error fetching messages:', err)
    res.status(500).json({ message: 'Failed to fetch messages' })
  }
})

// POST /api/messages/conversations/:id/messages - Send message via REST fallback
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params
    const { content } = req.body

    if (!isUuid(id)) return res.status(400).json({ message: 'Invalid conversation ID' })
    if (!isValidString(content, 1, 2000)) {
      return res.status(400).json({ message: 'Message content must be between 1 and 2000 characters' })
    }

    const convRes = await query('SELECT * FROM marketplace_conversations WHERE id = $1', [id])
    if (convRes.rows.length === 0) return res.status(404).json({ message: 'Conversation not found' })

    const conv = convRes.rows[0]
    if (conv.buyer_id !== req.user.id && conv.seller_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You are not a participant in this conversation' })
    }

    const msgId = crypto.randomUUID()
    const msgRes = await query(
      `INSERT INTO marketplace_messages (id, conversation_id, sender_id, content, is_read, created_at)
       VALUES ($1, $2, $3, $4, false, NOW())
       RETURNING *`,
      [msgId, id, req.user.id, content.trim()]
    )

    await query('UPDATE marketplace_conversations SET updated_at = NOW() WHERE id = $1', [id])

    res.status(201).json({ message: msgRes.rows[0] })
  } catch (err) {
    console.error('Error sending message:', err)
    res.status(500).json({ message: 'Failed to send message' })
  }
})

// PUT /api/messages/conversations/:id/read - Mark messages as read
router.put('/conversations/:id/read', async (req, res) => {
  try {
    const { id } = req.params
    if (!isUuid(id)) return res.status(400).json({ message: 'Invalid conversation ID' })

    const convRes = await query('SELECT * FROM marketplace_conversations WHERE id = $1', [id])
    if (convRes.rows.length === 0) return res.status(404).json({ message: 'Conversation not found' })

    const conv = convRes.rows[0]
    if (conv.buyer_id !== req.user.id && conv.seller_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You are not a participant in this conversation' })
    }

    await query(
      'UPDATE marketplace_messages SET is_read = true WHERE conversation_id = $1 AND sender_id != $2',
      [id, req.user.id]
    )

    res.json({ success: true, message: 'Messages marked as read' })
  } catch (err) {
    console.error('Error marking messages read:', err)
    res.status(500).json({ message: 'Failed to update read status' })
  }
})

module.exports = router
