const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// Helper: Calculate Match Confidence Score between two lost & found items
function calculateMatchScore(item1, item2) {
  let score = 0
  const reasons = []

  // 1. Category Match (35 points)
  if (item1.category && item2.category && item1.category.toLowerCase() === item2.category.toLowerCase()) {
    score += 35
    reasons.push(`Matching Category: ${item1.category}`)
  }

  // 2. Location Proximity (25 points)
  if (item1.location && item2.location) {
    const loc1 = item1.location.toLowerCase()
    const loc2 = item2.location.toLowerCase()
    if (loc1 === loc2) {
      score += 25
      reasons.push(`Exact Location Match: ${item1.location}`)
    } else if (loc1.includes(loc2) || loc2.includes(loc1)) {
      score += 18
      reasons.push(`Proximity Location Match (${item1.location})`)
    }
  }

  // 3. Date Proximity (25 points)
  if (item1.date_occurred && item2.date_occurred) {
    const d1 = new Date(item1.date_occurred)
    const d2 = new Date(item2.date_occurred)
    const diffDays = Math.abs((d1 - d2) / (1000 * 60 * 60 * 24))
    if (diffDays <= 1) {
      score += 25
      reasons.push('Occurred within 24 hours of each other')
    } else if (diffDays <= 3) {
      score += 15
      reasons.push(`Occurred within ${Math.round(diffDays)} days`)
    } else if (diffDays <= 7) {
      score += 5
      reasons.push(`Occurred within ${Math.round(diffDays)} days`)
    }
  }

  // 4. Keyword / Title Similarity (15 points)
  const stopWords = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'my', 'item', 'lost', 'found', 'with', 'and', 'or', 'for', 'of'])
  const words1 = (item1.title + ' ' + (item1.description || '')).toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w))
  const words2 = new Set((item2.title + ' ' + (item2.description || '')).toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w)))

  const matchingWords = words1.filter(w => words2.has(w))
  if (matchingWords.length > 0) {
    score += Math.min(15, matchingWords.length * 5)
    reasons.push(`Matching keywords: ${Array.from(new Set(matchingWords)).slice(0, 3).join(', ')}`)
  }

  return { score: Math.min(100, score), reasons }
}

