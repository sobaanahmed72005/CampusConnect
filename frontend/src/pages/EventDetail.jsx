import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'
import { Calendar, MapPin, Clock, Users, ArrowLeft, Share2, Bookmark } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(res => setEvent(res.data.event))
      .catch(() => toast.error('Event not found'))
      .finally(() => setLoading(false))
  }, [id])

  const handleRegister = async () => {
    setRegistering(true)
    try {
      if (event.is_registered) {
        await api.delete(`/events/${id}/register`)
        toast.success('Registration cancelled')
      } else {
        await api.post(`/events/${id}/register`)
        toast.success('Registered successfully!')
      }
      setEvent(ev => ({ ...ev, is_registered: !ev.is_registered, registered_count: ev.is_registered ? ev.registered_count - 1 : ev.registered_count + 1 }))
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed') }
    finally { setRegistering(false) }
  }

  if (loading) return <div className="flex items-center justify-center" style={{height:'60vh'}}><div className="spinner spinner-lg"/></div>
  if (!event) return <div className="empty-state"><h3>Event not found</h3><Link to="/events" className="btn btn-primary mt-4">Back to Events</Link></div>

  return (
    <div className="animate-fade" style={{maxWidth:'800px'}}>
      <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate(-1)}><ArrowLeft size={16}/> Back</button>

      <div className="card" style={{padding:0, overflow:'hidden'}}>
        {event.image_url && <img src={event.image_url} alt={event.title} style={{width:'100%',height:'320px',objectFit:'cover'}} />}
        <div style={{padding:'var(--space-8)'}}>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="badge badge-primary font-bold">{event.category}</span>
            {event.is_registered && <span className="badge badge-success font-bold flex items-center gap-1">✓ RSVP Confirmed</span>}
            <span className="badge badge-accent text-xs">🎓 Organized by ACM / Campus Society</span>
          </div>
          <h1 style={{marginBottom:'var(--space-4)', fontSize: '1.8rem', fontWeight: 800}}>{event.title}</h1>

          {/* RSVP Capacity Progress Bar */}
          <div className="card glass-card p-4 mb-6" style={{ background: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="text-muted">RSVP CAPACITY PROGRESS</span>
              <span className="text-primary">{event.registered_count || 0} / {event.capacity || 50} Spots Reserved</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-card)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, ((event.registered_count || 0) / (event.capacity || 50)) * 100)}%`,
                  background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 300ms ease'
                }}
              />
            </div>
          </div>

          <div className="event-specs-grid mb-6">
            {[
              { icon: Calendar, label: 'Date', value: new Date(event.date).toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) },
              { icon: Clock, label: 'Time', value: event.time || '10:00 AM' },
              { icon: MapPin, label: 'Location', value: event.location || 'Campus Auditorium' },
              { icon: Users, label: 'Capacity', value: `${event.registered_count || 0}/${event.capacity || 50} registered` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{display:'flex',alignItems:'flex-start',gap:'var(--space-3)',padding:'var(--space-4)',background:'var(--bg-surface)',borderRadius:'var(--radius-md)',border:'1px solid var(--border)'}}>
                <Icon size={16} style={{color:'var(--primary)',marginTop:2}} />
                <div><div style={{fontSize:'0.72rem',color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase'}}>{label}</div><div style={{fontSize:'0.875rem',fontWeight:500}}>{value}</div></div>
              </div>
            ))}
          </div>
          <div style={{marginBottom:'var(--space-6)'}}>
            <h3 style={{marginBottom:'var(--space-3)'}}>About This Event</h3>
            <p style={{lineHeight:1.8}}>{event.description}</p>
          </div>
          <div className="flex gap-3">
            <button
              className={`btn btn-lg ${event.is_registered ? 'btn-danger' : 'btn-primary'}`}
              onClick={handleRegister}
              disabled={registering || (event.registered_count >= event.capacity && !event.is_registered)}
            >
              {registering ? <div className="spinner"/> : event.is_registered ? 'Cancel RSVP' : event.registered_count >= event.capacity ? 'Event Full' : '✓ RSVP for Event'}
            </button>
            <button className="btn btn-outline btn-icon" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Event link copied!') }}><Share2 size={18}/></button>
          </div>
        </div>
      </div>
    </div>
  )
}
