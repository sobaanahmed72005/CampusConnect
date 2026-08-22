import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Calendar, ShoppingBag, ArrowRight, Award, Tag } from 'lucide-react'
import { getPersonalizedRecommendations } from '../../lib/personalizationEngine'

export default function PersonalizedFeedWidget({ user, events = [], products = [] }) {
  const recommendations = useMemo(() => {
    return getPersonalizedRecommendations(user, events, products)
  }, [user, events, products])

  const topEvent = recommendations.events[0]
  const topProduct = recommendations.products[0]

  if (!topEvent && !topProduct) return null

  return (
    <div className="card glass-card p-5 mb-6 animate-fade" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.08))', border: '1px solid var(--border-accent)' }}>
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-md" style={{ background: 'var(--accent-50)', color: 'var(--accent)' }}>
            <Sparkles size={18} />
          </span>
          <div>
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              Curated For You
              <span className="badge badge-accent text-xs">Personalized Feed</span>
            </h3>
            <p className="text-xs text-muted">
              Tailored for <strong>{user?.first_name}</strong> based on {user?.department || 'Computer Science'} & {recommendations.primaryInterest}
            </p>
          </div>
        </div>
        <Link to="/profile" className="text-xs text-primary font-bold flex items-center gap-1">
          Tune Preferences →
        </Link>
      </div>

      {/* Recommended Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recommended Event Card */}
        {topEvent && (
          <div className="card p-4 hover:border-primary transition-all flex flex-col justify-between" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="badge badge-primary text-xs flex items-center gap-1 font-bold">
                  <Calendar size={11} /> Recommended Event
                </span>
                <span className="text-xs text-accent font-semibold truncate" style={{ fontSize: '0.72rem' }}>
                  {topEvent.matchReason}
                </span>
              </div>
              <h4 className="font-bold text-sm mb-1 text-primary">{topEvent.title}</h4>
              <p className="text-xs text-muted mb-3">{topEvent.location} • {topEvent.capacity || 50} capacity</p>
            </div>
            <Link to={`/events/${topEvent.id}`} className="btn btn-outline btn-xs w-full flex items-center justify-center gap-1 font-bold text-primary">
              View Event & RSVP <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {/* Recommended Marketplace Item Card */}
        {topProduct && (
          <div className="card p-4 hover:border-accent transition-all flex flex-col justify-between" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="badge badge-accent text-xs flex items-center gap-1 font-bold">
                  <ShoppingBag size={11} /> Recommended Listing
                </span>
                <span className="text-xs text-primary font-semibold truncate" style={{ fontSize: '0.72rem' }}>
                  {topProduct.matchReason}
                </span>
              </div>
              <h4 className="font-bold text-sm mb-1 text-primary">{topProduct.title}</h4>
              <p className="text-xs text-muted mb-3">PKR {Number(topProduct.price).toLocaleString()} • {topProduct.category}</p>
            </div>
            <Link to={`/marketplace/${topProduct.id}`} className="btn btn-outline btn-xs w-full flex items-center justify-center gap-1 font-bold text-accent">
              View Product <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
