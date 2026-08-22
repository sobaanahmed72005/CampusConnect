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

// GET /api/academic/calendar
router.get('/calendar', async (req, res) => {
  try {
    const calendarEvents = [
      { id: 1, title: 'Spring 2026 Semester Commencement', date: '2026-01-15', category: 'Milestone', description: 'Classes commence for all undergraduate & graduate programs.' },
      { id: 2, title: 'Course Add / Drop Deadline', date: '2026-01-29', category: 'Deadline', description: 'Last date to add or drop courses without penalty.' },
      { id: 3, title: 'Midterm Examination Week', date: '2026-03-10', category: 'Exam', description: 'Mid-semester examinations across all departments.' },
      { id: 4, title: 'Spring Semester Recess & Break', date: '2026-04-05', category: 'Holiday', description: 'University recess and spring break week.' },
      { id: 5, title: 'Final Project Submission Deadline', date: '2026-05-12', category: 'Deadline', description: 'Final capstone & lab project submissions.' },
      { id: 6, title: 'Spring 2026 Final Examinations', date: '2026-05-20', category: 'Exam', description: 'Final term examinations.' },
    ]
    res.json({ calendar: calendarEvents })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch academic calendar' })
  }
})

// GET /api/academic/overview
router.get('/overview', async (req, res) => {
  try {
    const [timetableRes, assignmentsRes, attendanceRes] = await Promise.all([
      query('SELECT * FROM timetable WHERE user_id = $1 ORDER BY day_of_week ASC, start_time ASC', [req.user.id]),
      query('SELECT * FROM assignments WHERE user_id = $1 AND status = $2 ORDER BY due_date ASC', [req.user.id, 'pending']),
      query('SELECT * FROM attendance WHERE user_id = $1 ORDER BY subject ASC', [req.user.id])
    ])

    const totalClassesSum = attendanceRes.rows.reduce((acc, curr) => acc + (curr.total_classes || 0), 0)
    const attendedClassesSum = attendanceRes.rows.reduce((acc, curr) => acc + (curr.attended_classes || 0), 0)
    const overallPct = totalClassesSum > 0 ? ((attendedClassesSum / totalClassesSum) * 100).toFixed(1) : 100

    const shortageWarnings = attendanceRes.rows.filter(item => {
      const pct = item.total_classes > 0 ? (item.attended_classes / item.total_classes) * 100 : 100
      return pct < 75.0
    })

    res.json({
      semester: {
        name: 'Spring 2026',
        current_week: 10,
        total_weeks: 16,
        progress_percentage: 62.5,
        target_gpa: '3.80',
        enrolled_credits: 17
      },
      timetable_count: timetableRes.rows.length,
      pending_assignments_count: assignmentsRes.rows.length,
      overall_attendance_pct: parseFloat(overallPct),
      attendance_warnings: shortageWarnings,
      upcoming_deadlines: assignmentsRes.rows.slice(0, 5)
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load academic overview' })
  }
})

// ==========================================
// GOOGLE CLASSROOM (GCR) INTEGRATION ROUTES
// ==========================================

const gcrSyncService = require('../services/gcrSyncService')

// GET /api/academic/gcr/auth-url
router.get('/gcr/auth-url', async (req, res) => {
  try {
    const authUrl = gcrSyncService.getOAuthUrl(req.user.id)
    res.json({ authUrl })
  } catch (err) {
    console.error('Failed to generate GCR OAuth URL:', err)
    res.status(500).json({ message: 'Failed to generate authorization URL' })
  }
})

// GET /api/academic/gcr/callback
router.get('/gcr/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query
    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://campusconnect.itnetwork.pk'}/academics?gcr_error=${encodeURIComponent(error)}`)
    }

    if (!code) {
      return res.status(400).json({ message: 'Missing authorization code' })
    }

    const userId = state || req.user?.id
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized callback state' })
    }

    const tokenData = await gcrSyncService.exchangeCodeForTokens(code)
    const googleUser = await gcrSyncService.fetchGoogleUserInfo(tokenData.access_token)

    await gcrSyncService.saveUserGoogleTokens(userId, tokenData, googleUser)

    // Trigger initial background sync
    gcrSyncService.syncUserClassroom(userId).catch(e => console.error('Initial GCR sync background error:', e))

    res.redirect(`${process.env.FRONTEND_URL || 'https://campusconnect.itnetwork.pk'}/academics?gcr=connected`)
  } catch (err) {
    console.error('GCR Callback Error:', err)
    res.redirect(`${process.env.FRONTEND_URL || 'https://campusconnect.itnetwork.pk'}/academics?gcr_error=${encodeURIComponent(err.message)}`)
  }
})

// GET /api/academic/gcr/status
router.get('/gcr/status', async (req, res) => {
  try {
    const conn = await query(
      'SELECT google_email, is_connected, last_synced_at FROM user_google_accounts WHERE user_id = $1',
      [req.user.id]
    )

    if (conn.rows.length === 0 || !conn.rows[0].is_connected) {
      return res.json({
        isConnected: false,
        googleEmail: null,
        lastSyncedAt: null
      })
    }

    res.json({
      isConnected: true,
      googleEmail: conn.rows[0].google_email,
      lastSyncedAt: conn.rows[0].last_synced_at
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to fetch Google Classroom status' })
  }
})

// POST /api/academic/gcr/sync
router.post('/gcr/sync', async (req, res) => {
  try {
    const result = await gcrSyncService.syncUserClassroom(req.user.id)
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: err.message || 'Failed to sync Google Classroom data' })
  }
})

// POST /api/academic/gcr/disconnect
router.post('/gcr/disconnect', async (req, res) => {
  try {
    await gcrSyncService.disconnectUserClassroom(req.user.id)
    res.json({ message: 'Google Classroom account disconnected successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to disconnect Google Classroom' })
  }
})

// GET /api/academic/courses
router.get('/courses', async (req, res) => {
  try {
    const gcrRes = await query(
      'SELECT * FROM gcr_courses WHERE user_id = $1 AND course_state = $2 ORDER BY name ASC',
      [req.user.id, 'ACTIVE']
    )
    res.json({ courses: gcrRes.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to load courses' })
  }
})

module.exports = router

