import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { Calendar, MapPin, Clock, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import LoadingGrid from '../components/ui/LoadingGrid'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import './Events.css'

const CATEGORIES = ['All', 'Society', 'Workshop', 'Sports', 'Seminar', 'Cultural']

export default function Events() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [registering, setRegistering] = useState(null)

  useEffect(() => { fetchEvents() }, [search, category])

  const fetchEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (category !== 'All') params.set('category', category)
      const res = await api.get(`/events?${params}`)
      setEvents(res.data.events || [])
    } catch (err) {
      setError(err.response?.data?.message || "We couldn't load campus events. Try again.")
      setEvents([])
    } finally { setLoading(false) }
  }

  const handleRegister = async (eventId, isRegistered) => {
    setRegistering(eventId)
    try {
      if (isRegistered) {
        await api.delete(`/events/${eventId}/register`)
        toast.success('Registration cancelled')
      } else {
        await api.post(`/events/${eventId}/register`)
        toast.success('Successfully registered! 🎉')
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
        title="Campus Events"
        subtitle="Discover and register for events happening across campus"
        iconColor="var(--primary)"
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search events by title or location..."
        categories={CATEGORIES}
        activeCategory={category}
        onCategoryChange={setCategory}
      />

      {loading ? (
        <LoadingGrid count={6} height="320px" gridClass="grid-auto" label="Loading campus events..." />
      ) : error ? (
        <ErrorState
          title="We couldn't load campus events"
          message={error}
          onRetry={fetchEvents}
        />
      ) : events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events found"
          description="Try adjusting your search query or category filter"
        />
      ) : (
        <div className="grid-auto events-grid">
          {events.map(ev => (
            <div key={ev.id} className="event-card card card-hover">
              <div className="event-card-img">
                {ev.image_url
                  ? <img src={ev.image_url} alt={ev.title} className="img-cover" />
                  : <div className="event-card-img-placeholder"><Calendar size={32} /></div>
                }
                <span className={`badge badge-${getCategoryColor(ev.category)} event-card-badge`}>{ev.category}</span>
                <div className="event-card-capacity">
                  <Users size={12} /> {ev.registered_count || 0}/{ev.capacity}
                </div>
              </div>
              <div className="event-card-body">
                <h4 className="event-card-title">{ev.title}</h4>
                <p className="event-card-desc">{ev.description?.slice(0, 90)}...</p>
                <div className="event-card-meta">
                  <span><Calendar size={13} /> {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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
                    {registering === ev.id ? <div className="spinner" /> : ev.is_registered ? 'Cancel' : ev.registered_count >= ev.capacity ? 'Full' : 'Register'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getCategoryColor(cat) {
  const map = { Sports: 'warning', Workshop: 'accent', Seminar: 'primary', Cultural: 'danger', Society: 'success' }
  return map[cat] || 'muted'
}
