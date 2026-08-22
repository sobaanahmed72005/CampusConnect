import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { BarChart3, Plus, Check, X, AlertTriangle, ShieldCheck, Trash2, RefreshCw, Calendar, CheckSquare, Sparkles, GraduationCap, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import LoadingGrid from '../components/ui/LoadingGrid'
import EmptyState from '../components/ui/EmptyState'

export default function Attendance() {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [subjectName, setSubjectName] = useState('')
  const [totalClasses, setTotalClasses] = useState(0)
  const [attendedClasses, setAttendedClasses] = useState(0)

  useEffect(() => { fetchAttendance() }, [])

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      const res = await api.get('/academic/attendance')
      setAttendance(res.data.attendance || [])
    } catch { setAttendance([]) } finally { setLoading(false) }
  }

  const logAttendance = async (id, action) => {
    try {
      const res = await api.put(`/academic/attendance/${id}`, { action })
      setAttendance(list => list.map(item => item.id === id ? res.data.item : item))
      toast.success(action === 'present' ? 'Logged: Present ✅' : 'Logged: Absent 🔴')
    } catch { toast.error('Failed to update attendance') }
  }

  const handleAddSubject = async (e) => {
    e.preventDefault()
    if (!subjectName.trim()) return
    try {
      const res = await api.post('/academic/attendance', {
        subject: subjectName,
        total_classes: Number(totalClasses) || 0,
        attended_classes: Number(attendedClasses) || 0
      })
      setAttendance(prev => [...prev, res.data.item])
      toast.success('New subject attendance tracker added!')
      setShowForm(false)
      setSubjectName('')
      setTotalClasses(0)
      setAttendedClasses(0)
    } catch {
      toast.error('Failed to create tracker')
    }
  }

  const deleteSubject = async (id) => {
    try {
      await api.delete(`/academic/attendance/${id}`)
      setAttendance(list => list.filter(x => x.id !== id))
      toast.success('Subject tracker deleted')
    } catch { toast.error('Failed to delete') }
  }

  // Calculate overall metrics
  const totalClassesSum = attendance.reduce((acc, curr) => acc + (curr.total_classes || 0), 0)
  const attendedClassesSum = attendance.reduce((acc, curr) => acc + (curr.attended_classes || 0), 0)
  const overallPercentage = totalClassesSum > 0 ? ((attendedClassesSum / totalClassesSum) * 100).toFixed(1) : 100
  const isEligible = parseFloat(overallPercentage) >= 75.0

  return (
    <div className="animate-fade">
      <PageHeader
        icon={BarChart3}
        title="Course Attendance 2.0"
        subtitle="Log daily class attendance and ensure minimum 75% exam eligibility compliance"
        iconColor="var(--primary)"
        action={
          <div className="flex items-center gap-2">
            <Link to="/academics" className="btn btn-outline btn-sm">
              <ArrowLeft size={14} /> Back to Academics Hub
            </Link>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Add Subject Tracker
            </button>
          </div>
        }
      />

      {/* Subsystem Navigation Tabs with Academics Hub direct link */}
      <div className="tabs mb-6">
        <Link to="/academics" className="tab">
          <GraduationCap size={15} /> Academics Hub
        </Link>
        <Link to="/timetable" className="tab">
          <Calendar size={15} /> Weekly Timetable
        </Link>
        <Link to="/assignments" className="tab">
          <CheckSquare size={15} /> Assignments & Deadlines
        </Link>
        <button className="tab active">
          <BarChart3 size={15} /> Attendance Tracker
        </button>
      </div>

      {/* Overall Attendance Summary Gauge */}
      <div className="card glass-card mb-6" style={{ background: isEligible ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.08))' : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(245,158,11,0.08))', border: '1px solid var(--border-strong)', padding: 'var(--space-6)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div
              style={{
                width: 76, height: 76, borderRadius: '50%',
                background: isEligible ? 'var(--primary-50)' : 'rgba(239,68,68,0.15)',
                color: isEligible ? 'var(--primary-light)' : 'var(--danger)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', fontWeight: 800, border: `3px solid ${isEligible ? 'var(--primary)' : 'var(--danger)'}`
              }}
            >
              {overallPercentage}%
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Overall Semester Attendance</h3>
                <span className={`badge ${isEligible ? 'badge-success' : 'badge-danger'} text-xs`}>
                  {isEligible ? 'Eligible for Exams' : 'Attendance Shortage Risk'}
                </span>
              </div>
              <p className="text-xs text-muted mt-1">
                Attended <strong>{attendedClassesSum}</strong> of <strong>{totalClassesSum}</strong> total classes across {attendance.length} enrolled subjects.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isEligible ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-primary-color" style={{ background: 'var(--primary-50)', padding: '8px 14px', borderRadius: 'var(--radius-md)' }}>
                <ShieldCheck size={16} /> Minimum 75% Criterion Met
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-danger" style={{ background: 'rgba(239,68,68,0.1)', padding: '8px 14px', borderRadius: 'var(--radius-md)' }}>
                <AlertTriangle size={16} /> Attend next classes to recover percentage
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingGrid count={4} height="160px" gridClass="grid-2" label="Loading attendance data..." />
      ) : attendance.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No subjects tracked yet"
          description="Add your enrolled courses to log daily attendance and monitor exam eligibility thresholds."
          action={
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Add First Subject
            </button>
          }
        />
      ) : (
        <div className="grid-2 gap-4">
          {attendance.map(item => {
            const total = item.total_classes || 0
            const attended = item.attended_classes || 0
            const pct = total > 0 ? ((attended / total) * 100).toFixed(1) : 100
            const isLow = parseFloat(pct) < 75.0

            return (
              <div key={item.id} className="card glass-card p-4 flex flex-col justify-between" style={{ border: `1px solid ${isLow ? 'rgba(239,68,68,0.4)' : 'var(--border-subtle)'}` }}>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-bold text-sm truncate">{item.subject}</h4>
                    <span className={`badge ${isLow ? 'badge-danger' : 'badge-primary'} text-xs font-bold`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="text-xs text-muted mb-3 flex items-center justify-between">
                    <span>{attended} attended / {total} total</span>
                    {isLow && <span className="text-danger font-semibold flex items-center gap-1"><AlertTriangle size={11} /> Below 75%</span>}
                  </div>
                  <div style={{ height: 6, width: '100%', background: 'var(--bg-surface)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }} className="mb-4">
                    <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: isLow ? 'var(--danger)' : 'var(--primary)', transition: 'width 0.3s ease' }} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex gap-2">
                    <button className="btn btn-primary btn-xs" onClick={() => logAttendance(item.id, 'present')}>
                      <Check size={13} /> Present
                    </button>
                    <button className="btn btn-outline btn-xs" onClick={() => logAttendance(item.id, 'absent')}>
                      <X size={13} /> Absent
                    </button>
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => deleteSubject(item.id)} title="Delete tracker">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Subject Modal */}
      {showForm && (
        <div className="modal-overlay animate-fade" onClick={() => setShowForm(false)}>
          <div className="modal glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: 'var(--space-6)' }}>
            <h3 className="font-bold text-base mb-4">Add Course Attendance Tracker</h3>
            <form onSubmit={handleAddSubject} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold mb-1 block">Course Name</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  placeholder="e.g. CS301 Data Structures"
                  value={subjectName}
                  onChange={e => setSubjectName(e.target.value)}
                  required
                />
              </div>
              <div className="grid-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Total Classes</label>
                  <input
                    type="number"
                    className="form-input text-xs"
                    value={totalClasses}
                    onChange={e => setTotalClasses(e.target.value)}
                    min={0}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Classes Attended</label>
                  <input
                    type="number"
                    className="form-input text-xs"
                    value={attendedClasses}
                    onChange={e => setAttendedClasses(e.target.value)}
                    min={0}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Add Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
