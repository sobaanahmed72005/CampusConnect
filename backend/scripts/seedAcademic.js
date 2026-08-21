require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../config/database');

async function seedAcademic() {
  const c = await pool.connect();
  try {
    console.log('🌱 Seeding academic demo data...');
    const userRes = await c.query("SELECT id FROM users WHERE email='student@campus.edu'");
    if (userRes.rows.length === 0) {
      console.log('User student@campus.edu not found, skipping academic seed.');
      return;
    }
    const uid = userRes.rows[0].id;

    // 1. Seed Timetable (Mon-Fri)
    await c.query('DELETE FROM timetable WHERE user_id = $1', [uid]);
    const classes = [
      { subject: 'Data Structures & Algorithms', instructor: 'Dr. Alan Turing', room: 'CS-101', day: 1, start: '09:00', end: '10:30', color: '#10b981' },
      { subject: 'Database Management Systems', instructor: 'Prof. Edgar Codd', room: 'CS-204', day: 1, start: '11:00', end: '12:30', color: '#6366f1' },
      { subject: 'Software Engineering', instructor: 'Dr. Margaret Hamilton', room: 'CS-302', day: 2, start: '10:00', end: '11:30', color: '#3b82f6' },
      { subject: 'Computer Networks', instructor: 'Prof. Vint Cerf', room: 'CS-108', day: 2, start: '14:00', end: '15:30', color: '#f59e0b' },
      { subject: 'Operating Systems', instructor: 'Dr. Linus Torvalds', room: 'CS-201', day: 3, start: '09:00', end: '10:30', color: '#ec4899' },
      { subject: 'Artificial Intelligence', instructor: 'Prof. Geoffrey Hinton', room: 'CS-401', day: 3, start: '11:00', end: '12:30', color: '#8b5cf6' },
      { subject: 'Web Technologies', instructor: 'Dr. Tim Berners-Lee', room: 'Lab-3', day: 4, start: '10:00', end: '12:00', color: '#14b8a6' },
      { subject: 'Cyber Security Basics', instructor: 'Prof. Bruce Schneier', room: 'CS-105', day: 5, start: '09:30', end: '11:00', color: '#ef4444' },
    ];

    for (const item of classes) {
      await c.query(
        `INSERT INTO timetable (user_id, subject, instructor, room, day_of_week, start_time, end_time, color)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [uid, item.subject, item.instructor, item.room, item.day, item.start, item.end, item.color]
      );
    }
    console.log('✅ Timetable seeded (8 class slots).');

    // 2. Seed Assignments
    await c.query('DELETE FROM assignments WHERE user_id = $1', [uid]);
    const assignments = [
      { title: 'B-Tree & Hash Index Implementation', subject: 'Database Systems', desc: 'Implement B+ Tree insertion and node splitting algorithm', due: '2026-08-28', priority: 'high', status: 'pending', grade: '' },
      { title: 'Process Scheduler Simulation', subject: 'Operating Systems', desc: 'Simulate Round-Robin and SJF CPU scheduling algorithms', due: '2026-09-02', priority: 'medium', status: 'pending', grade: '' },
      { title: 'REST API Authentication System', subject: 'Web Technologies', desc: 'Build JWT + HttpOnly cookie authentication workflow', due: '2026-08-22', priority: 'high', status: 'completed', grade: 'A+' },
      { title: 'Dijkstra Shortest Path Lab', subject: 'Data Structures', desc: 'Submit graph adjacency list traversal report', due: '2026-09-05', priority: 'low', status: 'pending', grade: '' },
    ];

    for (const a of assignments) {
      await c.query(
        `INSERT INTO assignments (user_id, title, subject, description, due_date, priority, status, grade)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [uid, a.title, a.subject, a.desc, a.due, a.priority, a.status, a.grade]
      );
    }
    console.log('✅ Assignments seeded (4 assignments).');

    // 3. Seed Attendance Tracker
    await c.query('DELETE FROM attendance WHERE user_id = $1', [uid]);
    const attendanceRecords = [
      { subject: 'Data Structures & Algorithms', total: 24, attended: 22 },
      { subject: 'Database Management Systems', total: 20, attended: 18 },
      { subject: 'Software Engineering', total: 18, attended: 17 },
      { subject: 'Computer Networks', total: 22, attended: 19 },
      { subject: 'Operating Systems', total: 25, attended: 21 },
      { subject: 'Artificial Intelligence', total: 16, attended: 15 },
    ];

    for (const att of attendanceRecords) {
      await c.query(
        `INSERT INTO attendance (user_id, subject, total_classes, attended_classes, last_updated)
         VALUES ($1,$2,$3,$4,NOW())`,
        [uid, att.subject, att.total, att.attended]
      );
    }
    console.log('✅ Attendance seeded (6 subject records).');

  } catch (err) {
    console.error('❌ Academic seed error:', err.message);
  } finally {
    c.release();
    pool.end();
  }
}

seedAcademic();
