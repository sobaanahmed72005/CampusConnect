const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// ==========================================
// STUDENT PERSONAL SCHEDULE (TIMETABLE) ROUTES
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
    res.status(500).json({ message: 'Failed to load schedule' })
  }
})

// POST /api/academic/timetable
router.post('/timetable', async (req, res) => {
  try {
    const { subject, instructor, room, day_of_week, start_time, end_time, color } = req.body
    if (!subject || day_of_week === undefined) {
      return res.status(400).json({ message: 'Subject/title and day of week are required' })
    }

    const result = await query(
      `INSERT INTO timetable (user_id, subject, instructor, room, day_of_week, start_time, end_time, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, subject, instructor || '', room || '', parseInt(day_of_week), start_time || '09:00', end_time || '10:00', color || '#10b981']
    )
    res.status(201).json({ item: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to add schedule item' })
  }
})

// DELETE /api/academic/timetable/:id
router.delete('/timetable/:id', async (req, res) => {
  try {
    await query('DELETE FROM timetable WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.json({ message: 'Schedule item removed' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove schedule item' })
  }
})

// ==========================================
// STUDENT PERSONAL TASKS (ASSIGNMENTS) ROUTES
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
    res.status(500).json({ message: 'Failed to load tasks' })
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
    res.status(500).json({ message: 'Failed to add task' })
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
    if (result.rows.length === 0) return res.status(404).json({ message: 'Task not found' })
    res.json({ assignment: result.rows[0] })
  } catch (err) {
    res.status(500).json({ message: 'Failed to update task status' })
  }
})

// DELETE /api/academic/assignments/:id
router.delete('/assignments/:id', async (req, res) => {
  try {
    await query('DELETE FROM assignments WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.json({ message: 'Task deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete task' })
  }
})

// ==========================================
// STUDENT PERSONAL PLANNER OVERVIEW
// ==========================================

// GET /api/academic/overview
router.get('/overview', async (req, res) => {
  try {
    const [timetableRes, assignmentsRes] = await Promise.all([
      query('SELECT * FROM timetable WHERE user_id = $1 ORDER BY day_of_week ASC, start_time ASC', [req.user.id]),
      query('SELECT * FROM assignments WHERE user_id = $1 AND status = $2 ORDER BY due_date ASC', [req.user.id, 'pending'])
    ])

    res.json({
      timetable_count: timetableRes.rows.length,
      pending_assignments_count: assignmentsRes.rows.length,
      upcoming_deadlines: assignmentsRes.rows.slice(0, 5)
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load planner overview' })
  }
})

module.exports = router
