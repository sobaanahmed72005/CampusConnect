import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import {
  Calendar, MapPin, Clock, Users, Star, Bell, ShieldCheck, Sparkles,
  Search, Award, Layers, CheckCircle2, Megaphone, UserPlus, Heart
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import LoadingGrid from '../components/ui/LoadingGrid'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import './Events.css'

const CATEGORIES = ['All', 'Tech', 'Sports', 'Cultural', 'Workshops', 'Seminars', 'Competitions', 'Career & Placement', 'Campus Activities', 'Clubs & Societies']

const CLUBS = [
  { id: 1, name: 'ACM Student Chapter', category: 'Tech & Coding', members: 420, lead: 'Hamza Malik', desc: 'Annual Hackathons, Competitive Programming, AI Workshops' },
  { id: 2, name: 'IEEE Society', category: 'Engineering & Robotics', members: 310, lead: 'Zainab Fatima', desc: 'Robotics Competitions, IoT Labs, Tech Seminars' },
  { id: 3, name: 'Campus Sports Club', category: 'Sports & Fitness', members: 580, lead: 'Usman Ali', desc: 'Futsal League, Cricket Tournaments, Table Tennis Masters' },
  { id: 4, name: 'Debating Society', category: 'Public Speaking', members: 210, lead: 'Ayesha Khan', desc: 'Model UN, Parliamentary Debates, Declamation Contests' },
  { id: 5, name: 'Music & Performing Arts', category: 'Cultural', members: 340, lead: 'Bilal Ahmed', desc: 'Acoustic Nights, Battle of the Bands, Drama Festivals' }
]

export default function Events() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [activeTab, setActiveTab] = useState('events') // 'events' | 'clubs'
  const [registering, setRegistering] = useState(null)
  const [reminders, setReminders] = useState(new Set())
  const [joinedClubs, setJoinedClubs] = useState(new Set())

  useEffect(() => {
    fetchEvents()
    loadReminders()
  }, [search, category])

  const fetchEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (category !== 'All' && category !== 'Clubs & Societies') params.set('category', category)
      const res = await api.get(`/events?${params}`)
      setEvents(res.data.events || [])
    } catch (err) {
      setError(err.response?.data?.message || "We couldn't load campus events. Try again.")
      setEvents([])
    } finally { setLoading(false) }
  }

  const loadReminders = () => {
    try {
      const saved = localStorage.getItem('cc_event_reminders')
      if (saved) setReminders(new Set(JSON.parse(saved)))
      const savedClubs = localStorage.getItem('cc_joined_clubs')
      if (savedClubs) setJoinedClubs(new Set(JSON.parse(savedClubs)))
    } catch {}
  }

  const toggleReminder = (eventId, e) => {
    e.stopPropagation()
    const next = new Set(reminders)
    if (next.has(eventId)) {
      next.delete(eventId)
      toast.success('Reminder removed')
    } else {
      next.add(eventId)
      toast.success('Event reminder saved to your schedule! 🔔')
    }
    setReminders(next)
    localStorage.setItem('cc_event_reminders', JSON.stringify([...next]))
  }

  const toggleClubJoin = (clubId) => {
    const next = new Set(joinedClubs)
    if (next.has(clubId)) {
      next.delete(clubId)
      toast.success('Left society membership')
    } else {
      next.add(clubId)
      toast.success('Welcome to the society! 🎉')
    }
    setJoinedClubs(next)
    localStorage.setItem('cc_joined_clubs', JSON.stringify([...next]))
  }

  const handleRegister = async (eventId, isRegistered) => {
    setRegistering(eventId)
    try {
      if (isRegistered) {
        await api.delete(`/events/${eventId}/register`)
        toast.success('RSVP cancelled')
      } else {
        await api.post(`/events/${eventId}/register`)
        toast.success('RSVP Confirmed: Going! 🎉')
      }
      fetchEvents()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed')
    } finally { setRegistering(null) }
  }

  return (
    <div className="animate-fade">
      <PageHeader
        icon={Calendar}
        title="Events & Campus Life 2.0"
        subtitle="Discover campus events, RSVP to society activities, and join student clubs"
        iconColor="var(--primary)"
      />

      {/* Campus Community Sub-Tabs */}
      <div className="tabs mb-6">
        <button className={`tab ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
          <Calendar size={15} /> Upcoming Events
        </button>
        <button className={`tab ${activeTab === 'clubs' ? 'active' : ''}`} onClick={() => setActiveTab('clubs')}>
          <Users size={15} /> Clubs & Societies Directory
        </button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <Award size={15} /> Past Event History
        </button>
      </div>

      {activeTab === 'clubs' ? (
        /* CLUBS & SOCIETIES DIRECTORY VIEW */
        <div className="animate-fade">
          <div className="card glass-card p-6 mb-6" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.08))', border: '1px solid var(--border-subtle)' }}>
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
              <Sparkles size={20} className="text-primary" /> Campus Student Societies
            </h3>
            <p className="text-xs text-muted">
              Connect with fellow students, participate in hackathons, sports leagues, and cultural festivals across campus.
            </p>
          </div>

          <div className="grid-2 gap-4">
            {CLUBS.map(club => {
              const isMember = joinedClubs.has(club.id)
              return (
                <div key={club.id} className="card glass-card p-5 flex flex-col justify-between" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-extrabold text-base">{club.name}</h4>
                      <span className="badge badge-accent text-xs font-semibold">{club.category}</span>
                    </div>
                    <p className="text-xs text-secondary mb-4" style={{ lineHeight: 1.5 }}>{club.desc}</p>
                    <div className="text-xs text-muted flex items-center gap-4 mb-4">
                      <span><Users size={13} className="text-primary inline mr-1" /> {club.members + (isMember ? 1 : 0)} Active Members</span>
                      <span>Lead: {club.lead}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t flex justify-end" style={{ borderColor: 'var(--border-subtle)' }}>
                    <button
                      className={`btn btn-sm ${isMember ? 'btn-danger' : 'btn-primary'}`}
                      onClick={() => toggleClubJoin(club.id)}
                    >
                      {isMember ? 'Leave Society' : 'Join Society'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* CAMPUS EVENTS FEED VIEW */
        <>
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search campus events by title, venue, or society..."
            categories={CATEGORIES}
            activeCategory={category}
            onCategoryChange={setCategory}
          />

          {loading ? (
            <LoadingGrid count={6} height="320px" gridClass="grid-auto" label="Loading campus events..." />
          ) : error ? (
            <ErrorState title="We couldn't load campus events" message={error} onRetry={fetchEvents} />
          ) : events.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No events found"
              description="Try adjusting your search query or category filter"
            />
          ) : (
            <div className="grid-auto events-grid">
              {events.map(ev => {
                const isReminded = reminders.has(ev.id)
                return (
                  <div key={ev.id} className="event-card card card-hover glass-card">
                    <div className="event-card-img">
                      {ev.image_url
                        ? <img src={ev.image_url} alt={ev.title} className="img-cover" />
                        : <div className="event-card-img-placeholder"><Calendar size={32} /></div>
                      }
                      <span className={`badge badge-${getCategoryColor(ev.category)} event-card-badge`}>{ev.category}</span>
                      
                      <button
                        className={`btn btn-icon btn-xs ${isReminded ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ position: 'absolute', top: 12, right: 12, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', border: 'none' }}
                        onClick={(e) => toggleReminder(ev.id, e)}
                        title={isReminded ? 'Reminder set' : 'Set reminder'}
                      >
                        <Bell size={14} style={{ color: isReminded ? 'var(--primary)' : '#fff' }} />
                      </button>

                      <div className="event-card-capacity">
                        <Users size={12} /> {ev.registered_count || 0}/{ev.capacity}
                      </div>
                    </div>

                    <div className="event-card-body">
                      <h4 className="event-card-title">{ev.title}</h4>
                      <p className="event-card-desc">{ev.description?.slice(0, 90)}...</p>
                      
                      <div className="event-card-meta">
                        <span><Calendar size={13} /> {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span><Clock size={13} /> {ev.time}</span>
                        <span><MapPin size={13} /> {ev.location}</span>
                      </div>

                      <div className="event-card-actions">
                        <Link to={`/events/${ev.id}`} className="btn btn-outline btn-sm">View Details</Link>
                        <button
                          className={`btn btn-sm ${ev.is_registered ? 'btn-danger' : 'btn-primary'}`}
                          onClick={() => handleRegister(ev.id, ev.is_registered)}
                          disabled={registering === ev.id || (ev.registered_count >= ev.capacity && !ev.is_registered)}
                        >
                          {registering === ev.id ? <div className="spinner" /> : ev.is_registered ? 'Cancel RSVP' : ev.registered_count >= ev.capacity ? 'Full' : 'RSVP Going'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function getCategoryColor(cat) {
  const map = { Sports: 'warning', Workshop: 'accent', Seminar: 'primary', Cultural: 'danger', Tech: 'primary', Competitions: 'warning' }
  return map[cat] || 'muted'
}
