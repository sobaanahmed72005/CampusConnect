import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import {
  Calendar, ShoppingBag, Search, Building2, Bell,
  ArrowRight, MapPin, Clock, CheckSquare, ShieldCheck, AlertCircle, Sparkles, BookOpen, Plus, Megaphone, Tag
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import SectionCard from '../components/ui/SectionCard'
import EmptyState from '../components/ui/EmptyState'
import AnnouncementModal from '../components/announcements/AnnouncementModal'
import OnboardingModal from '../components/ui/OnboardingModal'
import OptimizedImage from '../components/ui/OptimizedImage'
import './Dashboard.css'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [events, setEvents] = useState([])
  const [notifications, setNotifications] = useState([])
  const [products, setProducts] = useState([])
  const [lostFound, setLostFound] = useState([])
  const [accommodation, setAccommodation] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
    if (!localStorage.getItem('cc_onboarded')) {
      setShowOnboarding(true)
    }
  }, [])

  const fetchDashboardData = () => {
    setLoading(true)
    Promise.all([
      api.get('/dashboard/stats').catch(() => ({ data: null })),
      api.get('/announcements').catch(() => ({ data: { announcements: [] } })),
      api.get('/events?limit=3&upcoming=true').catch(() => ({ data: { events: [] } })),
      api.get('/notifications').catch(() => ({ data: { notifications: [] } })),
      api.get('/marketplace?limit=4').catch(() => ({ data: { products: [] } })),
      api.get('/lost-found?limit=3').catch(() => ({ data: { items: [] } })),
      api.get('/accommodation?limit=3').catch(() => ({ data: { listings: [] } })),
      api.get('/dashboard/assignments').catch(() => ({ data: { assignments: [] } })),
    ]).then(([s, anc, e, n, m, lf, acc, asgn]) => {
      setStats(s.data)
      setAnnouncements(anc.data.announcements || [])
      setEvents(e.data.events || [])
      setNotifications((n.data.notifications || []).slice(0, 3))
      setProducts(m.data.products || [])
      setLostFound(lf.data.items || [])
      setAccommodation(acc.data.listings || [])
      setAssignments(asgn.data.assignments || [])
    }).finally(() => setLoading(false))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '60vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  const unreadNotifs = notifications.filter(n => !n.is_read)
  const timeGreeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="dashboard animate-fade flex flex-col gap-6">

      {/* TOP TIER: Personalized Greeting Header */}
      <div className="dashboard-welcome">
        <div style={{ flex: 1 }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-primary badge-dot">Student Portal</span>
            <span className="badge badge-muted">{user?.department || 'Computer Science'}</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{timeGreeting}, {user?.first_name || 'Student'} 👋</h1>
          <p className="text-body-sm text-muted mt-1">
            Here's what's happening around FAST campus today.
          </p>
        </div>
        <div className="dashboard-quick-stats">
          <div className="quick-stat-item">
            <span className="qs-label">Events Joined</span>
            <span className="qs-value">{stats?.events_joined || 0}</span>
          </div>
          <div className="quick-stat-item">
            <span className="qs-label">Active Listings</span>
            <span className="qs-value">{products.length || 0}</span>
          </div>
          <div className="quick-stat-item">
            <span className="qs-label">Unread Alerts</span>
            <span className="qs-value" style={{ color: unreadNotifs.length > 0 ? 'var(--danger)' : 'var(--primary)' }}>
              {unreadNotifs.length}
            </span>
          </div>
        </div>
      </div>

      {/* TIER 1 (IMPORTANT): Campus Announcements Banner */}
      <div className="card p-4" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(16,185,129,0.05))', border: '1px solid var(--border-accent)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg text-accent" style={{ background: 'var(--accent-50)' }}>
              <Megaphone size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 font-bold text-sm">
                <span>🔔 Official Campus Announcements</span>
                <span className="badge badge-accent text-xs">University Broadcast</span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                {announcements.length > 0
                  ? announcements[0].title
                  : '📢 Midterm Examination Schedule & Registration is now active.'
                }
              </p>
            </div>
          </div>
          {user?.role === 'admin' && (
            <button className="btn btn-accent btn-sm" onClick={() => setShowAnnouncementModal(true)}>
              <Plus size={14} /> Create Notice
            </button>
          )}
        </div>
      </div>

      {/* TIER 2: Main Content 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-5)' }}>

        {/* Left Main Column: Events & Marketplace */}
        <div className="flex flex-col gap-6">

          {/* Upcoming Campus Events */}
          <SectionCard
            icon={Calendar}
            title="Upcoming Campus Events"
            actionLink="/events"
            actionText="View all events"
            iconColor="var(--primary)"
            badgeText={`${events.length} Upcoming`}
          >
            {events.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No upcoming events"
                description="Explore the events tab to register for campus workshops and activities."
              />
            ) : (
              <div className="grid-2 gap-3">
                {events.map(ev => (
                  <Link key={ev.id} to={`/events/${ev.id}`} className="event-card card card-hover p-4" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="event-date-badge">
                        <span className="event-date-day">{new Date(ev.date).getDate()}</span>
                        <span className="event-date-mon">{MONTHS[new Date(ev.date).getMonth()]}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm truncate">{ev.title}</h4>
                        <span className={`badge badge-${ev.category === 'Sports' ? 'warning' : ev.category === 'Workshop' ? 'accent' : 'primary'} text-xs mt-1`}>
                          {ev.category}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted flex items-center justify-between mt-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                      <span><MapPin size={11} className="inline mr-1" /> {ev.location}</span>
                      <span><Clock size={11} className="inline mr-1" /> {ev.time}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Recent Marketplace Activity */}
          <SectionCard
            icon={ShoppingBag}
            title="Student Marketplace Activity"
            actionLink="/marketplace"
            actionText="Explore Store"
            iconColor="var(--accent)"
            badgeText="Verified Student Trades"
          >
            {products.length === 0 ? (
              <EmptyState icon={ShoppingBag} title="No listings yet" description="Post textbooks or items for sale." />
            ) : (
              <div className="grid-2 gap-3">
                {products.slice(0, 2).map(p => (
                  <Link key={p.id} to={`/marketplace/${p.id}`} className="card card-hover p-3" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="flex gap-3">
                      <div style={{ width: 80, height: 80, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                        {p.image_url
                          ? <OptimizedImage src={p.image_url} alt={p.title} height="80px" />
                          : <div className="flex items-center justify-center h-full text-muted"><ShoppingBag size={24} /></div>
                        }
                      </div>
                      <div className="flex flex-col justify-between flex-1">
                        <div>
                          <div className="text-xs text-muted">{p.category}</div>
                          <h4 className="font-bold text-sm truncate">{p.title}</h4>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="price font-bold text-sm" style={{ color: 'var(--primary)' }}>₹{Number(p.price).toLocaleString()}</span>
                          <span className="badge badge-muted text-xs">{p.condition}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Secondary Column: Academic & Lost & Found */}
        <div className="flex flex-col gap-6">

          {/* Academic Activity */}
          <SectionCard
            icon={CheckSquare}
            title="Academic Activity"
            badgeText={`${assignments.length} Pending`}
            badgeClass="badge-accent"
            iconColor="var(--accent)"
          >
            {assignments.length === 0 ? (
              <div className="p-3 card text-xs flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--primary)' }}>
                <Sparkles size={16} /> All academic submissions completed!
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {assignments.map(a => (
                  <div key={a.id} className="p-3 card flex items-center justify-between" style={{ background: 'var(--bg-surface)' }}>
                    <div>
                      <div className="font-bold text-xs">{a.title}</div>
                      <div className="text-xs text-muted mt-0.5">{a.subject} • Due {new Date(a.due_date).toLocaleDateString()}</div>
                    </div>
                    <span className={`badge badge-${a.priority === 'high' ? 'danger' : 'warning'} text-xs`}>{a.priority}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Lost & Found Radar */}
          <SectionCard
            icon={Search}
            title="Lost & Found Radar"
            actionLink="/lost-found"
            actionText="View Board"
            iconColor="var(--warning)"
          >
            {lostFound.length === 0 ? (
              <div className="text-xs text-muted text-center p-3">No lost reports right now.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {lostFound.map(item => (
                  <Link key={item.id} to="/lost-found" className="p-2.5 card flex items-center justify-between hover:border-primary" style={{ background: 'var(--bg-surface)', textDecoration: 'none', color: 'inherit' }}>
                    <div className="flex items-center gap-2 truncate">
                      <span className={`badge ${item.type === 'lost' ? 'badge-danger' : 'badge-primary'} badge-dot text-xs`}>{item.type}</span>
                      <span className="font-semibold text-xs truncate">{item.title}</span>
                    </div>
                    <span className="text-xs text-muted"><MapPin size={10} className="inline mr-1" />{item.location}</span>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

        </div>
      </div>

      {/* TIER 3: Contextual Quick Actions */}
      <SectionCard icon={Sparkles} title="⚡ Contextual Quick Actions" iconColor="var(--primary)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
          {[
            { label: '+ Report Lost Item', to: '/lost-found', icon: Search, color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.1)' },
            { label: '+ Sell an Item', to: '/marketplace', icon: Plus, color: 'var(--accent)', bg: 'var(--accent-50)' },
            { label: '+ Find Accommodation', to: '/accommodation', icon: Building2, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
            { label: '+ Browse Events', to: '/events', icon: Calendar, color: 'var(--primary)', bg: 'var(--primary-50)' },
            { label: 'Check Timetable', to: '/timetable', icon: Clock, color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.1)' },
            { label: 'Account Settings', to: '/profile', icon: BookOpen, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' },
          ].map(({ label, to, icon: Icon, color, bg }) => (
            <Link key={label} to={to} className="card p-3 flex items-center gap-3 text-xs font-bold hover:border-primary transition-all" style={{ background: 'var(--bg-surface)', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} style={{ color }} />
              </div>
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </div>
      </SectionCard>

      {showAnnouncementModal && (
        <AnnouncementModal
          onClose={() => setShowAnnouncementModal(false)}
          onSuccess={fetchDashboardData}
        />
      )}

      {showOnboarding && (
        <OnboardingModal
          onClose={() => setShowOnboarding(false)}
        />
      )}
    </div>
  )
}
