import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import {
  Bell, Check, CheckCheck, Trash2, ShieldCheck, Calendar, ShoppingBag,
  MessageSquare, Search, Building2, Megaphone, AlertCircle, Settings, ArrowRight, ExternalLink, Zap
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'

const CATEGORIES = [
  { id: 'all', label: 'All Alerts' },
  { id: 'unread', label: 'Unread Only' },
  { id: 'academic', label: 'Academic' },
  { id: 'events', label: 'Events' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'messages', label: 'Messages' },
  { id: 'lostFound', label: 'Lost & Found' },
  { id: 'accommodation', label: 'Housing' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'system', label: 'System' },
]

export default function Notifications() {
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [showPreferences, setShowPreferences] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [categoryPrefs, setCategoryPrefs] = useState({
    academic: true,
    events: true,
    marketplace: true,
    messages: true,
    lostFound: true,
    accommodation: true,
    announcements: true,
    system: true,
  })

  useEffect(() => {
    fetchNotifications()
    loadPreferences()
  }, [])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await api.get('/notifications')
      setNotifs(res.data.notifications || [])
    } catch {
      setNotifs([])
    } finally {
      setLoading(false)
    }
  }

  const loadPreferences = () => {
    try {
      const saved = localStorage.getItem('cc_notif_prefs')
      if (saved) setCategoryPrefs(JSON.parse(saved))

      const push = localStorage.getItem('cc_push_enabled')
      if (push === 'true') setPushEnabled(true)
    } catch {}
  }

  const savePreferences = (updated) => {
    setCategoryPrefs(updated)
    localStorage.setItem('cc_notif_prefs', JSON.stringify(updated))
    toast.success('Notification preferences updated')
  }

  const togglePush = () => {
    const next = !pushEnabled
    setPushEnabled(next)
    localStorage.setItem('cc_push_enabled', next ? 'true' : 'false')
    toast.success(next ? 'Web Push Notifications Enabled' : 'Web Push Notifications Disabled')
  }

  const markRead = async (id, e) => {
    if (e) e.stopPropagation()
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: true } : x))
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifs(n => n.map(x => ({ ...x, is_read: true })))
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark all as read')
    }
  }

  const deleteNotif = async (id, e) => {
    if (e) e.stopPropagation()
    try {
      await api.delete(`/notifications/${id}`)
      setNotifs(n => n.filter(x => x.id !== id))
    } catch {}
  }

  const handleNotifClick = (notif) => {
    if (!notif.is_read) markRead(notif.id)

    // Deep Linking Router Logic
    if (notif.link) {
      navigate(notif.link)
    } else if (notif.type === 'events' || notif.category === 'events') {
      navigate('/events')
    } else if (notif.type === 'marketplace' || notif.category === 'marketplace') {
      navigate('/marketplace')
    } else if (notif.type === 'lostFound' || notif.category === 'lostFound') {
      navigate('/lost-found')
    } else if (notif.type === 'messages' || notif.category === 'messages') {
      // Open messages
    }
  }

  const unreadCount = notifs.filter(n => !n.is_read).length

  const filteredNotifs = notifs.filter(n => {
    if (activeCategory === 'all') return true
    if (activeCategory === 'unread') return !n.is_read
    return n.category === activeCategory || n.type === activeCategory
  })

  const getCategoryIcon = (type) => {
    switch (type) {
      case 'events': return <Calendar size={16} className="text-primary" />
      case 'marketplace': return <ShoppingBag size={16} className="text-accent" />
      case 'messages': return <MessageSquare size={16} style={{ color: '#3b82f6' }} />
      case 'lostFound': return <Search size={16} className="text-warning" />
      case 'accommodation': return <Building2 size={16} style={{ color: '#ec4899' }} />
      case 'announcements': return <Megaphone size={16} className="text-accent" />
      default: return <Bell size={16} className="text-primary" />
    }
  }

  return (
    <div className="animate-fade">
      <PageHeader
        icon={Bell}
        title="Notifications 2.0"
        subtitle="Unified campus notification center with category routing, deep links, and push controls"
        iconColor="var(--primary)"
        action={
          <div className="flex items-center gap-2">
            <button className="btn btn-outline btn-sm" onClick={() => setShowPreferences(true)}>
              <Settings size={14} /> Preferences
            </button>
            {unreadCount > 0 && (
              <button className="btn btn-primary btn-sm" onClick={markAllRead}>
                <CheckCheck size={14} /> Mark All Read ({unreadCount})
              </button>
            )}
          </div>
        }
      />

      {/* Category Filter Chips Bar */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`btn btn-xs ${activeCategory === cat.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)' }}
          >
            {cat.label}
            {cat.id === 'unread' && unreadCount > 0 && (
              <span className="badge badge-danger text-xs ml-1" style={{ padding: '2px 6px' }}>{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div>{[...Array(5)].map((_, i) => <div key={i} className="skeleton-shimmer mb-3" style={{ height: '76px', borderRadius: 'var(--radius-lg)' }} />)}</div>
      ) : filteredNotifs.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications found"
          description="You are completely caught up! New campus alerts will appear here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2.5)' }}>
          {filteredNotifs.map(n => (
            <div
              key={n.id}
              onClick={() => handleNotifClick(n)}
              className={`card glass-card notif-item ${!n.is_read ? 'notif-unread badge-pulse' : ''}`}
              style={{
                padding: 'var(--space-4)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-4)',
                background: !n.is_read ? 'var(--bg-level-4)' : 'var(--bg-surface)',
                border: `1px solid ${!n.is_read ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                cursor: 'pointer'
              }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {getCategoryIcon(n.type || n.category)}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span style={{ fontWeight: !n.is_read ? 800 : 600, fontSize: '0.92rem' }} className="truncate">{n.title}</span>
                  <span className="badge badge-accent text-xs uppercase">{n.type || n.category || 'System'}</span>
                  {n.priority === 'high' && <span className="badge badge-danger text-xs">High Priority</span>}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{n.message}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }} className="flex items-center gap-2">
                  <span>{new Date(n.created_at).toLocaleString()}</span>
                  {n.link && <span className="text-primary font-semibold flex items-center gap-0.5"><ExternalLink size={10} /> Open link</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-1)' }} onClick={e => e.stopPropagation()}>
                {!n.is_read && (
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => markRead(n.id, e)} title="Mark as read">
                    <Check size={14} />
                  </button>
                )}
                <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={(e) => deleteNotif(n.id, e)} title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notification Preferences Modal */}
      {showPreferences && (
        <div className="modal-overlay animate-fade" onClick={() => setShowPreferences(false)}>
          <div className="modal glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: 'var(--space-6)' }}>
            <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2 font-bold text-base">
                <Settings size={18} className="text-primary" /> Notification Preferences
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPreferences(false)}>
                <Check size={16} />
              </button>
            </div>

            {/* Web Push Control Toggle */}
            <div className="p-3 card mb-4 flex items-center justify-between" style={{ background: 'var(--bg-surface)' }}>
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <Zap size={14} className="text-warning" /> Web Push Alerts
                </div>
                <div className="text-xs text-muted mt-0.5">Receive instant browser push notifications for urgent alerts.</div>
              </div>
              <button className={`btn btn-xs ${pushEnabled ? 'btn-primary' : 'btn-outline'}`} onClick={togglePush}>
                {pushEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {/* Category Preferences Checklist */}
            <div className="flex flex-col gap-2">
              <div className="text-xs text-muted font-bold uppercase mb-1">CATEGORY SUBSCRIPTIONS</div>
              {Object.keys(categoryPrefs).map(catKey => (
                <label key={catKey} className="card p-3 flex items-center justify-between text-xs font-semibold" style={{ background: 'var(--bg-surface)', cursor: 'pointer' }}>
                  <span className="capitalize">{catKey} Alerts</span>
                  <input
                    type="checkbox"
                    checked={categoryPrefs[catKey]}
                    onChange={e => savePreferences({ ...categoryPrefs, [catKey]: e.target.checked })}
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button className="btn btn-primary btn-sm" onClick={() => setShowPreferences(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
