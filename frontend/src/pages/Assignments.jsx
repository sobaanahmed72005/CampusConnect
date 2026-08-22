import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { CheckSquare, Plus, Clock, AlertTriangle, CheckCircle2, Trash2, X, GraduationCap, Calendar, BarChart3, ArrowLeft, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import LoadingGrid from '../components/ui/LoadingGrid'
import EmptyState from '../components/ui/EmptyState'

export default function Assignments() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [course, setCourse] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')

  useEffect(() => { fetchAssignments() }, [statusFilter])

  const fetchAssignments = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/academic/assignments?status=${statusFilter}`)
      setAssignments(res.data.assignments || [])
    } catch { setAssignments([]) } finally { setLoading(false) }
  }

  const handleAddAssignment = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    try {
      const res = await api.post('/academic/assignments', {
        title,
        course_name: course,
        due_date: dueDate,
        priority
      })
      setAssignments(prev => [...prev, res.data.assignment || res.data.item])
      toast.success('Assignment deadline created!')
      setShowForm(false)
      setTitle('')
      setCourse('')
      setDueDate('')
    } catch {
      toast.error('Failed to create assignment')
    }
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
        title="Student Task & Deadline Planner"
        subtitle="Self-managed student tracker for tasks, project milestones, and upcoming deadlines"
        iconColor="var(--accent)"
        action={
          <div className="flex items-center gap-2">
            <Link to="/academics" className="btn btn-outline btn-sm">
              <ArrowLeft size={14} /> Back to Personal Planner
            </Link>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
              <Plus size={14} /> New Task
            </button>
          </div>
        }
      />

      {/* Subsystem Navigation Tabs */}
      <div className="tabs mb-6">
        <Link to="/academics" className="tab">
          <GraduationCap size={15} /> Personal Planner
        </Link>
        <Link to="/timetable" className="tab">
          <Calendar size={15} /> Weekly Timetable
        </Link>
        <button className="tab active">
          <CheckSquare size={15} /> Assignments & Deadlines
        </button>
        <Link to="/attendance" className="tab">
          <BarChart3 size={15} /> Attendance Tracker
        </Link>
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-2 mb-6">
        {['all', 'pending', 'completed'].map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`btn btn-xs ${statusFilter === st ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-full)', padding: '6px 14px', textTransform: 'capitalize' }}
          >
            {st} Tasks
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingGrid count={3} height="140px" label="Loading assignment deadlines..." />
      ) : assignments.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No assignments found"
          description="Great job! You have no pending assignments or course deadlines."
          action={
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> New Assignment
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {assignments.map(item => {
            const isDone = item.status === 'completed'
            return (
              <div key={item.id} className="card glass-card p-4 flex items-center justify-between gap-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', opacity: isDone ? 0.75 : 1 }}>
                <div className="flex items-center gap-3" style={{ flex: 1, minWidth: 0 }}>
                  <button className={`btn btn-icon btn-sm ${isDone ? 'btn-success' : 'btn-outline'}`} onClick={() => toggleStatus(item.id, item.status)}>
                    <CheckCircle2 size={16} />
                  </button>
                  <div style={{ minWidth: 0 }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-sm ${isDone ? 'line-through text-muted' : ''}`}>{item.title}</span>
                      {(item.subject || item.course_name) && <span className="badge badge-accent text-xs">{item.subject || item.course_name}</span>}
                      {item.source === 'google_classroom' && (
                        <span className="badge badge-success text-xs flex items-center gap-1">
                          <BookOpen size={10} /> Google Classroom
                        </span>
                      )}
                      {item.priority === 'high' && <span className="badge badge-danger text-xs">High Priority</span>}
                    </div>
                    {item.due_date && (
                      <div className="text-xs text-muted mt-1 flex items-center gap-1">
                        <Clock size={12} /> Due: {new Date(item.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                {item.alternate_link && (
                  <a
                    href={item.alternate_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm text-xs text-primary flex items-center gap-1"
                    title="Open in Google Classroom"
                  >
                    Open GCR
                  </a>
                )}

                <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => deleteAssignment(item.id)} title="Delete assignment">
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Assignment Modal */}
      {showForm && (
        <div className="modal-overlay animate-fade" onClick={() => setShowForm(false)}>
          <div className="modal glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: 'var(--space-6)' }}>
            <h3 className="font-bold text-base mb-4">Add Course Assignment Deadline</h3>
            <form onSubmit={handleAddAssignment} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold mb-1 block">Assignment Title</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  placeholder="e.g. Lab 4 Data Structures Report"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="grid-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Course Name</label>
                  <input
                    type="text"
                    className="form-input text-xs"
                    placeholder="e.g. CS301"
                    value={course}
                    onChange={e => setCourse(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Priority Level</label>
                  <select className="form-select text-xs" value={priority} onChange={e => setPriority(e.target.value)}>
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Due Date</label>
                <input type="date" className="form-input text-xs" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Add Deadline</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
