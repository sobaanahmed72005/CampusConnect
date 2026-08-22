import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { Calendar as CalendarIcon, Clock, MapPin, User, Plus, Trash2, X, Sparkles, GraduationCap, CheckSquare, BarChart3, ArrowLeft } from 'lucide-react'
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
  const [courseName, setCourseName] = useState('')
  const [room, setRoom] = useState('')
  const [instructor, setInstructor] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:30')
  const [dayOfWeek, setDayOfWeek] = useState(1)

  useEffect(() => { fetchTimetable() }, [])

  const fetchTimetable = async () => {
    setLoading(true)
    try {
      const res = await api.get('/academic/timetable')
      setTimetable(res.data.timetable || [])
    } catch { setTimetable([]) } finally { setLoading(false) }
  }

  const handleAddSlot = async (e) => {
    e.preventDefault()
    if (!courseName.trim()) return
    try {
      const res = await api.post('/academic/timetable', {
        course_name: courseName,
        room_number: room,
        instructor_name: instructor,
        start_time: startTime,
        end_time: endTime,
        day_of_week: Number(dayOfWeek)
      })
      setTimetable(prev => [...prev, res.data.slot || res.data.item])
      toast.success('Class slot added to schedule!')
      setShowForm(false)
      setCourseName('')
      setRoom('')
      setInstructor('')
    } catch {
      toast.error('Failed to add class slot')
    }
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
        title="Personal Schedule Planner"
        subtitle="Manage your weekly lecture schedule, room locations, study sessions, and daily slots"
        iconColor="var(--primary)"
        action={
          <div className="flex items-center gap-2">
            <Link to="/academics" className="btn btn-outline btn-sm">
              <ArrowLeft size={14} /> Back to Personal Planner
            </Link>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Add Schedule Slot
            </button>
          </div>
        }
      />

      {/* Subsystem Navigation Tabs */}
      <div className="tabs mb-6">
        <Link to="/academics" className="tab">
          <GraduationCap size={15} /> Personal Planner
        </Link>
        <button className="tab active">
          <CalendarIcon size={15} /> My Schedule
        </button>
        <Link to="/assignments" className="tab">
          <CheckSquare size={15} /> Task Deadlines
        </Link>
      </div>

      {/* Day Tabs Selector */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {DAYS.map(day => {
          const count = getDayClasses(day.id).length
          return (
            <button
              key={day.id}
              onClick={() => setSelectedDay(day.id)}
              className={`btn ${selectedDay === day.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 'var(--radius-full)', padding: '8px 18px', fontSize: '0.85rem' }}
            >
              {day.name}
              {count > 0 && <span className="badge badge-accent text-xs ml-1.5">{count}</span>}
            </button>
          )
        })}
      </div>

      {loading ? (
        <LoadingGrid count={3} height="140px" label="Loading class schedule..." />
      ) : getDayClasses(selectedDay).length === 0 ? (
        <EmptyState
          icon={CalendarIcon}
          title={`No classes scheduled for ${DAYS.find(d => d.id === selectedDay)?.name}`}
          description="Enjoy your free time or add a new lecture slot to your timetable!"
          action={
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Add Class Slot
            </button>
          }
        />
      ) : (
        <div className="grid-2 gap-4">
          {getDayClasses(selectedDay).map((slot, index) => {
            const color = COLORS[index % COLORS.length]
            return (
              <div key={slot.id} className="card glass-card p-4 flex flex-col justify-between" style={{ borderLeft: `4px solid ${color}`, background: 'var(--bg-surface)' }}>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-bold text-base truncate">{slot.course_name}</h4>
                    <span className="badge badge-primary text-xs flex items-center gap-1 font-semibold">
                      <Clock size={12} /> {slot.start_time} - {slot.end_time}
                    </span>
                  </div>
                  <div className="text-xs text-muted flex items-center gap-4 mt-2 flex-wrap">
                    {slot.room_number && (
                      <span className="flex items-center gap-1"><MapPin size={13} className="text-primary" /> Room: {slot.room_number}</span>
                    )}
                    {slot.instructor_name && (
                      <span className="flex items-center gap-1"><User size={13} className="text-accent" /> Instructor: {slot.instructor_name}</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t mt-4" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => deleteSlot(slot.id)} title="Remove class slot">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Slot Modal */}
      {showForm && (
        <div className="modal-overlay animate-fade" onClick={() => setShowForm(false)}>
          <div className="modal glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: 'var(--space-6)' }}>
            <h3 className="font-bold text-base mb-4">Add Timetable Class Slot</h3>
            <form onSubmit={handleAddSlot} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold mb-1 block">Course Name</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  placeholder="e.g. CS402 Operating Systems"
                  value={courseName}
                  onChange={e => setCourseName(e.target.value)}
                  required
                />
              </div>
              <div className="grid-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Day of Week</label>
                  <select className="form-select text-xs" value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))}>
                    {DAYS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Room Number</label>
                  <input
                    type="text"
                    className="form-input text-xs"
                    placeholder="e.g. CS-Lab 3"
                    value={room}
                    onChange={e => setRoom(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Start Time</label>
                  <input type="time" className="form-input text-xs" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">End Time</label>
                  <input type="time" className="form-input text-xs" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Instructor Name</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  placeholder="e.g. Dr. Ahmed Khan"
                  value={instructor}
                  onChange={e => setInstructor(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Add Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
