import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  GraduationCap, Calendar, CheckSquare, BarChart3, ArrowRight,
  ShieldCheck, Clock, Award, BookOpen, AlertTriangle, Sparkles,
  Layers, CheckCircle2, Bookmark, Info, Flag
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import api from '../lib/api'

export default function AcademicsHub() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [assignments, setAssignments] = useState([])
  const [calendar, setCalendar] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAcademicData()
  }, [])

  const fetchAcademicData = async () => {
    setLoading(true)
    try {
      const [ovRes, attRes, assRes, calRes] = await Promise.allSettled([
        api.get('/academic/overview'),
        api.get('/academic/attendance'),
        api.get('/academic/assignments?status=pending'),
        api.get('/academic/calendar')
      ])

      if (ovRes.status === 'fulfilled') setOverview(ovRes.value.data)
      if (attRes.status === 'fulfilled') setAttendance(attRes.value.data?.attendance || [])
      if (assRes.status === 'fulfilled') setAssignments(assRes.value.data?.assignments || [])
      if (calRes.status === 'fulfilled') setCalendar(calRes.value.data?.calendar || [])
    } catch {} finally {
      setLoading(false)
    }
  }

  // Attendance metrics & warnings calculation
  const totalClassesSum = attendance.reduce((acc, curr) => acc + (curr.total_classes || 0), 0)
  const attendedClassesSum = attendance.reduce((acc, curr) => acc + (curr.attended_classes || 0), 0)
  const overallPercentage = totalClassesSum > 0 ? ((attendedClassesSum / totalClassesSum) * 100).toFixed(1) : '95.0'
  const isEligible = parseFloat(overallPercentage) >= 75.0

  const shortageWarnings = attendance.filter(item => {
    const pct = item.total_classes > 0 ? (item.attended_classes / item.total_classes) * 100 : 100
    return pct < 75.0
  })

  // Sample course catalog if attendance list is empty
  const defaultCourses = [
    { code: 'CS301', name: 'Data Structures & Algorithms', credits: 4, instructor: 'Dr. Sarah Ahmed', dept: 'Computer Science' },
    { code: 'CS402', name: 'Operating System Architecture', credits: 3, instructor: 'Prof. Tariq Hassan', dept: 'Computer Science' },
    { code: 'SE310', name: 'Software Engineering & Agile', credits: 3, instructor: 'Dr. Bilal Raza', dept: 'Software Engineering' },
    { code: 'EE205', name: 'Digital Logic & Circuit Design', credits: 4, instructor: 'Engr. Nadia Ali', dept: 'Electrical Engineering' },
    { code: 'MT201', name: 'Linear Algebra & Calculus', credits: 3, instructor: 'Dr. Usman Malik', dept: 'Mathematics' },
  ]

  const enrolledCourses = attendance.length > 0
    ? attendance.map(a => ({ code: a.subject.slice(0, 5), name: a.subject, credits: 3, instructor: 'Enrolled Faculty', dept: 'Department' }))
    : defaultCourses

  return (
    <div className="animate-fade">
      <PageHeader
        icon={GraduationCap}
        title="Student Academics Center 2.0"
        subtitle="Comprehensive 9-in-1 portal for semester progress, course catalog, deadlines, attendance warnings, and academic calendar"
        iconColor="var(--primary)"
      />

      {/* 1. SEMESTER OVERVIEW BANNER */}
      <div className="card glass-card p-6 mb-8" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.08))', border: '1px solid var(--border-strong)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge badge-primary text-xs font-bold uppercase">Spring 2026 Semester</span>
              <span className="text-xs font-semibold text-muted">Week 10 of 16 (62.5% Complete)</span>
            </div>
            <h3 className="font-extrabold text-xl mt-1">Semester Performance & Progress</h3>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-right">
              <div className="text-xs text-muted font-bold uppercase">Target GPA</div>
              <div className="text-lg font-extrabold text-primary">3.80 / 4.00</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted font-bold uppercase">Enrolled Load</div>
              <div className="text-lg font-extrabold text-accent">17 Credit Hours</div>
            </div>
          </div>
        </div>

        {/* Semester Timeline Progress Bar */}
        <div style={{ height: 8, width: '100%', background: 'var(--bg-surface)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <div style={{ width: '62.5%', height: '100%', background: 'linear-gradient(90deg, #6366f1, #10b981)', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* 2. ATTENDANCE WARNINGS ALERT WIDGET */}
      {shortageWarnings.length > 0 ? (
        <div className="card glass-card p-5 mb-8" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={22} className="text-danger flex-shrink-0 mt-0.5" />
            <div style={{ flex: 1 }}>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-base text-danger">Attendance Shortage Warning Active</h4>
                <span className="badge badge-danger text-xs">{shortageWarnings.length} Subject(s) Below 75%</span>
              </div>
              <p className="text-xs text-secondary mt-1">
                You currently have course attendance below the mandatory 75% exam eligibility threshold. Attend your next consecutive lectures to clear eligibility warnings!
              </p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {shortageWarnings.map(w => {
                  const pct = w.total_classes > 0 ? ((w.attended_classes / w.total_classes) * 100).toFixed(1) : 100
                  const needed = Math.max(1, Math.ceil((0.75 * w.total_classes - w.attended_classes) / 0.25))
                  return (
                    <div key={w.id} className="card p-2 px-3 flex items-center gap-2 text-xs" style={{ background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <span className="font-bold">{w.subject}:</span>
                      <span className="text-danger font-extrabold">{pct}%</span>
                      <span className="text-muted">(Attend next {needed} classes)</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card glass-card p-4 mb-8 flex items-center justify-between" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <ShieldCheck size={18} /> Attendance Eligibility Safe: All enrolled courses satisfy minimum 75% attendance criteria.
          </div>
          <Link to="/attendance" className="btn btn-primary btn-xs">View Log</Link>
        </div>
      )}

      {/* 3, 4, 5. PRIMARY ACADEMIC MODULE GATEWAY CARDS */}
      <h3 className="font-extrabold text-lg mb-4 flex items-center gap-2">
        <Sparkles size={18} className="text-primary" /> Academic Subsystem Gateway
      </h3>

      <div className="grid-3 gap-6 mb-10">
        {/* Timetable */}
        <div
          onClick={() => navigate('/timetable')}
          className="card glass-card p-6 flex flex-col justify-between hover-lift cursor-pointer"
          style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--primary-100)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={24} />
              </div>
              <span className="badge badge-primary text-xs font-bold">1. Timetable</span>
            </div>
            <h4 className="font-extrabold text-base mb-2">Weekly Class Schedule</h4>
            <p className="text-xs text-secondary mb-4" style={{ lineHeight: 1.6 }}>
              View lecture timings, instructor names, classroom locations, and weekly day-by-day schedules.
            </p>
          </div>
          <div className="flex items-center text-primary font-bold text-xs gap-1.5 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            Open Timetable <ArrowRight size={14} />
          </div>
        </div>

        {/* Assignments */}
        <div
          onClick={() => navigate('/assignments')}
          className="card glass-card p-6 flex flex-col justify-between hover-lift cursor-pointer"
          style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--accent-50)', color: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckSquare size={24} />
              </div>
              <span className="badge badge-accent text-xs font-bold">2. Assignments</span>
            </div>
            <h4 className="font-extrabold text-base mb-2">Assignments & Tasks</h4>
            <p className="text-xs text-secondary mb-4" style={{ lineHeight: 1.6 }}>
              Track homework submissions, lab project deadlines, task priorities, and completion status.
            </p>
          </div>
          <div className="flex items-center text-accent font-bold text-xs gap-1.5 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            Open Assignments <ArrowRight size={14} />
          </div>
        </div>

        {/* Attendance */}
        <div
          onClick={() => navigate('/attendance')}
          className="card glass-card p-6 flex flex-col justify-between hover-lift cursor-pointer"
          style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,0.15)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={24} />
              </div>
              <span className="badge badge-success text-xs font-bold">3. Attendance</span>
            </div>
            <h4 className="font-extrabold text-base mb-2">Course Attendance Tracker</h4>
            <p className="text-xs text-secondary mb-4" style={{ lineHeight: 1.6 }}>
              Log daily class attendance, calculate subject percentages, and monitor exam eligibility.
            </p>
          </div>
          <div className="flex items-center text-primary font-bold text-xs gap-1.5 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            Open Attendance <ArrowRight size={14} />
          </div>
        </div>
      </div>

      <div className="grid-2 gap-8 mb-10">
        {/* 6. ENROLLED COURSES DIRECTORY */}
        <div>
          <h3 className="font-extrabold text-base mb-4 flex items-center gap-2">
            <BookOpen size={18} className="text-primary" /> 4. Enrolled Courses Directory
          </h3>
          <div className="flex flex-col gap-3">
            {enrolledCourses.map((c, i) => (
              <div key={i} className="card glass-card p-3.5 flex items-center justify-between gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-3 truncate">
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--primary-100)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>
                    {c.code}
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-sm truncate">{c.name}</div>
                    <div className="text-xs text-muted truncate">{c.instructor} • {c.credits} Credit Hours</div>
                  </div>
                </div>
                <span className="badge badge-neutral text-xs flex-shrink-0">{c.credits} Cr</span>
              </div>
            ))}
          </div>
        </div>

        {/* 7. URGENT DEADLINES RADAR */}
        <div>
          <h3 className="font-extrabold text-base mb-4 flex items-center gap-2">
            <Clock size={18} className="text-accent" /> 5. Urgent Course Deadlines
          </h3>
          {assignments.length === 0 ? (
            <div className="card glass-card p-6 text-center text-xs text-muted" style={{ background: 'var(--bg-surface)' }}>
              No pending assignment deadlines for this week! 🎉
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {assignments.slice(0, 5).map(item => (
                <div key={item.id} className="card glass-card p-3.5 flex items-center justify-between gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div className="font-bold text-sm">{item.title}</div>
                    <div className="text-xs text-muted mt-0.5 flex items-center gap-2">
                      <span>Course: {item.course_name || 'General'}</span>
                      <span>•</span>
                      <span className="text-accent font-semibold">Due: {new Date(item.due_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className={`badge ${item.priority === 'high' ? 'badge-danger' : 'badge-accent'} text-xs uppercase`}>
                    {item.priority || 'Medium'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid-2 gap-8 mb-6">
        {/* 8. ACADEMIC CALENDAR */}
        <div>
          <h3 className="font-extrabold text-base mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-warning" /> 6. University Academic Calendar
          </h3>
          <div className="flex flex-col gap-3">
            {calendar.map(ev => (
              <div key={ev.id} className="card glass-card p-3.5 flex items-center justify-between gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <div className="font-bold text-sm">{ev.title}</div>
                  <div className="text-xs text-muted mt-0.5">{ev.description}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="badge badge-warning text-xs mb-1 block">{ev.category}</span>
                  <div className="text-xs font-bold text-primary">{ev.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 9. UPCOMING WORK FEED */}
        <div>
          <h3 className="font-extrabold text-base mb-4 flex items-center gap-2">
            <Layers size={18} className="text-primary" /> 7. Upcoming Academic Activity Feed
          </h3>
          <div className="flex flex-col gap-3">
            <div className="card glass-card p-3.5 flex items-center gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
              <div>
                <div className="font-bold text-xs">CS301 Data Structures Midterm Quiz</div>
                <div className="text-xs text-muted">Tomorrow at 10:00 AM • Room CS-Lab 2</div>
              </div>
            </div>
            <div className="card glass-card p-3.5 flex items-center gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <Clock size={18} className="text-accent flex-shrink-0" />
              <div>
                <div className="font-bold text-xs">SE310 Software Architecture Proposal</div>
                <div className="text-xs text-muted">Friday at 11:59 PM • Online Portal</div>
              </div>
            </div>
            <div className="card glass-card p-3.5 flex items-center gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <BookOpen size={18} className="text-warning flex-shrink-0" />
              <div>
                <div className="font-bold text-xs">EE205 Lab Report #5 Submission</div>
                <div className="text-xs text-muted">Next Monday at 09:00 AM • EE Department Office</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
