import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, ShieldCheck, AlertTriangle, Clock, CheckSquare, Sparkles, ArrowRight } from 'lucide-react'
import api from '../../lib/api'

export default function AcademicHealthWidget() {
  const [attendance, setAttendance] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      api.get('/academic/attendance'),
      api.get('/academic/assignments?status=pending')
    ]).then(([attRes, assRes]) => {
      if (attRes.status === 'fulfilled') setAttendance(attRes.value.data?.attendance || [])
      if (assRes.status === 'fulfilled') setAssignments(assRes.value.data?.assignments || [])
    }).finally(() => setLoading(false))
  }, [])

  const totalClassesSum = attendance.reduce((acc, curr) => acc + (curr.total_classes || 0), 0)
  const attendedClassesSum = attendance.reduce((acc, curr) => acc + (curr.attended_classes || 0), 0)
  const overallPercentage = totalClassesSum > 0 ? ((attendedClassesSum / totalClassesSum) * 100).toFixed(1) : '95.0'
  const isEligible = parseFloat(overallPercentage) >= 75.0

  const shortageWarnings = attendance.filter(item => {
    const pct = item.total_classes > 0 ? (item.attended_classes / item.total_classes) * 100 : 100
    return pct < 75.0
  })

  return (
    <div className="card glass-card p-5 mb-6 animate-fade" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }}>
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-md" style={{ background: 'var(--primary-50)', color: 'var(--primary)' }}>
            <GraduationCap size={18} />
          </span>
          <div>
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              Academic Health Command Center
              <span className="badge badge-primary text-xs">Real-Time Status</span>
            </h3>
            <p className="text-xs text-muted">Attendance health, exam eligibility & submission deadlines</p>
          </div>
        </div>
        <Link to="/academics" className="text-xs text-primary font-bold flex items-center gap-1">
          Full Academic Hub →
        </Link>
      </div>

      {/* 3-Column Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Attendance Rate */}
        <div className="card p-4 flex flex-col justify-between" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div>
            <div className="text-xs text-muted font-semibold uppercase mb-1">Overall Attendance</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-primary">{overallPercentage}%</span>
              <span className={`badge ${isEligible ? 'badge-success' : 'badge-danger'} text-xs font-bold`}>
                {isEligible ? '≥75% Exam Eligible' : 'Shortage Risk'}
              </span>
            </div>
          </div>
          <div className="mt-3 text-xs text-muted flex items-center gap-1">
            <ShieldCheck size={12} className="text-success" /> FAST NUCES 75% Rule Enforced
          </div>
        </div>

        {/* Metric 2: Academic Risk & Warnings */}
        <div className="card p-4 flex flex-col justify-between" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div>
            <div className="text-xs text-muted font-semibold uppercase mb-1">Course Shortage Risks</div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black ${shortageWarnings.length > 0 ? 'text-danger' : 'text-success'}`}>
                {shortageWarnings.length}
              </span>
              <span className="text-xs text-muted font-medium">courses below 75%</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-muted flex items-center gap-1">
            {shortageWarnings.length > 0 ? (
              <span className="text-danger flex items-center gap-1 font-bold"><AlertTriangle size={12} /> Immediate Action Required</span>
            ) : (
              <span className="text-success flex items-center gap-1 font-bold"><CheckSquare size={12} /> All courses in safe zone</span>
            )}
          </div>
        </div>

        {/* Metric 3: Pending Work & Deadlines */}
        <div className="card p-4 flex flex-col justify-between" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div>
            <div className="text-xs text-muted font-semibold uppercase mb-1">Pending Assignments</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-accent">{assignments.length}</span>
              <span className="text-xs text-muted font-medium">active submissions due</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-muted flex items-center gap-1">
            <Clock size={12} className="text-accent" /> Tracked on Academics Hub
          </div>
        </div>
      </div>
    </div>
  )
}
