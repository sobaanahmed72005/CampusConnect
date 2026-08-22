import { useEffect, useState } from 'react'
import { Zap, Calendar, ShoppingBag, Search, Sparkles, MessageSquare, TrendingUp } from 'lucide-react'
import api from '../../lib/api'

export default function TrendingCampusActivity() {
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivity()
  }, [])

  const fetchActivity = async () => {
    setLoading(true)
    try {
      // Aggregate activity from events, marketplace & lost/found
      const [eventsRes, mktRes, lfRes] = await Promise.all([
        api.get('/events?limit=3').catch(() => ({ data: { events: [] } })),
        api.get('/marketplace?limit=3').catch(() => ({ data: { products: [] } })),
        api.get('/lost-found?limit=3').catch(() => ({ data: { items: [] } }))
      ])

      const feed = []

      ;(eventsRes.data.events || []).forEach(e => {
        feed.push({
          id: `ev-${e.id}`,
          type: 'event',
          icon: Calendar,
          color: 'var(--primary)',
          title: `Upcoming Event: "${e.title}"`,
          subtitle: `${e.location || 'Campus'} • ${e.capacity || 50} spots available`,
          time: 'Popular Event'
        })
      })

      ;(mktRes.data.products || []).forEach(m => {
        feed.push({
          id: `mkt-${m.id}`,
          type: 'marketplace',
          icon: ShoppingBag,
          color: 'var(--accent)',
          title: `New Trade Listing: "${m.title}"`,
          subtitle: `PKR ${Number(m.price).toLocaleString()} • ${m.category}`,
          time: 'Marketplace'
        })
      })

      ;(lfRes.data.items || []).forEach(lf => {
        feed.push({
          id: `lf-${lf.id}`,
          type: 'lostFound',
          icon: Search,
          color: 'var(--warning)',
          title: `${lf.type === 'lost' ? 'Lost' : 'Found'} Item Report: "${lf.title}"`,
          subtitle: `Reported at ${lf.location}`,
          time: 'Radar'
        })
      })

      setActivity(feed.slice(0, 5))
    } catch {
      setActivity([])
    } finally {
      setLoading(false)
    }
  }

  if (loading || activity.length === 0) return null

  return (
    <div className="card glass-card p-4 mb-6 animate-fade" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(99,102,241,0.06))', border: '1px solid var(--border-strong)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-md" style={{ background: 'var(--primary-50)', color: 'var(--primary)' }}>
            <TrendingUp size={16} />
          </span>
          <span className="font-bold text-sm">Live FAST Campus Activity</span>
          <span className="badge badge-primary text-xs flex items-center gap-1">
            <Zap size={10} /> Real-Time
          </span>
        </div>
        <span className="text-xs text-muted">FAST NUCES Ticker</span>
      </div>

      <div className="flex flex-col gap-2">
        {activity.map(item => {
          const Icon = item.icon
          return (
            <div key={item.id} className="p-2.5 rounded-md flex items-center justify-between text-xs transition-colors hover:bg-surface" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2.5 truncate">
                <Icon size={14} style={{ color: item.color, flexShrink: 0 }} />
                <span className="font-bold text-primary truncate">{item.title}</span>
                <span className="text-muted hidden md:inline truncate">• {item.subtitle}</span>
              </div>
              <span className="badge badge-muted text-xs flex-shrink-0">{item.time}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
