import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Calendar, ShoppingBag, Building2, Plus, ArrowRight, X, Clock, Shield } from 'lucide-react'
import api from '../../lib/api'
import { useDebounce } from '../../hooks/useDebounce'

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 250)
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults(null)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (debouncedQuery && debouncedQuery.trim().length > 1) {
      performSearch(debouncedQuery.trim())
    } else {
      setResults(null)
    }
  }, [debouncedQuery])

  const performSearch = async (q) => {
    setSearching(true)
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(q)}`)
      setResults(res.data.results)
    } catch {
      setResults(null)
    } finally {
      setSearching(false)
    }
  }

  const handleSelect = (to) => {
    onClose()
    navigate(to)
  }

  if (!isOpen) return null

  const quickActions = [
    { label: 'Report Lost Item', icon: Search, color: 'var(--warning)', to: '/lost-found' },
    { label: 'Sell Something', icon: Plus, color: 'var(--accent)', to: '/marketplace' },
    { label: 'Browse Events', icon: Calendar, color: 'var(--primary)', to: '/events' },
    { label: 'Find Housing Accommodation', icon: Building2, color: '#3b82f6', to: '/accommodation' },
  ]

  const hasResults = results && (
    results.marketplace?.length > 0 ||
    results.events?.length > 0 ||
    results.accommodation?.length > 0 ||
    results.lostFound?.length > 0
  )

  return (
    <div
      className="modal-overlay animate-fade"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cmd-palette-title"
      style={{ zIndex: 9999, background: 'rgba(7, 11, 20, 0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="modal modal-lg"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-modal)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)',
          padding: 0,
          maxWidth: '640px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Command Search Input Bar */}
        <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border-strong)', background: 'var(--bg-surface)' }}>
          <Search size={20} className="text-primary" />
          <input
            ref={inputRef}
            id="cmd-palette-title"
            type="text"
            className="form-input text-sm"
            placeholder="Search CampusConnect (Marketplace, Events, Housing, Lost Items)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              fontSize: '1rem',
              boxShadow: 'none'
            }}
          />
          <span className="badge badge-muted text-xs hidden-mobile">ESC to close</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close command palette">
            <X size={18} />
          </button>
        </div>

        <div style={{ maxHeight: '420px', overflowY: 'auto', padding: 'var(--space-4)' }}>

          {/* If no search query: Show Quick Actions */}
          {!query.trim() && (
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-xs text-muted font-bold uppercase mb-2">QUICK ACTIONS</div>
                <div className="grid-2 gap-2">
                  {quickActions.map(({ label, icon: Icon, color, to }) => (
                    <button
                      key={label}
                      onClick={() => handleSelect(to)}
                      className="card p-3 flex items-center justify-between hover:border-primary text-left"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
                    >
                      <div className="flex items-center gap-2.5 text-xs font-bold">
                        <Icon size={16} style={{ color }} />
                        {label}
                      </div>
                      <ArrowRight size={12} className="text-muted" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted font-bold uppercase mb-2">PORTAL NAVIGATION</div>
                <div className="flex flex-col gap-1.5 text-xs">
                  <button onClick={() => handleSelect('/dashboard')} className="p-2 card flex items-center justify-between text-left" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <span>📊 Student Dashboard</span>
                    <span className="text-muted">/dashboard</span>
                  </button>
                  <button onClick={() => handleSelect('/profile')} className="p-2 card flex items-center justify-between text-left" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <span>👤 Account Settings & Profile</span>
                    <span className="text-muted">/profile</span>
                  </button>
                  <button onClick={() => handleSelect('/admin')} className="p-2 card flex items-center justify-between text-left" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <span>👑 Administrator Control Center</span>
                    <span className="text-muted">/admin</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Live Search Results */}
          {query.trim() && (
            <div>
              {searching ? (
                <div className="flex items-center justify-center p-8 text-xs text-muted gap-2">
                  <div className="spinner spinner-sm" /> Searching CampusConnect...
                </div>
              ) : !hasResults ? (
                <div className="p-8 text-center text-xs text-muted">
                  No matching results found for "{query}". Try searching for textbooks, events, or hostels.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {results.marketplace?.length > 0 && (
                    <div>
                      <div className="text-xs text-muted font-bold uppercase mb-2 flex items-center gap-1">
                        <ShoppingBag size={12} /> MARKETPLACE LISTINGS ({results.marketplace.length})
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {results.marketplace.slice(0, 3).map(p => (
                          <button key={p.id} onClick={() => handleSelect(`/marketplace/${p.id}`)} className="p-2.5 card flex items-center justify-between text-left hover:border-primary" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                            <div className="truncate">
                              <div className="font-bold text-xs truncate">{p.title}</div>
                              <div className="text-xs text-muted mt-0.5">{p.category} • Rs. {Number(p.price).toLocaleString()}</div>
                            </div>
                            <ArrowRight size={14} className="text-muted flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.events?.length > 0 && (
                    <div>
                      <div className="text-xs text-muted font-bold uppercase mb-2 flex items-center gap-1">
                        <Calendar size={12} /> CAMPUS EVENTS ({results.events.length})
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {results.events.slice(0, 3).map(e => (
                          <button key={e.id} onClick={() => handleSelect(`/events/${e.id}`)} className="p-2.5 card flex items-center justify-between text-left hover:border-primary" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                            <div className="truncate">
                              <div className="font-bold text-xs truncate">{e.title}</div>
                              <div className="text-xs text-muted mt-0.5">{e.category} • {e.location}</div>
                            </div>
                            <ArrowRight size={14} className="text-muted flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.accommodation?.length > 0 && (
                    <div>
                      <div className="text-xs text-muted font-bold uppercase mb-2 flex items-center gap-1">
                        <Building2 size={12} /> HOSTELS & HOUSING ({results.accommodation.length})
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {results.accommodation.slice(0, 3).map(h => (
                          <button key={h.id} onClick={() => handleSelect(`/accommodation/${h.id}`)} className="p-2.5 card flex items-center justify-between text-left hover:border-primary" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                            <div className="truncate">
                              <div className="font-bold text-xs truncate">{h.title}</div>
                              <div className="text-xs text-muted mt-0.5">Rs. {Number(h.price).toLocaleString()}/mo • {h.location}</div>
                            </div>
                            <ArrowRight size={14} className="text-muted flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
