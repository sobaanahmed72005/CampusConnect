const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// ==========================================
// TIMETABLE ROUTES
// ==========================================

// GET /api/academic/timetable
router.get('/timetable', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM timetable WHERE user_id = $1 ORDER BY day_of_week ASC, start_time ASC',
      [req.user.id]
    )
    res.json({ timetable: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load timetable' })
  }
})

// POST /api/academic/timetable
router.post('/timetable', async (req, res) => {
  try {
    const { subject, instructor, room, day_of_week, start_time, end_time, color } = req.body
    if (!subject || day_of_week === undefined) {
      return res.status(400).json({ message: 'Subject and day of week are required' })
    }

    const result = await query(
      `INSERT INTO timetable (user_id, subject, instructor, room, day_of_week, start_time, end_time, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, subject, instructor || '', room || '', parseInt(day_of_week), start_time || '09:00', end_time || '10:00', color || '#10b981']
    )
    res.status(201).json({ item: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to add class' })
  }
})

// DELETE /api/academic/timetable/:id
router.delete('/timetable/:id', async (req, res) => {
  try {
    await query('DELETE FROM timetable WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.json({ message: 'Class slot removed' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove class' })
  }
})

// ==========================================
// ASSIGNMENT ROUTES
// ==========================================

// GET /api/academic/assignments
router.get('/assignments', async (req, res) => {
  try {
    const { status } = req.query
    let sql = 'SELECT * FROM assignments WHERE user_id = $1'
    const params = [req.user.id]

    if (status && status !== 'all') {
      sql += ' AND status = $2'
      params.push(status)
    }

    sql += ' ORDER BY due_date ASC, created_at DESC'
    const result = await query(sql, params)
    res.json({ assignments: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load assignments' })
  }
})

// POST /api/academic/assignments
router.post('/assignments', async (req, res) => {
  try {
    const { title, subject, description, due_date, priority, grade } = req.body
    if (!title || !due_date) {
      return res.status(400).json({ message: 'Title and due date are required' })
    }

    const result = await query(
      `INSERT INTO assignments (user_id, title, subject, description, due_date, status, priority, grade)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, title, subject || 'General', description || '', due_date, 'pending', priority || 'medium', grade || '']
    )
    res.status(201).json({ assignment: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to add assignment' })
  }
})

// PATCH /api/academic/assignments/:id/status
router.patch('/assignments/:id/status', async (req, res) => {
  try {
    const { status, grade } = req.body
    const result = await query(
      'UPDATE assignments SET status = $1, grade = COALESCE($2, grade) WHERE id = $3 AND user_id = $4 RETURNING *',
      [status, grade || null, req.params.id, req.user.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ message: 'Assignment not found' })
    res.json({ assignment: result.rows[0] })
  } catch (err) {
    res.status(500).json({ message: 'Failed to update assignment status' })
  }
})

// DELETE /api/academic/assignments/:id
router.delete('/assignments/:id', async (req, res) => {
  try {
    await query('DELETE FROM assignments WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.json({ message: 'Assignment deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete assignment' })
  }
})

// ==========================================
// ATTENDANCE ROUTES
// ==========================================

// GET /api/academic/attendance
router.get('/attendance', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM attendance WHERE user_id = $1 ORDER BY subject ASC',
      [req.user.id]
    )

    const items = result.rows.map(item => {
      const pct = item.total_classes > 0 ? ((item.attended_classes / item.total_classes) * 100).toFixed(1) : 100
      return { ...item, percentage: parseFloat(pct) }
    })

    res.json({ attendance: items })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load attendance' })
  }
})

// POST /api/academic/attendance
router.post('/attendance', async (req, res) => {
  try {
    const { subject, total_classes, attended_classes } = req.body
    if (!subject) return res.status(400).json({ message: 'Subject name is required' })

    const total = parseInt(total_classes) || 0
    const attended = parseInt(attended_classes) || 0

    const result = await query(
      `INSERT INTO attendance (user_id, subject, total_classes, attended_classes, last_updated)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [req.user.id, subject, total, attended]
    )
    res.status(201).json({ item: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to add attendance record' })
  }
})

// PUT /api/academic/attendance/:id
router.put('/attendance/:id', async (req, res) => {
  try {
    const { action, attended_classes, total_classes } = req.body
    let result

    if (action === 'present') {
      result = await query(
        `UPDATE attendance SET attended_classes = attended_classes + 1, total_classes = total_classes + 1, last_updated = NOW()
         WHERE id = $1 AND user_id = $2 RETURNING *`,
        [req.params.id, req.user.id]
      )
    } else if (action === 'absent') {
      result = await query(
        `UPDATE attendance SET total_classes = total_classes + 1, last_updated = NOW()
         WHERE id = $1 AND user_id = $2 RETURNING *`,
        [req.params.id, req.user.id]
      )
    } else {
      result = await query(
        `UPDATE attendance SET attended_classes = $1, total_classes = $2, last_updated = NOW()
         WHERE id = $3 AND user_id = $4 RETURNING *`,
        [parseInt(attended_classes), parseInt(total_classes), req.params.id, req.user.id]
      )
    }

    if (result.rows.length === 0) return res.status(404).json({ message: 'Record not found' })
    const updated = result.rows[0]
    const pct = updated.total_classes > 0 ? ((updated.attended_classes / updated.total_classes) * 100).toFixed(1) : 100

    res.json({ item: { ...updated, percentage: parseFloat(pct) } })
  } catch (err) {
    res.status(500).json({ message: 'Failed to update attendance' })
  }
})

// DELETE /api/academic/attendance/:id
router.delete('/attendance/:id', async (req, res) => {
  try {
    await query('DELETE FROM attendance WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.json({ message: 'Attendance record deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete attendance' })
  }
})

module.exports = router
