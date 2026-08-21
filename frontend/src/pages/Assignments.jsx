import { useEffect, useState } from 'react'
import api from '../lib/api'
import { CheckSquare, Plus, Clock, AlertTriangle, CheckCircle2, Trash2, X, Award, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import LoadingGrid from '../components/ui/LoadingGrid'
import EmptyState from '../components/ui/EmptyState'

const PRIORITIES = ['all', 'high', 'medium', 'low']
const STATUSES = ['all', 'pending', 'completed']

export default function Assignments() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { fetchAssignments() }, [statusFilter])

  const fetchAssignments = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/academic/assignments?status=${statusFilter}`)
      setAssignments(res.data.assignments || [])
    } catch { setAssignments([]) } finally { setLoading(false) }
  }

  const toggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    try {
      await api.patch(`/academic/assignments/${id}/status`, { status: nextStatus })
      setAssignments(a => a.map(x => x.id === id ? { ...x, status: nextStatus } : x))
      toast.success(nextStatus === 'completed' ? 'Assignment marked as completed! 🎉' : 'Status set to pending')
    } catch { toast.error('Failed to update status') }
  }

  const deleteAssignment = async (id) => {
    try {
      await api.delete(`/academic/assignments/${id}`)
      setAssignments(a => a.filter(x => x.id !== id))
      toast.success('Assignment deleted')
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="animate-fade">
      <PageHeader
        icon={CheckSquare}
        title="Assignments & Course Deadlines"
        subtitle="Track upcoming homework, lab submissions, project deadlines, and grades"
        iconColor="var(--accent)"
        action={
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Assignment
          </button>
        }
      />

      {/* Tabs Filter */}
      <div className="tabs mb-6">
        {[
          { id: 'all', name: 'All Assignments' },
          { id: 'pending', name: 'Pending' },
          { id: 'completed', name: 'Completed' }
        ].map(t => (
          <button
            key={t.id}
            className={`tab ${statusFilter === t.id ? 'active' : ''}`}
            onClick={() => setStatusFilter(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingGrid count={4} height="160px" gridClass="grid-2" />
      ) : assignments.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={`No ${statusFilter === 'all' ? '' : statusFilter} assignments found`}
          description="Keep up the great work or add a new course deadline!"
          action={
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Add Assignment
            </button>
          }
        />
      ) : (
        <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
          {assignments.map(a => {
            const isCompleted = a.status === 'completed'
            const isOverdue = !isCompleted && new Date(a.due_date) < new Date()
            return (
              <div
                key={a.id}
                className="card card-hover"
                style={{
                  padding: 'var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  opacity: isCompleted ? 0.75 : 1
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="badge badge-muted text-xs font-semibold">{a.subject}</span>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${a.priority === 'high' ? 'badge-danger' : a.priority === 'medium' ? 'badge-warning' : 'badge-primary'} text-xs`}>
                      {a.priority} priority
                    </span>
                    {a.grade && <span className="badge badge-accent text-xs flex items-center gap-1"><Award size={11} /> Grade: {a.grade}</span>}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleStatus(a.id, a.status)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2,
                      color: isCompleted ? 'var(--primary)' : 'var(--text-muted)'
                    }}
                    title={isCompleted ? 'Mark as pending' : 'Mark as completed'}
                  >
                    <CheckCircle2 size={20} style={{ fill: isCompleted ? 'var(--primary-100)' : 'transparent' }} />
                  </button>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, textDecoration: isCompleted ? 'line-through' : 'none' }}>
                      {a.title}
                    </h4>
                    {a.description && <p className="text-xs text-muted mt-1">{a.description}</p>}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <span className={`text-xs flex items-center gap-1 font-semibold ${isOverdue ? 'text-danger' : 'text-muted'}`}>
                    <Clock size={12} /> {isOverdue ? '⚠️ Overdue: ' : 'Due: '} {new Date(a.due_date).toLocaleDateString()}
                  </span>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => deleteAssignment(a.id)}
                    style={{ color: 'var(--danger)', padding: 4 }}
                    title="Delete assignment"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && <AssignmentForm onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); fetchAssignments() }} />}
    </div>
  )
}

function AssignmentForm({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: '', subject: '', description: '', due_date: new Date().toISOString().split('T')[0], priority: 'medium', grade: ''
  })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    setLoading(true)
    try {
      await api.post('/academic/assignments', form)
      toast.success('Assignment added!')
      onSuccess()
    } catch { toast.error('Failed to add assignment') } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3>Add New Assignment</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Assignment Title *</label>
            <input className="form-input" placeholder="e.g. B-Tree & Hash Index Implementation" value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>
          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Course / Subject</label>
              <input className="form-input" placeholder="e.g. Database Systems" value={form.subject} onChange={e => set('subject', e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Priority</label>
              <select className="form-input form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
          </div>
          <div className="grid-2" style={{ gap: '12px', marginTop: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Due Date *</label>
              <input className="form-input" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Grade (optional)</label>
              <input className="form-input" placeholder="e.g. A+" value={form.grade} onChange={e => set('grade', e.target.value)} />
            </div>
          </div>
          <div className="form-group mt-2">
            <label className="form-label">Instructions / Description</label>
            <textarea className="form-input" rows={2} placeholder="Add submission guidelines..." value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" className="btn btn-outline flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className={`btn btn-primary flex-1 ${loading ? 'btn-loading' : ''}`} disabled={loading}>
              {loading ? <div className="spinner" /> : 'Save Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