// GET /api/lost-found
router.get('/', async (req, res) => {
  try {
    const { q, type, category } = req.query
    let sql = `
      SELECT r.*,
        u.first_name || ' ' || u.last_name as reporter_name,
        u.email as reporter_email,
        u.phone as reporter_phone
      FROM lost_found_reports r
      JOIN users u ON u.id = r.user_id
      WHERE 1=1
    `
    const params = []
    let idx = 1
    if (q) { sql += ` AND (r.title ILIKE $${idx} OR r.description ILIKE $${idx} OR r.location ILIKE $${idx})`; params.push(`%${q}%`); idx++ }
    if (type && type !== 'all') { sql += ` AND r.type = $${idx}`; params.push(type); idx++ }
    if (category && category !== 'All') { sql += ` AND r.category = $${idx}`; params.push(category); idx++ }
    sql += ` ORDER BY r.created_at DESC`
    const result = await query(sql, params)
    res.json({ items: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load reports' })
  }
})

// GET /api/lost-found/:id/matches (Automated Match Detection Engine)
router.get('/:id/matches', async (req, res) => {
  try {
    const targetRes = await query('SELECT * FROM lost_found_reports WHERE id = $1', [req.params.id])
    if (targetRes.rows.length === 0) return res.status(404).json({ message: 'Target report not found' })

    const target = targetRes.rows[0]
    const oppositeType = target.type === 'lost' ? 'found' : 'lost'

    // Fetch candidate reports of opposite type
    const candidatesRes = await query(`
      SELECT r.*,
        u.first_name || ' ' || u.last_name as reporter_name,
        u.email as reporter_email,
        u.phone as reporter_phone
      FROM lost_found_reports r
      JOIN users u ON u.id = r.user_id
      WHERE r.type = $1 AND r.is_resolved = false AND r.id != $2
    `, [oppositeType, target.id])

    // Calculate match scores
    const matches = candidatesRes.rows
      .map(candidate => {
        const { score, reasons } = calculateMatchScore(target, candidate)
        return {
          candidate,
          matchScore: score,
          reasons,
          confidence: score >= 70 ? 'High' : score >= 45 ? 'Medium' : 'Low'
        }
      })
      .filter(m => m.matchScore >= 40) // Only surface candidates with at least 40% match confidence
      .sort((a, b) => b.matchScore - a.matchScore)

    res.json({ targetItem: target, matches })
  } catch (err) {
    console.error('Match engine error:', err)
    res.status(500).json({ message: 'Failed to calculate matches' })
  }
})

// GET /api/lost-found/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT r.*, u.first_name || ' ' || u.last_name as reporter_name, u.email as reporter_email
      FROM lost_found_reports r
      JOIN users u ON u.id = r.user_id
      WHERE r.id = $1
    `, [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' })
    res.json({ item: result.rows[0] })
  } catch (err) {
    res.status(500).json({ message: 'Failed' })
  }
})

// POST /api/lost-found
router.post('/', async (req, res) => {
  try {
    const { title, description, category, location, date_lost_found, contact_info, type } = req.body
    if (!title || !type) return res.status(400).json({ message: 'Title and type are required' })

    const result = await query(
      `INSERT INTO lost_found_reports (title, description, category, location, date_occurred, contact_info, type, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, description, category, location, date_lost_found || new Date(), contact_info, type, req.user.id]
    )

    const item = result.rows[0]

    // Automated High-Confidence Match Check & Notification Trigger
    try {
      const oppositeType = type === 'lost' ? 'found' : 'lost'
      const candidates = await query('SELECT * FROM lost_found_reports WHERE type=$1 AND is_resolved=false', [oppositeType])
      for (const cand of candidates.rows) {
        const { score } = calculateMatchScore(item, cand)
        if (score >= 70) {
          // Notify newly created item reporter
          await query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)',
            [req.user.id, 'Potential Match Detected! 🔍', `High confidence match (${score}%) found for "${title}": "${cand.title}" at ${cand.location}`, 'lost_found']
          )
          // Notify existing candidate reporter
          await query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)',
            [cand.user_id, 'Potential Match Detected! 🔍', `High confidence match (${score}%) found for "${cand.title}": "${title}" at ${location}`, 'lost_found']
          )
          break
        }
      }
    } catch (e) {}

    // Confirmation notification
    try {
      await query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)',
        [
          req.user.id,
          `${type === 'lost' ? '🔴 Lost Item Report Filed' : '🟢 Found Item Reported'}`,
          `Your report for "${title}" has been published to the campus board.`,
          'lost_found'
        ]
      )
    } catch (e) {}

    res.status(201).json({ item })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to create report' })
  }
})

// PATCH /api/lost-found/:id/resolve
router.patch('/:id/resolve', async (req, res) => {
  try {
    const result = await query(
      `UPDATE lost_found_reports SET is_resolved=true, updated_at=NOW() WHERE id=$1 AND user_id=$2 RETURNING *`,
      [req.params.id, req.user.id]
    )
    if (result.rows.length === 0) return res.status(403).json({ message: 'Not authorized or not found' })

    const item = result.rows[0]

    try {
      await query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)',
        [req.user.id, 'Lost & Found Resolved ✅', `Your report for "${item.title}" was marked as resolved!`, 'lost_found']
      )
    } catch (e) {}

    res.json({ item })
  } catch (err) {
    res.status(500).json({ message: 'Failed' })
  }
})

// DELETE /api/lost-found/:id
router.delete('/:id', async (req, res) => {
  try {
    const check = await query('SELECT id FROM lost_found_reports WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id])
    if (check.rows.length === 0) return res.status(403).json({ message: 'Not authorized' })
    await query('DELETE FROM lost_found_reports WHERE id=$1', [req.params.id])
    res.json({ message: 'Report deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Failed' })
  }
})

module.exports = router
