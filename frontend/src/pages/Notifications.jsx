import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'

export default function Notifications() {
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/notifications').then(r => setNotifs(r.data.notifications || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: true } : x))
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifs(n => n.map(x => ({ ...x, is_read: true })))
      toast.success('All marked as read')
    } catch {}
  }

  const deleteNotif = async (id) => {
    try {
      await api.delete(`/notifications/${id}`)
      setNotifs(n => n.filter(x => x.id !== id))
    } catch {}
  }

  const unreadCount = notifs.filter(n => !n.is_read).length

  return (
    <div className="animate-fade">
      <PageHeader
        icon={Bell}
        title="Notifications"
        subtitle="Stay updated on campus events, marketplace offers, and system announcements"
        iconColor="var(--primary)"
        action={
          unreadCount > 0 && (
            <button className="btn btn-outline btn-sm" onClick={markAllRead}>
              <CheckCheck size={14} /> Mark all read
            </button>
          )
        }
      />

      {loading ? (
        <div>{[...Array(5)].map((_, i) => <div key={i} className="skeleton mb-3" style={{ height: '72px' }} />)}</div>
      ) : notifs.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You are all caught up! New alerts will appear here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {notifs.map(n => (
            <div key={n.id} className={`card notif-item ${!n.is_read ? 'notif-unread' : ''}`} style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: `${n.type === 'event' ? 'var(--primary-100)' : n.type === 'marketplace' ? 'var(--accent-50)' : 'rgba(245,158,11,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bell size={16} style={{ color: n.type === 'event' ? 'var(--primary)' : n.type === 'marketplace' ? 'var(--accent-light)' : 'var(--warning)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize: '0.9rem' }}>{n.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{n.message}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                {!n.is_read && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => markRead(n.id)} title="Mark as read"><Check size={14} /></button>}
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteNotif(n.id)} style={{ color: 'var(--danger)' }} title="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
