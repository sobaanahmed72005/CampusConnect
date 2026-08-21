import { useEffect, useState } from 'react'
import api from '../lib/api'
import { BarChart3, Plus, Check, X, AlertTriangle, ShieldCheck, Trash2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import LoadingGrid from '../components/ui/LoadingGrid'
import EmptyState from '../components/ui/EmptyState'

export default function Attendance() {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

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
        title="Course Attendance Tracker"
        subtitle="Log daily class attendance and ensure minimum 75% exam eligibility compliance"
        iconColor="var(--primary)"
        action={
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Subject Tracker
          </button>
        }
      />

      {/* Overall Attendance Summary Gauge */}
      <div className="card mb-6" style={{ background: isEligible ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.08))' : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(245,158,11,0.08))', border: '1px solid var(--border-strong)', padding: 'var(--space-6)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: isEligible ? 'var(--primary-100)' : 'rgba(239,68,68,0.15)',
                color: isEligible ? 'var(--primary-light)' : 'var(--danger)',
                display: 'flex', alignItems: 'center', justifyCenter: 'center',
                fontSize: '1.4rem', fontWeight: 800, border: `3px solid ${isEligible ? 'var(--primary)' : 'var(--danger)'}`
              }}
            >
              {overallPercentage}%
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Overall Semester Attendance</h3>
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
              <div className="flex items-center gap-2 text-xs font-semibold text-primary-color" style={{ background: 'var(--primary-100)', padding: '8px 14px', borderRadius: 'var(--radius-md)' }}>
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
        <LoadingGrid count={6} height="200px" gridClass="grid-3" />
      ) : attendance.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No subject attendance trackers added"
          description="Start tracking course attendance to ensure exam eligibility!"
          action={
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Add Subject Tracker
            </button>
          }
        />
      ) : (
        <div className="grid-3">
          {attendance.map(item => {
            const pct = item.percentage || 100
            const isSubjectEligible = pct >= 75.0
            const requiredClasses = pct < 75.0 ? Math.ceil((0.75 * item.total_classes - item.attended_classes) / 0.25) : 0

            return (
              <div key={item.id} className="card card-hover" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="flex items-center justify-between">
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }} className="truncate">{item.subject}</h4>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => deleteSubject(item.id)}
                    style={{ color: 'var(--danger)', padding: 2 }}
                    title="Remove tracker"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span style={{ fontSize: '1.6rem', fontWeight: 800, color: isSubjectEligible ? 'var(--primary)' : 'var(--danger)' }}>
                      {pct}%
                    </span>
                    <span className="text-xs text-muted" style={{ marginLeft: 6 }}>
                      ({item.attended_classes}/{item.total_classes} classes)
                    </span>
                  </div>
                  <span className={`badge ${isSubjectEligible ? 'badge-primary' : 'badge-danger'} text-xs`}>
                    {isSubjectEligible ? 'Safe' : 'Shortage'}
                  </span>
                </div>

                {/* Attendance Progress Bar */}
                <div style={{ background: 'var(--bg-surface)', height: '8px', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      height: '100%',
                      background: isSubjectEligible ? 'var(--primary)' : 'var(--danger)',
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>

                {requiredClasses > 0 && (
                  <div className="text-xs text-danger font-medium flex items-center gap-1">
                    <AlertTriangle size={12} /> Need {requiredClasses} consecutive classes to reach 75%
                  </div>
                )}

                {/* Quick Log Action Buttons */}
                <div className="flex gap-2 mt-auto pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <button
                    className="btn btn-outline btn-sm flex-1"
                    style={{ color: 'var(--primary)', borderColor: 'rgba(16,185,129,0.3)' }}
                    onClick={() => logAttendance(item.id, 'present')}
                  >
                    <Check size={14} /> + Present
                  </button>
                  <button
                    className="btn btn-outline btn-sm flex-1"
                    style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}
                    onClick={() => logAttendance(item.id, 'absent')}
                  >
                    <X size={14} /> + Absent
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && <AttendanceForm onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); fetchAttendance() }} />}
    </div>
  )
}

function AttendanceForm({ onClose, onSuccess }) {
  const [form, setForm] = useState({ subject: '', total_classes: 10, attended_classes: 9 })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.subject.trim()) return toast.error('Subject is required')
    setLoading(true)
    try {
      await api.post('/academic/attendance', form)
      toast.success('Subject attendance tracker added!')
      onSuccess()
    } catch { toast.error('Failed to add tracker') } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h3>Add Subject Tracker</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Subject / Course Title *</label>
            <input className="form-input" placeholder="e.g. Operating Systems" value={form.subject} onChange={e => set('subject', e.target.value)} required />
          </div>
          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Attended Classes</label>
              <input className="form-input" type="number" min="0" value={form.attended_classes} onChange={e => set('attended_classes', e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Total Held Classes</label>
              <input className="form-input" type="number" min="1" value={form.total_classes} onChange={e => set('total_classes', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" className="btn btn-outline flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className={`btn btn-primary flex-1 ${loading ? 'btn-loading' : ''}`} disabled={loading}>
              {loading ? <div className="spinner" /> : 'Save Tracker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
