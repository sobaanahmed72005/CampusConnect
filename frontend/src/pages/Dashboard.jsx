import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import {
  Calendar, ShoppingBag, Search, Building2, Bell, MessageSquare,
  ArrowRight, MapPin, Clock, CheckSquare, ShieldCheck, AlertCircle, Sparkles, BookOpen, Plus, Megaphone, Tag, CheckCircle2, User
} from 'lucide-react'
import SectionCard from '../components/ui/SectionCard'
import EmptyState from '../components/ui/EmptyState'
import AnnouncementModal from '../components/announcements/AnnouncementModal'
import StudentOnboardingWizard from '../components/ui/StudentOnboardingWizard'
import ContextualGuideBanner from '../components/ui/ContextualGuideBanner'
import OptimizedImage from '../components/ui/OptimizedImage'
import './Dashboard.css'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS_MAP = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday' }

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
  const [timetable, setTimetable] = useState([])
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
    if (!localStorage.getItem('cc_onboarded')) {
      setShowOnboarding(true)
    }
  }, [])

  const fetchDashboardData = () => {
    setLoading(true)
    const todayDayOfWeek = new Date().getDay() || 1 // 1=Mon...5=Fri

    Promise.all([
      api.get('/dashboard/stats').catch(() => ({ data: null })),
      api.get('/announcements').catch(() => ({ data: { announcements: [] } })),
      api.get('/events?limit=3&upcoming=true').catch(() => ({ data: { events: [] } })),
      api.get('/notifications').catch(() => ({ data: { notifications: [] } })),
      api.get('/marketplace?limit=4').catch(() => ({ data: { products: [] } })),
      api.get('/lost-found?limit=3').catch(() => ({ data: { items: [] } })),
      api.get('/accommodation?limit=3').catch(() => ({ data: { listings: [] } })),
      api.get('/dashboard/assignments').catch(() => ({ data: { assignments: [] } })),
      api.get('/academic/timetable').catch(() => ({ data: { timetable: [] } })),
      api.get('/messages/conversations').catch(() => ({ data: { conversations: [] } })),
    ]).then(([s, anc, e, n, m, lf, acc, asgn, tt, conv]) => {
      setStats(s.data)
      setAnnouncements(anc.data.announcements || [])
      setEvents(e.data.events || [])
      setNotifications((n.data.notifications || []).slice(0, 3))
      setProducts(m.data.products || [])
      setLostFound(lf.data.items || [])
      setAccommodation(acc.data.listings || [])
      setAssignments(asgn.data.assignments || [])
      
      const allTT = tt.data.timetable || []
      const todayTT = allTT.filter(t => parseInt(t.day_of_week) === (todayDayOfWeek > 5 ? 1 : todayDayOfWeek))
      setTimetable(todayTT.length > 0 ? todayTT : allTT.slice(0, 3))
      setConversations(conv.data.conversations || [])
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
  const unreadMsgs = conversations.reduce((acc, c) => acc + (parseInt(c.unread_count) || 0), 0)
  const timeGreeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="dashboard animate-fade flex flex-col gap-6">

      {/* TOP HERO: Personalized Student Hub Header */}
      <div className="dashboard-welcome glass-card p-6" style={{ background: 'linear-gradient(135deg, var(--bg-surface-elevated) 0%, var(--bg-card) 100%)', border: '1px solid var(--border-strong)' }}>
        <div style={{ flex: 1 }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge badge-primary badge-pulse">Student Portal Hub 2.0</span>
            <span className="badge badge-muted">{user?.department || 'Computer Science'}</span>
            <span className="badge badge-accent">GPA: {stats?.gpa || '3.8'}</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>{timeGreeting}, {user?.first_name || 'Student'} 👋</h1>
          <p className="text-body-sm text-muted mt-1">
            Welcome to your central campus operating hub. Here is your personalized overview for today.
          </p>
        </div>
        
        <div className="dashboard-quick-stats flex items-center gap-4 flex-wrap mt-3 sm:mt-0">
          <div className="quick-stat-item card p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <span className="qs-label text-xs text-muted">Attendance Rate</span>
            <span className="qs-value font-bold text-lg" style={{ color: 'var(--primary)' }}>{stats?.attendance || '95%'}</span>
          </div>
          <div className="quick-stat-item card p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <span className="qs-label text-xs text-muted">Events Joined</span>
            <span className="qs-value font-bold text-lg" style={{ color: 'var(--accent)' }}>{stats?.events_joined || 0}</span>
          </div>
          <div className="quick-stat-item card p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <span className="qs-label text-xs text-muted">Unread Alerts</span>
            <span className="qs-value font-bold text-lg" style={{ color: (unreadNotifs.length + unreadMsgs) > 0 ? 'var(--danger)' : 'var(--primary)' }}>
              {unreadNotifs.length + unreadMsgs}
            </span>
          </div>
        </div>
      </div>

      {/* ANNOUNCEMENT BANNER */}
      <div className="card p-4 glass-card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(16,185,129,0.06))', border: '1px solid var(--border-accent)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap" style={{ flex: 1, minWidth: '220px' }}>
            <div className="p-2.5 rounded-lg text-accent flex-shrink-0" style={{ background: 'var(--accent-50)' }}>
              <Megaphone size={22} />
            </div>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div className="flex items-center gap-2 font-bold text-sm flex-wrap">
                <span>🔔 Official Campus Announcement</span>
                <span className="badge badge-accent text-xs">University Broadcast</span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                {announcements.length > 0
                  ? announcements[0].title
                  : '📢 Midterm Examination Schedule & Course Registration is currently active.'
                }
              </p>
            </div>
          </div>
          {user?.role === 'admin' && (
            <button className="btn btn-accent btn-sm flex-shrink-0" onClick={() => setShowAnnouncementModal(true)}>
              <Plus size={14} /> Create Notice
            </button>
          )}
        </div>
      </div>

      {/* MAIN 2-COLUMN HUB GRID */}
      <div className="dashboard-grid">

        {/* LEFT COLUMN: Classes, Events & Marketplace */}
        <div className="flex flex-col gap-6">

          {/* Today's Class Schedule Widget */}
          <SectionCard
            icon={Clock}
            title="Today's Lecture Schedule"
            actionLink="/timetable"
            actionText="Full Timetable"
            iconColor="var(--primary)"
            badgeText={`${timetable.length} Classes Today`}
          >
            {timetable.length === 0 ? (
              <div className="p-4 card text-center text-xs text-muted">
                <CheckCircle2 size={24} className="mx-auto mb-2 text-primary" />
                No lectures scheduled for today! Enjoy your free time.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {timetable.map(t => (
                  <div key={t.id} className="card p-3 flex items-center justify-between hover:border-primary" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md text-primary" style={{ background: 'var(--primary-50)' }}>
                        <BookOpen size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{t.course_name || t.subject}</h4>
                        <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                          <span><MapPin size={11} className="inline mr-0.5" /> Room {t.room || 'L-101'}</span>
                          <span>•</span>
                          <span><User size={11} className="inline mr-0.5" /> {t.instructor || 'Prof. Faculty'}</span>
                        </div>
                      </div>
                    </div>
                    <span className="badge badge-primary text-xs font-bold">{t.start_time} - {t.end_time}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

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
              <EmptyState icon={Calendar} title="No upcoming events" description="Explore the events tab to register for campus workshops." />
            ) : (
              <div className="grid-2 gap-3">
                {events.map(ev => (
                  <Link key={ev.id} to={`/events/${ev.id}`} className="event-card card card-hover p-4 glass-card" style={{ textDecoration: 'none', color: 'inherit' }}>
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

          {/* Marketplace Activity */}
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
                  <Link key={p.id} to={`/marketplace/${p.id}`} className="card card-hover p-3 glass-card" style={{ textDecoration: 'none', color: 'inherit' }}>
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
                          <span className="price font-bold text-sm" style={{ color: 'var(--primary)' }}>PKR {Number(p.price).toLocaleString()}</span>
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

        {/* RIGHT COLUMN: Academic Tasks, Lost & Found & Accommodation */}
        <div className="flex flex-col gap-6">

          {/* Academic Submissions */}
          <SectionCard
            icon={CheckSquare}
            title="Academic Assignments"
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

          {/* Accommodation Radar */}
          <SectionCard
            icon={Building2}
            title="Accommodation & Housing"
            actionLink="/accommodation"
            actionText="View Housing"
            iconColor="#3b82f6"
          >
            {accommodation.length === 0 ? (
              <div className="text-xs text-muted text-center p-3">No active housing posts.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {accommodation.slice(0, 2).map(acc => (
                  <Link key={acc.id} to={`/accommodation/${acc.id}`} className="p-2.5 card flex items-center justify-between hover:border-primary" style={{ background: 'var(--bg-surface)', textDecoration: 'none', color: 'inherit' }}>
                    <div className="truncate">
                      <div className="font-semibold text-xs truncate">{acc.title}</div>
                      <div className="text-xs text-muted"><MapPin size={10} className="inline mr-1" />{acc.location}</div>
                    </div>
                    <span className="badge badge-accent text-xs font-bold">PKR {Number(acc.rent).toLocaleString()}/mo</span>
                  </Link>
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

      {/* CONTEXTUAL QUICK ACTIONS HUB */}
      <SectionCard icon={Sparkles} title="⚡ Quick Action Hub" iconColor="var(--primary)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
          {[
            { label: '+ Sell an Item', to: '/marketplace', icon: ShoppingBag, color: 'var(--accent)', bg: 'var(--accent-50)' },
            { label: '+ Report Lost Item', to: '/lost-found', icon: Search, color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.1)' },
            { label: '+ Find Housing', to: '/accommodation', icon: Building2, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
            { label: 'Browse Events', to: '/events', icon: Calendar, color: 'var(--primary)', bg: 'var(--primary-50)' },
            { label: 'Timetable', to: '/timetable', icon: Clock, color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.1)' },
            { label: 'Profile Settings', to: '/profile', icon: BookOpen, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' },
          ].map(({ label, to, icon: Icon, color, bg }) => (
            <Link key={label} to={to} className="card p-3 flex items-center gap-3 text-xs font-bold hover:border-primary transition-all glass-card" style={{ background: 'var(--bg-surface)', textDecoration: 'none', color: 'inherit' }}>
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
        <StudentOnboardingWizard
          onClose={() => setShowOnboarding(false)}
        />
      )}
    </div>
  )
}
