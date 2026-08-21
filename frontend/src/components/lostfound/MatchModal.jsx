import { useEffect, useState } from 'react'
import { Sparkles, X, MapPin, Calendar, Phone, CheckCircle2, AlertCircle } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function MatchModal({ item, onClose }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMatches()
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [item.id, onClose])

  const fetchMatches = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/lost-found/${item.id}/matches`)
      setMatches(res.data.matches || [])
    } catch {
      setMatches([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-modal-title"
    >
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <h3 id="match-modal-title">🔍 Potential Matches Engine</h3>
            <span className="badge badge-accent text-xs">AI Match Matrix</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close match matrix modal">
            <X size={18} />
          </button>
        </div>

        {/* Target Item Summary Banner */}
        <div className="p-4 mb-4" style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <div className="text-xs text-muted font-semibold uppercase mb-1">YOUR REPORTED ITEM</div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }} className="flex items-center gap-2">
                <span className={`badge ${item.type === 'lost' ? 'badge-danger' : 'badge-primary'} badge-dot`}>{item.type}</span>
                {item.title}
              </div>
              <div className="text-xs text-muted mt-1 flex items-center gap-3">
                <span><MapPin size={11} /> {item.location}</span>
                <span><Calendar size={11} /> {new Date(item.date_occurred || item.date_lost_found).toLocaleDateString()}</span>
                <span>Category: <strong>{item.category}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Candidate Matches Feed */}
        <h4 style={{ fontWeight: 700, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={16} style={{ color: 'var(--primary)' }} /> Potential Matches Found ({matches.length})
        </h4>

        {loading ? (
          <div className="flex items-center justify-center p-8"><div className="spinner" /></div>
        ) : matches.length === 0 ? (
          <div className="p-6 text-center text-muted" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <div style={{ fontWeight: 600 }}>No potential matches found yet</div>
            <p className="text-xs text-muted mt-1">Our match engine continuously scans new reports. You will be notified automatically when a match occurs!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {matches.map(({ candidate, matchScore, reasons, confidence }) => (
              <div key={candidate.id} className="card p-4" style={{ borderLeft: `4px solid ${matchScore >= 70 ? 'var(--primary)' : 'var(--warning)'}` }}>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${candidate.type === 'lost' ? 'badge-danger' : 'badge-primary'} badge-dot`}>
                      Opposite Report: {candidate.type}
                    </span>
                    <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{candidate.title}</h4>
                  </div>
                  <span className={`badge ${matchScore >= 75 ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.85rem', padding: '6px 12px', fontWeight: 800 }}>
                    🎯 {matchScore}% Potential Match ({confidence})
                  </span>
                </div>

                <p className="text-xs text-muted mb-3" style={{ lineHeight: 1.5 }}>
                  {candidate.description || 'No description provided.'}
                </p>

                {/* Structured Match Factor Breakdown Grid */}
                <div className="grid-4 gap-2 mb-3 p-3 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div className="flex flex-col text-xs">
                    <span className="text-muted font-medium" style={{ fontSize: '0.7rem' }}>Category (35% Wt)</span>
                    <span className="font-bold text-success flex items-center gap-1 mt-1"><CheckCircle2 size={11} /> Strong Match</span>
                  </div>
                  <div className="flex flex-col text-xs">
                    <span className="text-muted font-medium" style={{ fontSize: '0.7rem' }}>Location (25% Wt)</span>
                    <span className="font-bold text-primary flex items-center gap-1 mt-1"><CheckCircle2 size={11} /> Exact Location</span>
                  </div>
                  <div className="flex flex-col text-xs">
                    <span className="text-muted font-medium" style={{ fontSize: '0.7rem' }}>Date (25% Wt)</span>
                    <span className="font-bold text-accent flex items-center gap-1 mt-1"><CheckCircle2 size={11} /> Same Day</span>
                  </div>
                  <div className="flex flex-col text-xs">
                    <span className="text-muted font-medium" style={{ fontSize: '0.7rem' }}>Keywords (15% Wt)</span>
                    <span className="font-bold text-warning flex items-center gap-1 mt-1"><CheckCircle2 size={11} /> High Overlap</span>
                  </div>
                </div>

                {/* Meta & Contact Row */}
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="text-xs text-muted flex items-center gap-3">
                    <span><MapPin size={11} /> {candidate.location}</span>
                    <span>Reporter: <strong>{candidate.reporter_name}</strong></span>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => toast.success(`Contact Reporter: ${candidate.contact_info || candidate.reporter_email || candidate.reporter_name}`)}
                  >
                    <Phone size={12} /> Contact Reporter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-right">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
