import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Calendar, CheckSquare, ArrowRight, Clock, Plus, CheckCircle2, Sparkles, Layers
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import api from '../lib/api'

export default function AcademicsHub() {
  const [overview, setOverview] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [timetable, setTimetable] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlannerData()
  }, [])

  const fetchPlannerData = async () => {
    setLoading(true)
    try {
      const [ovRes, assRes, ttRes] = await Promise.allSettled([
        api.get('/academic/overview'),
        api.get('/academic/assignments?status=pending'),
        api.get('/academic/timetable')
      ])

      if (ovRes.status === 'fulfilled') setOverview(ovRes.value.data)
      if (assRes.status === 'fulfilled') setAssignments(assRes.value.data?.assignments || [])
      if (ttRes.status === 'fulfilled') setTimetable(ttRes.value.data?.timetable || [])
    } catch {} finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade">
      <PageHeader
        icon={BookOpen}
        title="Student Personal Planner"
        subtitle="Self-managed student dashboard for tracking task deadlines, personal daily schedules, and study goals"
        iconColor="var(--primary)"
      />

      {/* QUICK STATS CARDS */}
      <div className="grid-3 mb-8">
        <div className="card p-5 flex items-center justify-between" style={{ background: 'var(--bg-surface)' }}>
          <div>
            <div className="text-xs text-muted font-bold uppercase">Pending Student Tasks</div>
            <div className="text-2xl font-extrabold text-primary mt-1">{assignments.length}</div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--primary)' }}>
            <CheckSquare size={24} />
          </div>
        </div>

        <div className="card p-5 flex items-center justify-between" style={{ background: 'var(--bg-surface)' }}>
          <div>
            <div className="text-xs text-muted font-bold uppercase">Personal Schedule Slots</div>
            <div className="text-2xl font-extrabold text-accent mt-1">{timetable.length}</div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}>
            <Clock size={24} />
          </div>
        </div>

        <div className="card p-5 flex items-center justify-between" style={{ background: 'var(--bg-surface)' }}>
          <div>
            <div className="text-xs text-muted font-bold uppercase">Planner Status</div>
            <div className="text-sm font-bold text-success mt-1 flex items-center gap-1">
              <CheckCircle2 size={14} /> Student Controlled
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}>
            <Sparkles size={24} />
          </div>
        </div>
      </div>

      {/* TWO-COLUMN PLANNER CONTENT */}
      <div className="grid-2 mb-8" style={{ gap: 'var(--space-6)' }}>

        {/* LEFT: UPCOMING TASK DEADLINES */}
        <div className="card p-6" style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <CheckSquare size={18} className="text-primary" /> Upcoming Task Deadlines
            </h3>
            <Link to="/assignments" className="text-xs text-primary font-bold flex items-center gap-1 hover:underline">
              Manage All <ArrowRight size={14} />
            </Link>
          </div>

          {assignments.length === 0 ? (
            <div className="text-center p-6 text-xs text-muted" style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
              No pending tasks! Click below to create a new task deadline.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {assignments.slice(0, 5).map(item => (
                <div key={item.id} className="p-3 rounded-md flex items-center justify-between" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div>
                    <div className="font-bold text-sm">{item.title}</div>
                    <div className="text-xs text-muted mt-0.5">{item.subject || 'General'} • Due: {new Date(item.due_date).toLocaleDateString()}</div>
                  </div>
                  <span className={`badge ${item.priority === 'high' ? 'badge-danger' : 'badge-primary'} text-xs`}>
                    {item.priority || 'medium'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Link to="/assignments" className="btn btn-outline btn-sm w-full mt-4 flex items-center justify-center gap-1">
            <Plus size={14} /> Add New Student Task
          </Link>
        </div>

        {/* RIGHT: PERSONAL SCHEDULE TIMETABLE */}
        <div className="card p-6" style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <Clock size={18} className="text-accent" /> Personal Schedule Summary
            </h3>
            <Link to="/timetable" className="text-xs text-accent font-bold flex items-center gap-1 hover:underline">
              My Schedule <ArrowRight size={14} />
            </Link>
          </div>

          {timetable.length === 0 ? (
            <div className="text-center p-6 text-xs text-muted" style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
              Your personal schedule planner is empty. Add class slots or study sessions!
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {timetable.slice(0, 5).map(slot => (
                <div key={slot.id} className="p-3 rounded-md flex items-center justify-between" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div>
                    <div className="font-bold text-sm">{slot.subject}</div>
                    <div className="text-xs text-muted mt-0.5">{slot.instructor ? `Instructor: ${slot.instructor}` : 'Personal Session'}</div>
                  </div>
                  <span className="badge badge-accent text-xs">
                    {slot.start_time} - {slot.end_time}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Link to="/timetable" className="btn btn-outline btn-sm w-full mt-4 flex items-center justify-center gap-1">
            <Plus size={14} /> Edit Personal Schedule
          </Link>
        </div>

      </div>
    </div>
  )
}
