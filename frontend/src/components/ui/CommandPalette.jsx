import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Calendar, ShoppingBag, Building2, Plus, ArrowRight, X, Clock,
  Shield, Megaphone, User, Tag, HelpCircle, History, Sparkles, Filter
} from 'lucide-react'
import api from '../../lib/api'
import { useDebounce } from '../../hooks/useDebounce'

const CATEGORIES = [
  { id: 'all', label: 'All Results' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'events', label: 'Events' },
  { id: 'accommodation', label: 'Housing' },
  { id: 'lostFound', label: 'Lost & Found' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'users', label: 'Directory' },
]

const SUGGESTIONS = [
  'Calculus Textbook',
  'CS Workshop',
  'Hostel room near campus',
  'Lost Student Card',
  'Midterm exam schedule',
  'Gaming Laptop',
]

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 200)
  const [activeCategory, setActiveCategory] = useState('all')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])
  const [popularQueries, setPopularQueries] = useState(SUGGESTIONS)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  // Load recent searches & popular trends
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cc_recent_searches')
      if (saved) setRecentSearches(JSON.parse(saved))
    } catch {}

    api.get('/search/popular')
      .then(res => {
        if (Array.isArray(res.data?.queries) && res.data.queries.length > 0) {
          setPopularQueries(res.data.queries)
        }
      })
      .catch(() => {})
  }, [])

  // Listen for Ctrl+K or Cmd+K globally
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
        else {
          // Open parent header trigger
          const triggerBtn = document.getElementById('cmd-palette-trigger')
          if (triggerBtn) triggerBtn.click()
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSelectedIndex(0)
    } else {
      setQuery('')
      setResults(null)
      setActiveCategory('all')
    }
  }, [isOpen])

  // Execute API Search
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
      saveRecentSearch(q)
    } catch {
      setResults(null)
    } finally {
      setSearching(false)
    }
  }

  const saveRecentSearch = (term) => {
    try {
      const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5)
      setRecentSearches(updated)
      localStorage.setItem('cc_recent_searches', JSON.stringify(updated))
    } catch {}
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('cc_recent_searches')
  }

  const handleSelect = (to) => {
    onClose()
    navigate(to)
  }

  // Compile flat list of all matching result items for keyboard navigation
  const getFlatResultsList = () => {
    if (!results) return []
    const flat = []

    if ((activeCategory === 'all' || activeCategory === 'marketplace') && results.marketplace) {
      results.marketplace.forEach(p => flat.push({ ...p, type: 'marketplace', link: `/marketplace/${p.id}` }))
    }
    if ((activeCategory === 'all' || activeCategory === 'events') && results.events) {
      results.events.forEach(e => flat.push({ ...e, type: 'events', link: `/events/${e.id}` }))
    }
    if ((activeCategory === 'all' || activeCategory === 'accommodation') && results.accommodation) {
      results.accommodation.forEach(h => flat.push({ ...h, type: 'accommodation', link: `/accommodation/${h.id}` }))
    }
    if ((activeCategory === 'all' || activeCategory === 'lostFound') && results.lostFound) {
      results.lostFound.forEach(lf => flat.push({ ...lf, type: 'lostFound', link: '/lost-found' }))
    }
    if ((activeCategory === 'all' || activeCategory === 'announcements') && results.announcements) {
      results.announcements.forEach(a => flat.push({ ...a, type: 'announcements', link: '/dashboard' }))
    }
    if ((activeCategory === 'all' || activeCategory === 'users') && results.users) {
      results.users.forEach(u => flat.push({ ...u, type: 'users', link: `/profile?user=${u.id}` }))
    }

    return flat
  }

  const flatItems = getFlatResultsList()

  // Handle Keyboard Navigation (Up, Down, Enter, Esc)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % Math.max(1, flatItems.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + flatItems.length) % Math.max(1, flatItems.length))
    } else if (e.key === 'Enter') {
      if (flatItems.length > 0 && flatItems[selectedIndex]) {
        e.preventDefault()
        handleSelect(flatItems[selectedIndex].link)
      }
    }
  }

  if (!isOpen) return null

  const quickActions = [
    { label: '+ Sell an Item', icon: Plus, color: 'var(--accent)', to: '/marketplace' },
    { label: '+ Report Lost Item', icon: Search, color: 'var(--warning)', to: '/lost-found' },
    { label: 'Browse Events', icon: Calendar, color: 'var(--primary)', to: '/events' },
    { label: 'Find Accommodation', icon: Building2, color: '#3b82f6', to: '/accommodation' },
  ]

  const hasResults = flatItems.length > 0

  return (
    <div
      className="modal-overlay animate-fade"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cmd-palette-title"
      style={{ zIndex: 9999, background: 'rgba(7, 11, 20, 0.85)', backdropFilter: 'blur(10px)' }}
    >
      <div
        className="modal modal-lg glass-card"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-modal)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)',
          padding: 0,
          maxWidth: '680px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xl)'
        }}
      >
        {/* Command Search Input Header Bar */}
        <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border-strong)', background: 'var(--bg-surface)' }}>
          <Search size={22} className="text-primary" />
          <input
            ref={inputRef}
            id="cmd-palette-title"
            type="text"
            className="form-input text-sm"
            placeholder="Search CampusConnect (Marketplace, Events, Housing, Lost Items, Announcements)..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              fontSize: '1.05rem',
              boxShadow: 'none',
              fontWeight: 500
            }}
          />
          <div className="flex items-center gap-2">
            <span className="badge badge-muted text-xs hidden-mobile">Ctrl + K</span>
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close search modal">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Category Filter Chips Bar */}
        {query.trim().length > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}>
            <Filter size={14} className="text-muted mr-1" />
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setSelectedIndex(0); }}
                className={`btn btn-xs ${activeCategory === cat.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '3px 10px', fontSize: '0.75rem', borderRadius: 'var(--radius-full)' }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Search Results / Suggestions Content Scroll Area */}
        <div style={{ maxHeight: '440px', overflowY: 'auto', padding: 'var(--space-4)' }}>

          {/* IF NO QUERY: Display Recent Searches, Quick Actions & Suggestions */}
          {!query.trim() && (
            <div className="flex flex-col gap-5">

              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs text-muted font-bold uppercase mb-2">
                    <span className="flex items-center gap-1.5"><History size={13} /> RECENT SEARCHES</span>
                    <button onClick={clearRecentSearches} className="text-xs text-muted hover:text-danger" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map(term => (
                      <button
                        key={term}
                        onClick={() => setQuery(term)}
                        className="badge badge-muted text-xs flex items-center gap-1 hover:border-primary"
                        style={{ cursor: 'pointer', padding: '6px 12px' }}
                      >
                        <Clock size={12} /> {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Suggestions */}
              <div>
                <div className="text-xs text-muted font-bold uppercase mb-2 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-accent" /> POPULAR SUGGESTIONS
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularQueries.map(s => (
                    <button
                      key={s}
                      onClick={() => setQuery(s)}
                      className="badge badge-accent text-xs hover:border-accent"
                      style={{ cursor: 'pointer', padding: '6px 12px' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <div className="text-xs text-muted font-bold uppercase mb-2 flex items-center gap-1.5">
                  <Plus size={13} /> QUICK ACTIONS
                </div>
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

            </div>
          )}

          {/* IF QUERY PROVIDED: Display Filtered Results */}
          {query.trim() && (
            <div>
              {searching ? (
                <div className="flex items-center justify-center p-8 text-xs text-muted gap-2">
                  <div className="spinner spinner-sm" /> Searching CampusConnect platform...
                </div>
              ) : !hasResults ? (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <HelpCircle size={32} className="text-muted mb-1" />
                  <div className="font-bold text-sm">No results found for "{query}"</div>
                  <p className="text-xs text-muted" style={{ maxWidth: 360 }}>
                    Try adjusting your search terms or filter category to find matching items, events, or student listings.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {flatItems.map((item, idx) => {
                    const isSelected = idx === selectedIndex
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleSelect(item.link)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className="p-3 card flex items-center justify-between text-left transition-all"
                        style={{
                          background: isSelected ? 'var(--bg-level-4)' : 'var(--bg-surface)',
                          border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                          cursor: 'pointer'
                        }}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className="p-2 rounded-md" style={{ background: 'var(--bg-card)', color: 'var(--primary)' }}>
                            {item.type === 'marketplace' && <ShoppingBag size={16} />}
                            {item.type === 'events' && <Calendar size={16} />}
                            {item.type === 'accommodation' && <Building2 size={16} />}
                            {item.type === 'lostFound' && <Search size={16} />}
                            {item.type === 'announcements' && <Megaphone size={16} />}
                            {item.type === 'users' && <User size={16} />}
                          </div>
                          <div className="truncate">
                            <div className="font-bold text-xs truncate">
                              {item.title || `${item.first_name} ${item.last_name}`}
                            </div>
                            <div className="text-xs text-muted mt-0.5 truncate">
                              <span className="uppercase font-semibold text-primary">{item.type}</span> • {item.category || item.location || item.department || 'Campus item'}
                            </div>
                          </div>
                        </div>
                        <ArrowRight size={14} className={isSelected ? 'text-primary' : 'text-muted'} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
