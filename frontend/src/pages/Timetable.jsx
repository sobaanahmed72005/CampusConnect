import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Calendar as CalendarIcon, Clock, MapPin, User, Plus, Trash2, X, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import LoadingGrid from '../components/ui/LoadingGrid'
import EmptyState from '../components/ui/EmptyState'

const DAYS = [
  { id: 1, name: 'Monday', short: 'MON' },
  { id: 2, name: 'Tuesday', short: 'TUE' },
  { id: 3, name: 'Wednesday', short: 'WED' },
  { id: 4, name: 'Thursday', short: 'THU' },
  { id: 5, name: 'Friday', short: 'FRI' }
]

const COLORS = ['#10b981', '#6366f1', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444']

export default function Timetable() {
  const [timetable, setTimetable] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedDay, setSelectedDay] = useState(1) // Monday by default

  useEffect(() => { fetchTimetable() }, [])

  const fetchTimetable = async () => {
    setLoading(true)
    try {
      const res = await api.get('/academic/timetable')
      setTimetable(res.data.timetable || [])
    } catch { setTimetable([]) } finally { setLoading(false) }
  }

  const deleteSlot = async (id) => {
    try {
      await api.delete(`/academic/timetable/${id}`)
      setTimetable(t => t.filter(x => x.id !== id))
      toast.success('Class slot removed')
    } catch { toast.error('Failed to remove class') }
  }

  const getDayClasses = (dayId) => timetable.filter(t => parseInt(t.day_of_week) === dayId)

  return (
    <div className="animate-fade">
      <PageHeader
        icon={CalendarIcon}
        title="Weekly Timetable & Schedule"
        subtitle="Manage your weekly lecture schedule, room locations, and course instructors"
        iconColor="var(--primary)"
        action={
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Class Slot
          </button>
        }
      />

      {/* Day Tabs Selector */}
      <div className="tabs mb-6">
        {DAYS.map(d => {
          const count = getDayClasses(d.id).length
          return (
            <button
              key={d.id}
              className={`tab ${selectedDay === d.id ? 'active' : ''}`}
              onClick={() => setSelectedDay(d.id)}
            >
              {d.name} ({count})
            </button>
          )
        })}
      </div>

      {loading ? (
        <LoadingGrid count={4} height="180px" gridClass="grid-2" />
      ) : getDayClasses(selectedDay).length === 0 ? (
        <EmptyState
          icon={CalendarIcon}
          title={`No classes scheduled for ${DAYS.find(d => d.id === selectedDay)?.name}`}
          description="Enjoy your free time or add a new lecture slot to your schedule!"
          action={
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Add Class Slot
            </button>
          }
        />
      ) : (
        <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
          {getDayClasses(selectedDay).map(item => (
            <div
              key={item.id}
              className="card card-hover"
              style={{
                padding: 'var(--space-4)',
                borderLeft: `5px solid ${item.color || 'var(--primary)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="badge badge-muted text-xs flex items-center gap-1">
                  <Clock size={11} /> {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                </span>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => deleteSlot(item.id)}
                  style={{ color: 'var(--danger)', padding: 4 }}
                  title="Delete slot"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{item.subject}</h4>

              <div className="flex items-center gap-4 text-xs text-muted mt-1 flex-wrap">
                {item.room && (
                  <span className="flex items-center gap-1"><MapPin size={12} style={{ color: 'var(--primary)' }} /> Room: <strong>{item.room}</strong></span>
                )}
                {item.instructor && (
                  <span className="flex items-center gap-1"><User size={12} /> Instructor: <strong>{item.instructor}</strong></span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <TimetableForm onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); fetchTimetable() }} defaultDay={selectedDay} />}
    </div>
  )
}

function TimetableForm({ onClose, onSuccess, defaultDay }) {
  const [form, setForm] = useState({
    subject: '', instructor: '', room: '', day_of_week: defaultDay || 1, start_time: '09:00', end_time: '10:30', color: '#10b981'
  })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.subject.trim()) return toast.error('Subject is required')
    setLoading(true)
    try {
      await api.post('/academic/timetable', form)
      toast.success('Class slot added to schedule!')
      onSuccess()
    } catch { toast.error('Failed to add class') } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3>Add Class to Schedule</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Subject / Course Title *</label>
            <input className="form-input" placeholder="e.g. Data Structures & Algorithms" value={form.subject} onChange={e => set('subject', e.target.value)} required />
          </div>
          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Day of Week</label>
              <select className="form-input form-select" value={form.day_of_week} onChange={e => set('day_of_week', parseInt(e.target.value))}>
                {DAYS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Room / Lab</label>
              <input className="form-input" placeholder="e.g. CS-101" value={form.room} onChange={e => set('room', e.target.value)} />
            </div>
          </div>
          <div className="grid-2" style={{ gap: '12px', marginTop: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Start Time</label>
              <input className="form-input" type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">End Time</label>
              <input className="form-input" type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
            </div>
          </div>
          <div className="form-group mt-2">
            <label className="form-label">Instructor Name</label>
            <input className="form-input" placeholder="e.g. Dr. Alan Turing" value={form.instructor} onChange={e => set('instructor', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Card Accent Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '2px solid white' : 'none',
                    cursor: 'pointer', outline: form.color === c ? `2px solid ${c}` : 'none'
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" className="btn btn-outline flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className={`btn btn-primary flex-1 ${loading ? 'btn-loading' : ''}`} disabled={loading}>
              {loading ? <div className="spinner" /> : 'Save Class Slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
